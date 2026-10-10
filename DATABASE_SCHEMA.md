# SafeWay: Database Schema

> **Version:** 1.0 · **Date:** 2026-10-10 · **Status:** Final for the 6-hour MVP
> **Team:** Minions · **Depends on:** [PRD.md](PRD.md) (requirements) and `context.md` (full context)
> **Authority:** This file is authoritative for table, column, enum, RLS and trigger definitions. Where it differs from `context.md` Section 9, this file wins (differences are listed in Section 2).
> **Tags:** `[MVP]` built now · `[Post-MVP]` one-line mention only · `[Mock]` simulated and labelled.
> **Scope note:** Only the 16 MVP tables exist. Everything unused is removed (see Section 12).

---

## 1. How to use this file

- Each SQL block below is one migration file in `supabase/migrations/`, in the order shown. Never edit the live schema by hand.
- Run all migrations as the `postgres` role (Supabase SQL editor or CLI).
- **Writes with business rules go through FastAPI using the service-role key.** The browser (Supabase client) only gets the reads and the few direct writes listed in Section 9.
- Backend-only functions are callable by `service_role` only.
- After running migrations, run the RLS test checklist in Section 10 with **two real user accounts** (the service-role key bypasses RLS and proves nothing).

| Migration file | Contents |
|---|---|
| `0001_extensions_enums.sql` | Extensions, enums |
| `0002_helpers.sql` | Role helpers, generic triggers |
| `0003_tables.sql` | 16 tables |
| `0004_indexes.sql` | Indexes |
| `0005_triggers.sql` | Validation and guard triggers |
| `0006_audit_ledger.sql` | Append-only protection, `append_audit_entry`, `verify_audit_chain` |
| `0007_rls_grants.sql` | Privileges, RLS, policies |
| `0008_storage_realtime.sql` | `report-media` bucket, Realtime publication |
| `0009_cron.sql` | Inactivity sweep schedule, daily purge |

---

## 2. Schema decisions (additions and differences vs `context.md`)

| # | Decision | Why |
|---|---|---|
| S1 | `is_sample boolean` on `hazard_zones`, `services`, `price_baselines`, `incidents` | Lets the UI label seeded rows "sample data" (acceptance criterion 5) |
| S2 | `profiles.quiet_hours_enabled boolean default false` | F11: quiet hours exist, off by default |
| S3 | `trips.reduced_fallback_ack_at` | F1: records the one-contact acknowledgement |
| S4 | A DB trigger enforces the trip-start rule (0 contacts blocked; 1 contact needs the acknowledgement) | F1 enforced below the API, not only in it |
| S5 | `emergency_contacts.consent_at` is `NOT NULL default now()`. Clients cannot send it (column grants). Changing the phone number resets it | A contact row cannot exist without consent; consent cannot be back-dated |
| S6 | `inactivity_alerts` unique key is **`(trip_id, window, heartbeat_at)`**, not `(trip_id, window)`. `heartbeat_at` is the trip's `last_heartbeat_at` when the alert fired | With `(trip_id, window)` a second inactive period in the same trip would never alert. This keeps "fires once per window" per inactivity period. **PRD FR-22 should be read with this key** |
| S7 | `inactivity_alerts.window` is an enum of logical names `nudge`, `contact_sms` | R5 in the PRD |
| S8 | `incident_events.is_internal boolean default false` | Staff notes can be hidden from the tourist timeline |
| S9 | `notifications.subject_user_id` and `notifications.provider` | `subject_user_id` = the tourist an SMS is about (needed for the per-user daily SMS cap, since contacts are not users). `provider` = `mock` or `msg91`, so the outbox can label "Mock SMS" |
| S10 | `safety_alerts` gains `rule`, `data_quality`, `suggested_action`, `zone_id` | FR-29 requires each advisory to store rule, source, timestamp, data quality, suggested action. The geofence state (`INSIDE`/`OUTSIDE`) per tourist and zone is derived from the latest geofence alert for that zone, so no extra table is needed |
| S11 | `reports.client_id`, `reports.verified_at` | Idempotent submission; verification time |
| S12 | Extra enums: `hazard_type`, `report_type`, `inactivity_window`, `inactivity_status`, `identity_status` | Type safety; `context.md` listed the values in prose only |
| S13 | `audit_ledger.action` is restricted by a CHECK to a fixed list | Keeps free text (and so personal data) out of the ledger |
| S14 | DB trigger validates incident status transitions | Defence in depth; clients cannot write incidents anyway |
| S15 | `public_id_revoked_at` means "revoked with no replacement". Regenerating sets a new `public_id` and clears it | Defines "revoke" vs "regenerate" |
| S16 | Emergency contacts are written directly by the tourist's Supabase client under RLS (no FastAPI endpoint) | They carry no business rule beyond DB constraints |
| S17 | Staff (`rescue`, `admin`) read tourist profile, contacts, trip and location data through FastAPI (service role), not through RLS | Keeps "rescue cannot read unrelated tourist records" enforceable in one place |

---

## 3. Migration 0001: extensions and enums

```sql
-- 0001_extensions_enums.sql
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_cron;   -- if this errors, enable it in Dashboard > Database > Extensions
create extension if not exists pg_net;    -- same note

create type public.incident_status as enum
  ('submitted','acknowledged','assigned','in_progress','resolved','closed','cancelled','duplicate');

-- Locked (F3). Do not add or rename values.
create type public.incident_category as enum
  ('medical','accident','lost_stranded','personal_safety','other');

create type public.severity as enum ('low','medium','high','critical');
create type public.trip_status as enum ('planned','active','completed','cancelled');
create type public.advisory_level as enum ('info','caution','warning','critical','unknown');

create type public.service_kind as enum ('guide','taxi','hotel','operator');
create type public.service_status as enum ('pending','verified','rejected');

create type public.report_status as enum ('submitted','verified','rejected');
create type public.report_type as enum
  ('accident','landslide','flood','roadblock','scam','harassment');

create type public.hazard_source as enum ('authority','crowd','feed','seed');
create type public.hazard_type as enum
  ('landslide','flood','road_closure','road_repair','wildlife','low_network','restricted');

create type public.identity_provider as enum
  ('mock','offline_xml','partner_sandbox','passport_manual');
create type public.identity_status as enum ('pending','verified','rejected');

create type public.notification_channel as enum ('in_app','sms');
create type public.notification_status as enum ('pending','sent','failed');

create type public.inactivity_window as enum ('nudge','contact_sms');
create type public.inactivity_status as enum ('fired','cancelled');
```

Client-only UI states (`draft`, `pending`, `failed`, `manually_sent`) are **not** database enums.

---

## 4. Migration 0002: helpers

The role comes from the JWT `app_metadata` (set server-side only). A missing role means `tourist`. A role change takes effect when the user's token is refreshed (re-login).

```sql
-- 0002_helpers.sql
create or replace function public.app_role() returns text
language sql stable as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', 'tourist')
$$;

create or replace function public.is_staff() returns boolean
language sql stable as $$ select public.app_role() in ('rescue','admin') $$;

create or replace function public.is_admin() returns boolean
language sql stable as $$ select public.app_role() = 'admin' $$;

grant execute on function public.app_role(), public.is_staff(), public.is_admin() to authenticated;

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- Generic guard used on append-only tables.
create or replace function public.block_mutation() returns trigger
language plpgsql as $$
begin
  raise exception '% is append-only: % is not allowed', tg_table_name, tg_op
    using errcode = 'insufficient_privilege';
end $$;

-- Create a profile for every new auth user.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end $$;
```

The `auth.users` trigger that calls `handle_new_user` is created in migration 0005 (after `profiles` exists).

---

## 5. Migration 0003: tables

All tables have RLS enabled in migration 0007. Foreign keys cascade only where data should disappear with the user; incident history is retained (`restrict`).

```sql
-- 0003_tables.sql

-- Sequences used as column defaults must exist before the tables that use them.
create sequence public.audit_ledger_id_seq;

create table public.profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  full_name             text not null default '',
  phone                 text check (phone is null or phone ~ '^\+[1-9][0-9]{7,14}$'),
  language              text not null default 'en',
  public_id             text not null unique default replace(gen_random_uuid()::text, '-', ''),
  public_id_revoked_at  timestamptz,
  location_consent_at   timestamptz,
  quiet_hours_enabled   boolean not null default false,          -- F11 (S2)
  created_at            timestamptz not null default now()
);
-- No role column: role lives in JWT app_metadata. No Aadhaar/passport numbers. No medical notes.

create table public.emergency_contacts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  name          text not null check (length(trim(name)) between 1 and 100),
  relationship  text not null check (length(trim(relationship)) between 1 and 50),
  phone         text not null check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  priority      smallint not null check (priority in (1,2)),
  consent_at    timestamptz not null default now(),               -- F1, S5
  created_at    timestamptz not null default now(),
  unique (user_id, priority)                                      -- with the CHECK = max 2 per user
);

create table public.trips (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references public.profiles(id) on delete cascade,
  destination              text not null,
  start_at                 timestamptz not null,
  end_at                   timestamptz,
  status                   public.trip_status not null default 'planned',
  route_geojson            jsonb,
  reduced_fallback_ack_at  timestamptz,                           -- F1, S3
  last_heartbeat_at        timestamptz,
  created_at               timestamptz not null default now(),
  check (end_at is null or end_at >= start_at)
);

create sequence public.incident_reference_seq;

create table public.incidents (
  id                    uuid primary key default gen_random_uuid(),
  reference             text not null unique
                          default ('SW-' || lpad(nextval('public.incident_reference_seq')::text, 6, '0')),
  reporter_id           uuid not null references public.profiles(id) on delete restrict,
  trip_id               uuid references public.trips(id) on delete set null,
  category              public.incident_category not null,
  severity              public.severity not null default 'high',
  status                public.incident_status not null default 'submitted',
  description           text check (description is null or length(description) <= 2000),
  lat                   double precision check (lat between -90 and 90),
  lng                   double precision check (lng between -180 and 180),
  accuracy_m            real check (accuracy_m is null or accuracy_m >= 0),
  location_recorded_at  timestamptz,
  assigned_to           uuid references public.profiles(id) on delete set null,
  client_id             uuid not null,                            -- idempotency key
  resolution_notes      text check (resolution_notes is null or length(resolution_notes) <= 2000),
  is_sample             boolean not null default false,           -- S1
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (reporter_id, client_id),
  check ((lat is null) = (lng is null))                           -- GPS optional, but both or neither
);

create table public.incident_events (
  id           uuid primary key default gen_random_uuid(),
  incident_id  uuid not null references public.incidents(id) on delete restrict,
  actor_id     uuid,                                              -- no FK: append-only table
  event_type   text not null,                                     -- e.g. submitted, acknowledged, assigned, status_changed, en_route, on_site, note, cancelled
  details      jsonb not null default '{}'::jsonb,
  is_internal  boolean not null default false,                    -- S8
  created_at   timestamptz not null default now()
);

create table public.hazard_zones (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  type         public.hazard_type not null,
  severity     public.severity not null,
  center_lat   double precision not null check (center_lat between -90 and 90),
  center_lng   double precision not null check (center_lng between -180 and 180),
  radius_m     integer not null check (radius_m > 0),
  source       public.hazard_source not null,
  active       boolean not null default true,
  starts_at    timestamptz,
  expires_at   timestamptz,
  reason       text,
  created_by   uuid references public.profiles(id) on delete set null,
  is_sample    boolean not null default false,                    -- S1
  created_at   timestamptz not null default now(),
  check (expires_at is null or starts_at is null or expires_at > starts_at)
);

create table public.location_updates (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  trip_id      uuid references public.trips(id) on delete cascade,
  lat          double precision not null check (lat between -90 and 90),
  lng          double precision not null check (lng between -180 and 180),
  accuracy_m   real check (accuracy_m is null or accuracy_m >= 0),
  speed        real check (speed is null or speed >= 0),
  recorded_at  timestamptz not null,                              -- device time wins
  received_at  timestamptz not null default now(),
  client_id    uuid not null,
  unique (user_id, client_id)
);

create table public.safety_alerts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  trip_id          uuid references public.trips(id) on delete set null,
  zone_id          uuid references public.hazard_zones(id) on delete set null,   -- S10
  level            public.advisory_level not null,
  type             text not null,                                 -- e.g. geofence_enter, geofence_exit, weather, stale_location
  message          text not null,
  rule             text not null,                                 -- S10: rule id that produced it
  source           text not null,
  reason           text,
  data_quality     text not null default 'good'
                     check (data_quality in ('good','partial','stale','missing')),
  suggested_action text,
  data_timestamp   timestamptz not null,
  created_at       timestamptz not null default now(),
  read_at          timestamptz
);

create table public.notifications (
  id                  uuid primary key default gen_random_uuid(),
  event_id            text not null unique,                       -- stable id, prevents duplicates
  recipient_user_id   uuid references public.profiles(id) on delete cascade,
  recipient_phone     text check (recipient_phone is null or recipient_phone ~ '^\+[1-9][0-9]{7,14}$'),
  subject_user_id     uuid references public.profiles(id) on delete cascade,     -- S9: tourist the SMS is about
  channel             public.notification_channel not null,
  provider            text check (provider is null or provider in ('mock','msg91')),  -- S9
  type                text not null,                              -- e.g. sos_contact_sms, inactivity_nudge, inactivity_contact_sms, incident_update
  payload             jsonb not null default '{}'::jsonb,
  status              public.notification_status not null default 'pending',
  attempts            smallint not null default 0,
  last_error          text,
  created_at          timestamptz not null default now(),
  sent_at             timestamptz,
  check (recipient_user_id is not null or recipient_phone is not null),
  check (channel <> 'sms' or recipient_phone is not null)
);

create table public.audit_ledger (
  id           bigint primary key default nextval('public.audit_ledger_id_seq'),
  prev_hash    text not null,
  entry_hash   text not null unique,
  actor_id     uuid,                                              -- no FK, no personal data
  action       text not null,
  entity_type  text not null,
  entity_id    text,
  created_at   timestamptz not null,
  constraint audit_action_allowed check (action in (
    'sos_submitted','incident_acknowledged','incident_assigned','incident_status_changed',
    'incident_cancelled','role_changed','zone_activated','zone_deactivated',
    'service_verified','service_rejected','report_verified','report_rejected','id_revoked'
  ))                                                              -- S13
);

create table public.idempotency_keys (
  key           uuid not null,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  endpoint      text not null,
  response_ref  text,
  created_at    timestamptz not null default now(),
  primary key (user_id, key)
);

create table public.services (
  id           uuid primary key default gen_random_uuid(),
  kind         public.service_kind not null,
  name         text not null,
  owner_id     uuid references public.profiles(id) on delete set null,   -- seeded guide must have this set
  status       public.service_status not null default 'pending',
  contact      text,
  area         text,
  verified_by  uuid references public.profiles(id) on delete set null,
  verified_at  timestamptz,
  is_sample    boolean not null default false,                    -- S1
  created_at   timestamptz not null default now()
);

create table public.price_baselines (
  id             uuid primary key default gen_random_uuid(),
  kind           public.service_kind not null,
  route_or_item  text not null,
  min_price      integer not null check (min_price >= 0),         -- INR
  max_price      integer not null check (max_price >= min_price),
  source         text not null,                                   -- citation, or 'sample data'
  is_sample      boolean not null default false,                  -- S1
  updated_at     timestamptz not null default now(),
  unique (kind, route_or_item)
);

create table public.reports (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  type         public.report_type not null,
  description  text check (description is null or length(description) <= 1000),
  lat          double precision not null check (lat between -90 and 90),
  lng          double precision not null check (lng between -180 and 180),
  media_path   text,
  status       public.report_status not null default 'submitted',
  verified_by  uuid references public.profiles(id) on delete set null,
  verified_at  timestamptz,                                       -- S11
  client_id    uuid not null,                                     -- S11
  created_at   timestamptz not null default now(),
  unique (user_id, client_id)
);

create table public.inactivity_alerts (
  id            uuid primary key default gen_random_uuid(),
  trip_id       uuid not null references public.trips(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  "window"      public.inactivity_window not null,                -- 'nudge' (3h) / 'contact_sms' (4h); demo windows reuse these names
  heartbeat_at  timestamptz not null,                             -- trips.last_heartbeat_at when fired (S6)
  fired_at      timestamptz not null default now(),
  status        public.inactivity_status not null default 'fired',
  cancelled_at  timestamptz,
  unique (trip_id, "window", heartbeat_at)                        -- S6
);

create table public.identity_verifications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  provider      public.identity_provider not null,
  status        public.identity_status not null default 'pending',
  reference_id  text,                                             -- provider reference, never an Aadhaar number
  verified_at   timestamptz,
  created_at    timestamptz not null default now()
);
```

---

## 6. Migration 0004: indexes

```sql
-- 0004_indexes.sql
create unique index trips_one_active_per_user on public.trips (user_id) where status = 'active';
create index trips_user_status_idx          on public.trips (user_id, status);
create index trips_active_heartbeat_idx     on public.trips (last_heartbeat_at) where status = 'active';

create index contacts_user_idx              on public.emergency_contacts (user_id);

create index incidents_status_created_idx   on public.incidents (status, created_at desc);
create index incidents_reporter_idx         on public.incidents (reporter_id, created_at desc);
create index incidents_assigned_idx         on public.incidents (assigned_to) where assigned_to is not null;
create index incident_events_incident_idx   on public.incident_events (incident_id, created_at);

create index hazard_zones_active_idx        on public.hazard_zones (active, type);
create index location_user_recorded_idx     on public.location_updates (user_id, recorded_at desc);
create index location_received_idx          on public.location_updates (received_at);   -- purge job

create index alerts_user_created_idx        on public.safety_alerts (user_id, created_at desc);
create index alerts_geofence_state_idx      on public.safety_alerts (user_id, zone_id, created_at desc);  -- latest state per zone

create index notif_recipient_idx            on public.notifications (recipient_user_id, created_at desc);
create index notif_sms_cap_idx              on public.notifications (subject_user_id, channel, created_at);
create index notif_pending_idx              on public.notifications (status) where status = 'pending';

create index audit_created_idx              on public.audit_ledger (created_at);
create index idem_created_idx               on public.idempotency_keys (created_at);

create index services_status_kind_idx       on public.services (status, kind);
create index services_owner_idx             on public.services (owner_id) where owner_id is not null;

create index reports_status_created_idx     on public.reports (status, created_at desc);
create index inactivity_trip_idx            on public.inactivity_alerts (trip_id);
create index identity_user_idx              on public.identity_verifications (user_id);
```

---

## 7. Migration 0005: triggers

```sql
-- 0005_triggers.sql

-- Profile for every new auth user
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at
create trigger incidents_set_updated_at
  before update on public.incidents
  for each row execute function public.set_updated_at();
create trigger price_baselines_set_updated_at
  before update on public.price_baselines
  for each row execute function public.set_updated_at();
-- price_baselines needs an updated_at column: already defined in 0003.
-- incidents.updated_at: already defined in 0003.

-- Changing a contact's phone resets consent: the new person must consent again (S5)
create or replace function public.contacts_reset_consent() returns trigger
language plpgsql as $$
begin
  if new.phone is distinct from old.phone then
    new.consent_at := now();
  end if;
  return new;
end $$;
create trigger contacts_phone_change_resets_consent
  before update on public.emergency_contacts
  for each row execute function public.contacts_reset_consent();

-- Trip start rule (F1, S4): 0 contacts blocked; 1 contact needs the acknowledgement.
-- Also (re)starts the heartbeat clock when a trip becomes active.
create or replace function public.trips_guard_start() returns trigger
language plpgsql as $$
declare v_contacts int;
begin
  if new.status = 'active' and (tg_op = 'INSERT' or old.status is distinct from 'active') then
    select count(*) into v_contacts
      from public.emergency_contacts
      where user_id = new.user_id and consent_at is not null;
    if v_contacts = 0 then
      raise exception 'trip cannot start without an emergency contact'
        using errcode = 'check_violation';
    end if;
    if v_contacts = 1 and new.reduced_fallback_ack_at is null then
      raise exception 'trip with one emergency contact requires the reduced-fallback acknowledgement'
        using errcode = 'check_violation';
    end if;
    new.last_heartbeat_at := now();
  end if;
  return new;
end $$;
create trigger trips_guard_start_trg
  before insert or update on public.trips
  for each row execute function public.trips_guard_start();

-- Incident status transitions (S14). Reassignment keeps the same status and is not checked here.
-- Who may perform a transition (reporter / rescue / admin) is enforced in FastAPI.
create or replace function public.incidents_validate_transition() returns trigger
language plpgsql as $$
begin
  if new.status is distinct from old.status then
    if not (
         (old.status = 'submitted'    and new.status in ('acknowledged','cancelled','duplicate'))
      or (old.status = 'acknowledged' and new.status in ('assigned','cancelled','duplicate'))
      or (old.status = 'assigned'     and new.status in ('in_progress','cancelled','duplicate'))
      or (old.status = 'in_progress'  and new.status = 'resolved')
      or (old.status = 'resolved'     and new.status = 'closed')
    ) then
      raise exception 'invalid incident transition: % -> %', old.status, new.status
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end $$;
create trigger incidents_validate_transition_trg
  before update on public.incidents
  for each row execute function public.incidents_validate_transition();

-- Append-only incident timeline
create trigger incident_events_no_update
  before update or delete on public.incident_events
  for each row execute function public.block_mutation();
create trigger incident_events_no_truncate
  before truncate on public.incident_events
  for each statement execute function public.block_mutation();
```

`closed`, `cancelled` and `duplicate` are terminal: no transition leaves them.

---

## 8. Migration 0006: audit ledger

Hash-chained, append-only. **Tamper-evident, not tamper-proof:** anyone controlling the database could rebuild the whole chain, and truncating the newest entries is not detectable until the post-MVP daily head-hash checkpoint exists.

```sql
-- 0006_audit_ledger.sql

-- Append-only: block UPDATE, DELETE and TRUNCATE
create trigger audit_ledger_no_update
  before update or delete on public.audit_ledger
  for each row execute function public.block_mutation();
create trigger audit_ledger_no_truncate
  before truncate on public.audit_ledger
  for each statement execute function public.block_mutation();

-- Single hash definition, used by both append and verify.
create or replace function public.audit_compute_hash(
  p_prev text, p_id bigint, p_actor uuid, p_action text,
  p_entity_type text, p_entity_id text, p_created timestamptz
) returns text
language sql immutable set search_path = public, extensions as $$
  select encode(
    extensions.digest(
      concat_ws('|',
        p_prev,
        p_id::text,
        coalesce(p_actor::text, ''),
        p_action,
        p_entity_type,
        coalesce(p_entity_id, ''),
        to_char(p_created at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
      ),
      'sha256'),
    'hex')
$$;

-- The only way to write the ledger. The advisory lock serialises writers so the chain cannot fork.
-- Pass ids and fixed action names only. Never pass personal data.
create or replace function public.append_audit_entry(
  p_actor uuid, p_action text, p_entity_type text, p_entity_id text
) returns bigint
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_prev text;
  v_id   bigint;
  v_now  timestamptz;
  v_hash text;
begin
  perform pg_advisory_xact_lock(hashtextextended('safeway.audit_ledger', 0));

  select entry_hash into v_prev from public.audit_ledger order by id desc limit 1;
  v_prev := coalesce(v_prev, repeat('0', 64));          -- genesis

  v_id   := nextval('public.audit_ledger_id_seq');
  v_now  := clock_timestamp();
  v_hash := public.audit_compute_hash(v_prev, v_id, p_actor, p_action, p_entity_type, p_entity_id, v_now);

  insert into public.audit_ledger
    (id, prev_hash, entry_hash, actor_id, action, entity_type, entity_id, created_at)
  values
    (v_id, v_prev, v_hash, p_actor, p_action, p_entity_type, p_entity_id, v_now);

  return v_id;
end $$;

-- Walks the chain in id order. Gaps in id are allowed (rolled-back transactions);
-- linkage is checked through prev_hash, not id continuity.
create or replace function public.verify_audit_chain()
returns table (ok boolean, entries_checked bigint, first_bad_id bigint, reason text)
language plpgsql security definer set search_path = public, extensions as $$
declare
  r      record;
  v_prev text := repeat('0', 64);
  v_n    bigint := 0;
begin
  for r in select * from public.audit_ledger order by id loop
    v_n := v_n + 1;
    if r.prev_hash <> v_prev then
      return query select false, v_n, r.id, 'prev_hash does not match the previous entry'::text;
      return;
    end if;
    if r.entry_hash <> public.audit_compute_hash(
         r.prev_hash, r.id, r.actor_id, r.action, r.entity_type, r.entity_id, r.created_at) then
      return query select false, v_n, r.id, 'entry_hash does not match the entry contents'::text;
      return;
    end if;
    v_prev := r.entry_hash;
  end loop;
  return query select true, v_n, null::bigint, null::text;
end $$;

-- Backend only
revoke all on function public.append_audit_entry(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.verify_audit_chain() from public, anon, authenticated;
grant execute on function public.append_audit_entry(uuid, text, text, text) to service_role;
grant execute on function public.verify_audit_chain() to service_role;
```

**Transactional pattern for incident transitions (FastAPI, one DB transaction):** lock the incident row, check the current state and the actor's permission, update `incidents`, insert `incident_events`, insert the `notifications` row, then call `append_audit_entry`. If any step fails, nothing is applied.

**Tamper demo (optional, run as `postgres` in the SQL editor, never in production):**

```sql
alter table public.audit_ledger disable trigger audit_ledger_no_update;
update public.audit_ledger set action = 'sos_submitted' where id = (select min(id) from public.audit_ledger);
alter table public.audit_ledger enable trigger audit_ledger_no_update;
-- /verify must now report ok = false.
```

Rebuild the demo database from seed afterwards; do not try to repair the chain by hand.

---

## 9. Migration 0007: privileges and RLS

Default posture: **deny everything, then grant exactly what each role needs.** Browser reads go through RLS; rule-bearing writes go through FastAPI with the service-role key (which bypasses RLS, so FastAPI must check authorization itself).

```sql
-- 0007_rls_grants.sql

-- 1) Privileges: start from nothing for anon and authenticated
revoke all on all tables in schema public from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
-- anon gets nothing: the public QR page is served by FastAPI.

grant select on
  public.profiles, public.emergency_contacts, public.trips, public.incidents,
  public.incident_events, public.hazard_zones, public.location_updates,
  public.safety_alerts, public.notifications, public.audit_ledger,
  public.services, public.price_baselines, public.reports,
  public.inactivity_alerts, public.identity_verifications
to authenticated;

-- Direct browser writes (column-limited)
grant update (full_name, phone, language, location_consent_at, quiet_hours_enabled)
  on public.profiles to authenticated;
grant insert (user_id, name, relationship, phone, priority) on public.emergency_contacts to authenticated;
grant update (name, relationship, phone, priority)          on public.emergency_contacts to authenticated;
grant delete on public.emergency_contacts to authenticated;
grant update (read_at) on public.safety_alerts to authenticated;
grant update (name, contact, area) on public.services to authenticated;   -- guide edits own row; status/owner/kind untouchable

-- Backend (service_role) keeps full access except where append-only must hold
revoke insert, update, delete, truncate on public.audit_ledger from service_role;
grant select on public.audit_ledger to service_role;

-- 2) Enable RLS everywhere
alter table public.profiles               enable row level security;
alter table public.emergency_contacts     enable row level security;
alter table public.trips                  enable row level security;
alter table public.incidents              enable row level security;
alter table public.incident_events        enable row level security;
alter table public.hazard_zones           enable row level security;
alter table public.location_updates       enable row level security;
alter table public.safety_alerts          enable row level security;
alter table public.notifications          enable row level security;
alter table public.audit_ledger           enable row level security;
alter table public.idempotency_keys       enable row level security;   -- no policies: service role only
alter table public.services               enable row level security;
alter table public.price_baselines        enable row level security;
alter table public.reports                enable row level security;
alter table public.inactivity_alerts      enable row level security;
alter table public.identity_verifications enable row level security;

-- 3) Policies (all "to authenticated"; no write policy = no direct write)

-- profiles: own row only
create policy profiles_select_own on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- emergency_contacts: own rows, full CRUD (constraints enforce max 2, phone format, consent)
create policy contacts_select_own on public.emergency_contacts for select to authenticated
  using (user_id = (select auth.uid()));
create policy contacts_insert_own on public.emergency_contacts for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy contacts_update_own on public.emergency_contacts for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy contacts_delete_own on public.emergency_contacts for delete to authenticated
  using (user_id = (select auth.uid()));

-- trips: read own (writes via FastAPI)
create policy trips_select_own on public.trips for select to authenticated
  using (user_id = (select auth.uid()));

-- incidents: reporter or staff read (writes via FastAPI)
create policy incidents_select on public.incidents for select to authenticated
  using (reporter_id = (select auth.uid()) or public.is_staff());

-- incident_events: staff see all; reporter sees non-internal events of own incidents
create policy incident_events_select_staff on public.incident_events for select to authenticated
  using (public.is_staff());
create policy incident_events_select_reporter on public.incident_events for select to authenticated
  using (
    not is_internal
    and exists (select 1 from public.incidents i
                where i.id = incident_id and i.reporter_id = (select auth.uid()))
  );

-- hazard_zones: any signed-in user reads active zones; admin/staff read all (writes via FastAPI, admin only)
create policy zones_select on public.hazard_zones for select to authenticated
  using (active or public.is_staff());

-- location_updates: own only (staff read via FastAPI)
create policy location_select_own on public.location_updates for select to authenticated
  using (user_id = (select auth.uid()));

-- safety_alerts: own; may mark own as read
create policy alerts_select_own on public.safety_alerts for select to authenticated
  using (user_id = (select auth.uid()));
create policy alerts_update_own on public.safety_alerts for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- notifications: recipient reads own in-app rows; admin reads all (the SMS outbox)
create policy notifications_select on public.notifications for select to authenticated
  using (recipient_user_id = (select auth.uid()) or public.is_admin());

-- audit_ledger: admin read only
create policy audit_select_admin on public.audit_ledger for select to authenticated
  using (public.is_admin());

-- services: verified rows for everyone; own row (any status) for its owner; all for admin.
-- Guide update: own row, role guide only, columns limited by the grant above.
create policy services_select on public.services for select to authenticated
  using (status = 'verified' or owner_id = (select auth.uid()) or public.is_admin());
create policy services_update_guide_own on public.services for update to authenticated
  using (owner_id = (select auth.uid()) and public.app_role() = 'guide')
  with check (owner_id = (select auth.uid()) and public.app_role() = 'guide');

-- price_baselines: read for all signed-in users
create policy price_select on public.price_baselines for select to authenticated
  using (true);

-- reports: own; admin reads all (writes via FastAPI)
create policy reports_select on public.reports for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

-- inactivity_alerts: own; admin
create policy inactivity_select on public.inactivity_alerts for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

-- identity_verifications: own; admin (writes via FastAPI)
create policy identity_select on public.identity_verifications for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
```

### 9.1 Access matrix (RLS layer)

| Table | tourist | guide | rescue | admin | Writes |
|---|---|---|---|---|---|
| `profiles` | own: read, update listed columns | same | own | own | direct (own, limited columns) |
| `emergency_contacts` | own CRUD | own CRUD | none | none | direct (own) |
| `trips` | own read | own read | none | none | FastAPI |
| `incidents` | own read | own read | read all | read all | FastAPI |
| `incident_events` | own incidents, non-internal | same | read all | read all | FastAPI |
| `hazard_zones` | active | active | all | all | FastAPI (admin) |
| `location_updates` | own read | own read | none | none | FastAPI |
| `safety_alerts` | own read, set `read_at` | same | none | none | FastAPI |
| `notifications` | own in-app rows | same | own in-app rows | all (outbox) | FastAPI |
| `audit_ledger` | none | none | none | read | `append_audit_entry` only |
| `idempotency_keys` | none | none | none | none | FastAPI |
| `services` | verified | verified + own row; update `name`, `contact`, `area` on own row | verified | all | FastAPI (admin approves); guide direct (own row) |
| `price_baselines` | read | read | read | read | seed / admin |
| `reports` | own read | own read | none | all | FastAPI |
| `inactivity_alerts` | own read | own read | none | all | FastAPI (sweep) |
| `identity_verifications` | own read | own read | none | all | FastAPI |

Staff access to tourist profile, contacts, trip and location detail during an incident is served by FastAPI (S17), which returns only the fields permitted for that incident.

---

## 10. RLS and constraint test checklist (run after migrations; two real accounts)

1. Tourist B cannot select Tourist A's `trips`, `incidents`, `location_updates`, `reports`, `emergency_contacts`.
2. A tourist cannot insert, update or delete `incidents`, `trips`, `hazard_zones`, `notifications`, `audit_ledger` (all rejected).
3. A tourist cannot update `profiles` columns outside the grant, and cannot see any role column (none exists).
4. A tourist cannot set `consent_at` on a contact (column not granted); inserting a third contact fails (unique `(user_id, priority)` plus CHECK); a bad phone format fails.
5. Trip start: `active` with 0 contacts fails; with 1 contact and no `reduced_fallback_ack_at` fails; with 1 contact and the acknowledgement succeeds; with 2 contacts succeeds. A second active trip for the same user fails.
6. Guide (own `services` row): can update `name`, `contact`, `area`; cannot update `status`, `owner_id`, `kind`, `verified_by`; cannot update another row. Tourist cannot update any `services` row. Test with a direct Supabase client call (there is no guide UI).
7. `incident_category` rejects any value outside the five locked categories.
8. Invalid incident transitions fail (e.g. `submitted → resolved`, anything out of `closed`).
9. `incident_events` and `audit_ledger` reject UPDATE and DELETE even from `postgres`.
10. `append_audit_entry` and `verify_audit_chain` are rejected for `authenticated` and `anon`; `verify_audit_chain()` returns `ok = true` on a clean chain, and `ok = false` after the tamper demo in Section 8.
11. A tourist sees only `verified` services; an admin sees all.
12. A tourist does not see SMS rows in `notifications`; an admin does.
13. Inserting the same `(reporter_id, client_id)` incident twice fails (idempotency backstop).

---

## 11. Migrations 0008 and 0009

```sql
-- 0008_storage_realtime.sql

-- Private bucket for optional report photos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('report-media', 'report-media', false, 5242880,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- Files live under <user_id>/<filename>; never trust the filename.
create policy report_media_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'report-media'
              and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy report_media_select on storage.objects for select to authenticated
  using (bucket_id = 'report-media'
         and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_admin()));

-- Realtime pushes persisted changes; RLS still applies to what each client receives.
alter publication supabase_realtime add table
  public.incidents, public.incident_events, public.safety_alerts, public.notifications;
```

```sql
-- 0009_cron.sql
-- Store the secret in Supabase Vault (name: cron_secret), never in this file or the repo.
-- Replace <BACKEND_URL> with the Render URL when deploying. Header name is X-Cron-Secret.

-- Inactivity sweep every 5 minutes (the only scheduler; cron-job.org is the backup caller)
select cron.schedule(
  'safeway-inactivity-sweep',
  '*/5 * * * *',
  $$
  select net.http_post(
    url     := '<BACKEND_URL>/internal/jobs/inactivity-sweep',
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'X-Cron-Secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')),
    body    := '{}'::jsonb
  );
  $$
);

-- Daily retention purge, plain SQL (not an app scheduler). 21:30 UTC = 03:00 IST.
select cron.schedule(
  'safeway-daily-purge',
  '30 21 * * *',
  $$
  delete from public.location_updates where received_at < now() - interval '7 days';
  delete from public.idempotency_keys where created_at < now() - interval '7 days';
  $$
);
```

---

## 12. Retention, backup and removed items

| Item | Rule |
|---|---|
| `location_updates` | Purged after 7 days by `safeway-daily-purge` |
| `idempotency_keys` | Purged after 7 days (the `(reporter_id, client_id)` unique constraint on `incidents` remains the backstop) |
| `audit_ledger`, `incident_events` | Never deleted |
| Backups | Nightly encrypted `pg_dump` (`age`) via GitHub Actions, private repo, short retention, decryption key stored separately. One scratch-database restore is attempted if time allows; otherwise mark restore verification **incomplete**. Never claim recovery was tested unless it was. After any restore, `verify_audit_chain()` must still return `ok = true` |
| Storage | `report-media` copies are `[Post-MVP]` |

**Not created (removed or Post-MVP):** `price_submissions`, `device_tokens`, `weather_cache`, `responder_profiles`, `sync_log`, `user_roles`, `responder_assignments`, `incident_media` (`[Post-MVP]`); `family_links`, `audit_logs`, `chain_records`, `sos_events`, `geofences`, `audit_events` (removed). No PostGIS, no polygon columns, no blockchain tables, no medical-note columns, no Aadhaar or passport number columns anywhere.

---

## 13. Seed guidance (`supabase/seed/`)

Seed with **synthetic data only**. Every seeded row sets `is_sample = true` (except users) and the UI labels it "sample data".

**Users and roles (seed script, service-role key, run once).** Create users through the Supabase Admin API so the role is written to `app_metadata` (this is the MVP's role-assignment path; there is no endpoint). Use throwaway passwords and rotate them after the event.

```python
# supabase/seed/seed_users.py (outline; credentials come from env, never the repo)
admin.auth.admin.create_user({
    "email": "<demo-email>", "password": "<from env>", "email_confirm": True,
    "user_metadata": {"full_name": "<demo name>"},
    "app_metadata": {"role": "admin"},        # tourist users: omit role or use "tourist"
})
# After creating each user, call append_audit_entry(actor, 'role_changed', 'user', '<user id>')
```

Accounts: 2 tourists, 1 `rescue`, 1 `admin`, 1 `guide`. Add 2 contacts for the primary demo tourist so the demo does not start by typing phone numbers (optional; the demo script also adds them live).

**Hazard zones.** Sample circles around the Kullu–Manali road: a landslide-prone stretch, a road-under-repair stretch, one `wildlife` and one `low_network` zone. Coordinates are illustrative and must be labelled sample data; pick them so the demo test coordinate falls inside one zone.

```sql
insert into public.hazard_zones
  (name, type, severity, center_lat, center_lng, radius_m, source, reason, is_sample)
values
  ('Sample: landslide-prone stretch', 'landslide',   'high',   32.10, 77.13, 800, 'seed', 'Sample data for demo', true),
  ('Sample: road under repair',       'road_repair', 'medium', 32.18, 77.17, 600, 'seed', 'Sample data for demo', true);
-- Add one 'wildlife' and one 'low_network' row the same way (F5: sample data, no live-data claim).
```

**Price baselines.** One row for the demo route, matching the demo script. Set `source` to a real citation if the team has one; otherwise keep it as below.

```sql
insert into public.price_baselines (kind, route_or_item, min_price, max_price, source, is_sample)
values ('taxi', 'Manali local taxi (demo route)', 1200, 1500, 'sample data', true);
```

**Services.** A few `verified` rows (include a guide whose `owner_id` is the seeded guide user's id, so acceptance criterion 2 can be tested), plus one `pending` row for the admin approval demo. All `is_sample = true`.

**Incidents.** A few fictional historical incidents with `is_sample = true`, `status` `closed`, so the console is not empty. Insert them through the same transition path or directly as `postgres` (the transition trigger only checks updates, not inserts).

**Never seed:** real people, real phone numbers, real live locations, real documents.

---

## 14. Traceability

| PRD requirement | Schema element |
|---|---|
| FR-3, FR-5 (contacts, trip start) | `emergency_contacts`, `trips.reduced_fallback_ack_at`, `trips_guard_start` |
| FR-8 (7-day retention) | `safeway-daily-purge` |
| FR-15, FR-16 (SOS categories, lifecycle) | `incident_category`, `incident_status`, `incidents_validate_transition` |
| FR-14, FR-41 to FR-43 (audit) | `audit_ledger`, `append_audit_entry`, `verify_audit_chain` |
| FR-19 to FR-25 (inactivity) | `trips.last_heartbeat_at`, `inactivity_alerts`, `notifications`, `safeway-inactivity-sweep` |
| FR-23 (quiet hours) | `profiles.quiet_hours_enabled` |
| FR-26 to FR-29 (zones, advisories) | `hazard_zones`, `safety_alerts` |
| FR-31 to FR-33 (price, services, reports) | `price_baselines`, `services`, `reports` |
| FR-37, FR-38 (notifications, SMS cap) | `notifications` (`subject_user_id`, `provider`, `event_id`) |
| FR-39, FR-40 (QR ID, identity) | `profiles.public_id`, `public_id_revoked_at`, `identity_verifications` |
| Acceptance criteria 1 to 7, 11 | Section 10 checklist |

Next in the build order: `DATABASE_MODELS.md` (Pydantic v2 models and matching TypeScript types).
