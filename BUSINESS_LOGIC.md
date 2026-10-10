# SafeWay: Business Logic

> **Version:** 1.0 · **Date:** 2026-10-10 · **Status:** Final for the 6-hour MVP
> **Team:** Minions · **Depends on:** [PRD.md](PRD.md), [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md), [DATABASE_MODELS.md](DATABASE_MODELS.md), [AUTH_REQUIREMENTS.md](AUTH_REQUIREMENTS.md), [SECURITY.md](SECURITY.md)
> **Purpose:** The exact rules the code implements. Who may do an action is in `AUTH_REQUIREMENTS.md`; limits and abuse caps are in `SECURITY.md`. Neither is repeated here.
> **Tags:** `[MVP]` built now · `[Post-MVP]` one-line mention only · `[Proposed default]` a value the team has not confirmed, change freely.
> **Where the code lives:** logic is in `apps/api/app/services/`; routers stay thin.
> **Scope note:** Only MVP rules are described. Unused rules are removed (Section 16).

---

## 1. Principles

1. **SOS first.** SOS must work with every other feature broken. Weather, ORS, SMS and the audit call must never block the user seeing a confirmation.
2. **Honest states.** A write to our database means "received by SafeWay", never "a responder has seen it", never "police notified". Missing data becomes `unknown`, never "safe".
3. **Explainable.** Every score or advisory records its rule, source, input timestamp and data quality.
4. **One source of truth.** The database. Realtime only pushes persisted changes.
5. **Idempotent.** Every retry-able write carries a client UUID; repeating it never creates a second row or a second SMS.
6. **Server decides.** The server sets user id, role, severity, status, assignment and verification fields. Clients send only what [DATABASE_MODELS.md](DATABASE_MODELS.md) allows.

### 1.1 Configuration values `[Proposed defaults]`

Kept in `core/config.py`, overridable by env var. None of these is a secret.

| Name | Default | Used by |
|---|---|---|
| `SOS_TIMEOUT_S` | 5 | Client SOS attempt timeout |
| `SOS_COUNTDOWN_S` | 3 | Accidental-press countdown |
| `SOS_CANCEL_WINDOW_S` | 300 | Reporter cancel window |
| `SOS_COOLDOWN_S` | 60 | Second distinct SOS returns the existing one |
| `DEMO_MODE` | `false` | Shortens inactivity windows |
| `INACTIVITY_NUDGE_S` / `INACTIVITY_SMS_S` | 10800 / 14400 | Real windows (3 h, 4 h) |
| `DEMO_NUDGE_S` / `DEMO_SMS_S` | 60 / 120 | Demo windows (1 min, 2 min) |
| `STALE_LOCATION_S` | 120 | UI "Location needs updating"; geofence ignores older fixes |
| `GEOFENCE_MAX_ACCURACY_M` | 100 | Fixes less accurate than this are stored but ignored for geofencing |
| `GEOFENCE_STALE_S` | 600 | Fixes older than this at receipt are ignored for geofencing |
| `GEOFENCE_HYSTERESIS_M` | 50 | Exit buffer |
| `ROUTE_HAZARD_BUFFER_M` | 100 | A route "touches" a zone within radius plus this |
| `REPORT_NEAR_M` / `REPORT_WINDOW_H` | 1000 / 72 | Verified reports counted near a route |
| `RISK_WEIGHTS` | hazard 0.50, weather 0.15, night 0.10, reports 0.25 | Route ranking |
| `WEATHER_TTL_S` / `WEATHER_TIMEOUT_S` | 900 / 3 | Weather cache and call timeout |
| `NOTIFY_MAX_ATTEMPTS` | 3 | Delivery retries |
| `QUIET_START` / `QUIET_END` | 22:00 / 06:00 (Asia/Kolkata) | Quiet hours, only if the tourist enabled them |
| `LOCATION_SEND_INTERVAL_S` | 30 | Foreground location batching on the client |

Rate limits and SMS caps are in [SECURITY.md](SECURITY.md) Section 5.

---

## 2. SOS workflow `[MVP]`

### 2.1 Client state machine

UI-only states: `draft`, `pending`, `submitted`, `failed`, `manually_sent`. They are never database statuses.

```
draft ──(confirm, or countdown ends)──► pending ──(server confirms)──► submitted
  │                                        │  ▲
  └──(cancel during countdown)──► gone     │  └──(retry succeeds)
                                           ├──(user opens SMS/call)──► manually_sent ──(retry succeeds)──► submitted
                                           └──(permanent rejection or 48 h old)──► failed
```

1. SOS is reachable in one or two taps from any screen. Tapping starts a `SOS_COUNTDOWN_S` countdown with a cancel button. Cancelling during the countdown sends nothing.
2. When the countdown ends the UI **immediately** shows "SOS recorded, sending" with no network wait.
3. Generate `client_id` (UUID v4). Capture coordinates, accuracy and timestamp if location permission exists. If GPS fails or is denied, continue without it.
4. Write the item to the IndexedDB queue **before** any network call, so a crash cannot lose it.
5. `POST /api/v1/sos` with `SOS_TIMEOUT_S`, header `Idempotency-Key` equal to `client_id`.
6. **Success:** state `submitted`, show the incident `reference`, remove the queue item. Text: "Report sent to SafeWay response team."
7. **Timeout, network error, or `5xx`/`429`:** state stays `pending`; the item stays queued; offer the fallback ladder (2.2); retry with backoff (2.3).
8. **Permanent rejection** (`400`, `403`, `422`, or `401` that persists after a token refresh): state `failed`, the ladder stays visible with the text "Not sent. Use the call or SMS buttons." A `401` with a refreshable session is retried, not failed.
9. An item still unsent after **48 hours** becomes `failed`.
10. `navigator.onLine` is never treated as proof of connectivity. Only a successful response counts.

### 2.2 Fallback ladder (offered whenever the state is `pending` or `failed`)

1. **Prefilled SMS** addressed to the user's available, consented emergency contacts (F8). No control-room number is assumed; one is used only if explicitly configured and verified.
   - Body (plain text, no links): `SOS from {full_name}. Location: {lat},{lng} (about {accuracy} m) at {time IST}. Tourist ID: {public_id}. Sent via SafeWay.` Coordinates are omitted if there is no fix.
   - Link format differs by platform: Android `sms:<n1>,<n2>?body=<text>`, iOS `sms:<n1>,<n2>&body=<text>`. Detect the platform and test on one real phone of each kind. The user must tap Send.
2. **Call buttons:** 112 (emergency), 100 (police), 108 (ambulance) as `tel:` links.
3. After the user opens the SMS or call flow, the UI state becomes `manually_sent`: "Opened your messaging app. Delivery is not confirmed." The queue item **keeps retrying** and moves to `submitted` if the server confirms.
4. The ladder is a device feature. It works without data, and it does **not** create a dashboard incident (PRD FR-17).

### 2.3 Sync and retry

- **Triggers:** browser `online` event; app resume (`visibilitychange` to visible); timed retry; manual "Sync now" button. No Background Sync and no service worker (PRD R1).
- **Backoff while the app is open:** 2, 5, 10, 20, 40, 60 seconds, then every 60 seconds, each with up to 20% random jitter.
- **Order:** oldest first. SOS items are sent before queued location points and reports.
- **Duplicates:** the server returns the existing incident for a repeated `client_id` with `duplicate: true`. The client treats that as success.
- Offline SOS works only if the app was already open and loaded when the connection dropped (no service worker).
- On app load and trip start the client pings `/health` to warm the Render instance.

### 2.4 Server processing of `POST /sos`

Order matters. Steps 3 to 7 are **one database transaction**; steps 8 to 9 happen after commit and never block the response.

1. Authenticate (role `tourist`), validate the body ([DATABASE_MODELS.md](DATABASE_MODELS.md) `SosRequest`), check `Idempotency-Key == client_id` (else `422`).
2. **Idempotency:** if an incident exists for `(reporter_id, client_id)`, return it with `duplicate: true`. Stop.
3. **Cooldown:** if the same user has an incident created within `SOS_COOLDOWN_S`, return that incident with `duplicate: true`. No new row, no new SMS.
4. Resolve the trip: if `trip_id` is sent it must belong to the user. Otherwise use the user's active trip, if any.
5. Insert the incident: `status = submitted`; `severity` by category (medical, accident, personal_safety → `high`; lost_stranded, other → `medium`); `reference` from the database sequence; `is_sample = false`.
6. Insert `incident_events` (`event_type = submitted`, `is_internal = false`). Insert `idempotency_keys`. If the user has an active trip, set `last_heartbeat_at = now()` (an SOS is a heartbeat).
7. Insert `notifications` rows (persisted before delivery, Section 11): one SMS row per consented contact, and one `in_app` row per active staff account. Then call `append_audit_entry(actor, 'sos_submitted', 'incident', incident_id)`.
8. After commit: return `SosResponse` (`status = submitted`). Trigger delivery in a background task.
9. Supabase Realtime pushes the new incident row to staff and to the reporter.

If step 7's audit call fails, the transaction rolls back and the client keeps retrying. It never receives a false confirmation.

`POST /sos/{id}/cancel`: allowed for the reporter within `SOS_CANCEL_WINDOW_S` while status is `submitted`, `acknowledged` or `assigned`, or for an admin. It is a normal transition to `cancelled` (Section 3). Contacts who already received an SMS are **not** recalled; the UI says so.

---

## 3. Incident lifecycle `[MVP]`

### 3.1 States and transitions

```
submitted → acknowledged → assigned → in_progress → resolved → closed
   │             │            │
   └─────────────┴────────────┴──► cancelled   (reporter within window, or admin)
   └─────────────┴────────────┴──► duplicate   (admin only)
```

`closed`, `cancelled` and `duplicate` are terminal. Reassignment keeps the status `assigned` and does not change it. "En route" and "on site" are `incident_events` inside `in_progress`, not statuses. Who may perform each transition: [AUTH_REQUIREMENTS.md](AUTH_REQUIREMENTS.md) Section 5. The database trigger rejects illegal transitions as a second layer.

### 3.2 Transaction pattern (every transition)

One transaction, in this order, with the incident row locked (`SELECT ... FOR UPDATE`):

1. Read the current status and check the transition is legal.
2. Check the actor's permission.
3. Apply the change to `incidents` (status, `assigned_to`, `resolution_notes` where relevant).
4. Insert an `incident_events` row.
5. Insert the `notifications` row for the tourist (in-app).
6. Call `append_audit_entry`.

If any step fails, nothing is applied and the caller gets an error. Clients never write status directly.

### 3.3 Event and notification mapping

| Action | `event_type` | `details` (jsonb) | Tourist in-app message |
|---|---|---|---|
| Acknowledge | `acknowledged` | `{}` | "SafeWay response team has seen your report." |
| Assign / reassign | `assigned` | `{assignee_id, previous_assignee_id?}` | "A responder has been assigned." |
| `→ in_progress` | `status_changed` | `{from, to}` | "Help is in progress." |
| En route | `en_route` | `{}` | "Responder is on the way." |
| On site | `on_site` | `{}` | "Responder has reached the location." |
| `→ resolved` | `status_changed` | `{from, to, notes?}` | "Marked resolved. Tell us if you still need help." |
| `→ closed` | `status_changed` | `{from, to}` | none |
| `→ cancelled` | `cancelled` | `{by}` | "Your report was cancelled." |
| `→ duplicate` | `status_changed` | `{from, to}` | none |
| Note | `note` | `{text}` | none (internal notes are hidden from the tourist) |

Messages never claim police or ambulance were contacted. They say "SafeWay response team".

### 3.4 Assignment and the console

- `assignee_id` must belong to an account whose `app_metadata.role` is `rescue` or `admin`.
- The console shows active rescue accounts and real assignments only. **No "available responders" count** (F4).
- Queue order: `critical` and `high` severity first, then oldest `submitted`, with `submitted` and `acknowledged` items above the rest.

---

## 4. Location, heartbeat and geofencing `[MVP]`

### 4.1 Location ingestion (`POST /location/batch`)

1. Role `tourist`; the user must have `location_consent_at` set, else `403 location_consent_required`; the user must have an `active` trip, else `409 no_active_trip`.
2. Each point has its own `client_id`. Points already stored for `(user_id, client_id)` are counted as `duplicates` and skipped.
3. A point whose `recorded_at` is more than 5 minutes in the future is invalid; the whole batch is rejected with `422 invalid_timestamp`.
4. Insert accepted points. `recorded_at` (device time) is the authoritative time; `received_at` is server time.
5. **Heartbeat:** set `trips.last_heartbeat_at = max(current value, min(now, latest recorded_at in the batch))`. It never moves backward, so syncing old queued points does not look like fresh activity.
6. Run geofence evaluation (4.3). Return `LocationBatchResponse`.
7. Client behaviour: send every `LOCATION_SEND_INTERVAL_S` or after about 50 m of movement, in batches of up to 100; queue points offline; show the notice "Keep SafeWay open for continuous location tracking". Show accuracy and "last received" time. If the newest fix is older than `STALE_LOCATION_S` while a trip is active, show "Location needs updating" and never show the old fix as current.

### 4.2 Manual check-in (`POST /checkins`)

Sets `trips.last_heartbeat_at = now()` for the user's active trip and returns `CheckinResponse`. Then cancels fired alerts (5.5).

### 4.3 Geofence evaluation (server-authoritative)

Distance is the haversine great-circle distance between the point and the zone centre:

```python
def haversine_m(lat1, lng1, lat2, lng2) -> float:
    R = 6_371_000.0
    p1, p2 = radians(lat1), radians(lat2)
    dp, dl = p2 - p1, radians(lng2 - lng1)
    a = sin(dp/2)**2 + cos(p1) * cos(p2) * sin(dl/2)**2
    return 2 * R * asin(sqrt(a))
```

**Eligible zones:** `active = true` and `now` within `starts_at`/`expires_at` (a null bound is open). Tourists never create zones.

**State per tourist and zone** is derived, not stored in its own table: the latest `safety_alerts` row for `(user_id, zone_id)` with `type` `geofence_enter` or `geofence_exit` decides it (`enter` = INSIDE, anything else or none = OUTSIDE).

**For each accepted point, in `recorded_at` order, for each eligible zone:**

1. Skip the point for geofencing (it is still stored) if `accuracy_m` is missing or greater than `GEOFENCE_MAX_ACCURACY_M`, or if it was older than `GEOFENCE_STALE_S` when received.
2. `d = haversine_m(point, zone centre)`.
3. If state is OUTSIDE and `d <= radius_m`: **enter**. Create a `geofence_enter` alert.
4. If state is INSIDE and `d >= radius_m + GEOFENCE_HYSTERESIS_M`: **exit**. Create a `geofence_exit` alert.
5. Otherwise do nothing. **Events fire only on a state change.** A repeated point inside the zone creates nothing.
6. If a zone stops being eligible while the user is INSIDE, no exit event is created; the state is ignored until the zone is eligible again.

**Alert content**

| Field | Value |
|---|---|
| `level` (enter) | zone severity: low → `info`, medium → `caution`, high → `warning`, critical → `critical` |
| `level` (exit) | `info` |
| `type` | `geofence_enter` / `geofence_exit` |
| `message` | e.g. "You are entering a landslide-prone area." (zone type in plain words) |
| `rule` | `geofence.circle_haversine.v1` |
| `source` | zone `source` (`authority`, `crowd`, `feed`, `seed`); add "sample data" if the zone `is_sample` |
| `data_timestamp` | the point's `recorded_at` |
| `data_quality` | `good` (accuracy within limit) |
| `suggested_action` | enter: "Take extra care and check road conditions before continuing." Exit: none |
| `reason` | the zone's `reason` text |

`wildlife` and `low_network` zones are seeded sample data. The message never claims live wildlife tracking or measured network coverage (F5).

There is no "approach" buffer in the MVP. PostGIS and polygon zones are `[Post-MVP]`.

---

## 5. Inactivity alert `[MVP]`

### 5.1 Definitions

- **Armed:** only while a trip is `active`.
- **Heartbeat** = an accepted foreground location batch (4.1), an SOS (2.4), or a manual check-in (4.2). `trips.last_heartbeat_at` holds the latest. It is set to `now()` when the trip starts.
- **Silent time** = `now - last_heartbeat_at`.
- **Episode:** the period of silence that began at a given `last_heartbeat_at` value. A new heartbeat starts a new episode. This is why `inactivity_alerts` is unique on `(trip_id, window, heartbeat_at)` (S6).

### 5.2 Windows

| Window name | Real | Demo (`DEMO_MODE=true`) | Action |
|---|---|---|---|
| `nudge` | 3 h | 1 min | Persistent in-app notification asking the tourist to check in |
| `contact_sms` | 4 h | 2 min | SMS to each consented emergency contact |

`inactivity_alerts.window` always stores the logical name, never the duration.

### 5.3 Sweep algorithm (`inactivity_sweep(now, demo_mode)`)

One shared service function, called by both entry points (5.6). It is safe to run repeatedly.

```
nudge_s, sms_s = (DEMO_NUDGE_S, DEMO_SMS_S) if demo_mode else (INACTIVITY_NUDGE_S, INACTIVITY_SMS_S)

for trip in trips where status = 'active' and last_heartbeat_at is not null:
    hb      = trip.last_heartbeat_at
    silent  = now - hb

    # --- nudge window ---
    if silent >= nudge_s and no inactivity_alerts row (trip, 'nudge', hb):
        if tourist.quiet_hours_enabled and now is within quiet hours:
            skipped_quiet_hours += 1          # nothing written; re-evaluated on the next run
        else:
            in one transaction:
                insert inactivity_alerts (trip, user, 'nudge', hb)      # unique key blocks a second insert
                insert notifications (in_app, type 'inactivity_nudge',
                                      event_id 'inactivity_nudge:{trip}:{hb_epoch_ms}')

    # --- contact SMS window (never suppressed by quiet hours) ---
    if silent >= sms_s and no inactivity_alerts row (trip, 'contact_sms', hb):
        in one transaction:
            insert inactivity_alerts (trip, user, 'contact_sms', hb)
            for each consented contact of the user:
                insert notifications (sms, subject_user_id = user, type 'inactivity_contact_sms',
                                      event_id 'inactivity_sms:{trip}:{hb_epoch_ms}:{contact_id}')
    # a unique-violation on inactivity_alerts means another run already did it: skip silently
```

- **Quiet hours** are off by default (F11). If the tourist enabled them, they suppress **only** the nudge, between `QUIET_START` and `QUIET_END` Asia/Kolkata. They never delay SOS processing or the `contact_sms` window.
- If the trip has no consented contact at that moment (contacts were deleted mid-trip), the `contact_sms` alert row is still written and one `failed` outbox row is recorded with `last_error = "no contact"` so admins can see it.
- Missing a heartbeat is a **missed check-in, not proof of an emergency.** A foreground-only app stops sending heartbeats when the phone is in a pocket, so the copy is neutral.

### 5.4 Message texts (plain text, no links)

- Nudge (in-app): "We have not heard from you. Please tap 'I'm safe' to check in."
- Contact SMS: `SafeWay: no check-in from {full_name} since {time IST}. Last known location: {lat},{lng} at {time IST}. This is not a confirmed emergency.` If no location exists, omit the location sentence. It never says the tourist is in danger.

### 5.5 Check-in cancels

A new heartbeat changes `last_heartbeat_at`, which starts a new episode, so older pending conditions are never evaluated again. On a check-in (or any heartbeat) the server also sets `status = 'cancelled'` and `cancelled_at = now()` on the trip's `fired` alerts. The in-app nudge stays in the history, but the UI hides it once a heartbeat is newer than the nudge. An SMS that was already sent cannot be recalled.

### 5.6 Entry points

| Entry | Caller | Auth | Notes |
|---|---|---|---|
| `POST /internal/jobs/inactivity-sweep` | `pg_cron` + `pg_net` every 5 minutes (cron-job.org as backup) | `X-Cron-Secret`, `401` otherwise | The only scheduler (F10). Real alerts can fire up to about 5 minutes after their window |
| `POST /admin/jobs/inactivity-sweep` | Admin console button | Admin JWT | Calls the same function; the cron secret never reaches the browser |

Both return `SweepResponse`. With `DEMO_MODE=true` both use the demo windows.

**Demo steps:** start the demo trip, then stop location pings on the demo tourist (close the tab or stop sharing) so heartbeats do not reset the timer. After about 1 minute press "Run sweep" in the admin console: the in-app nudge appears. After about 2 minutes press it again: the contact SMS appears in the outbox as "Mock SMS", once each. Pressing it again creates nothing new.

---

## 6. Risk and advisory engine `[MVP]`

### 6.1 Rules

- **One rules engine, no 0 to 100 score.** The UI never says "safe" and never shows a number.
- Advisory levels: `info`, `caution`, `warning`, `critical`, `unknown`.
- Missing or stale data is `unknown` and is **never** treated as low risk.
- Every advisory stores `rule`, `source`, `data_timestamp`, `data_quality` and `suggested_action`.
- It is rule-based and explainable. Pitch wording: "explainable rule-based scoring now, ML as reports accumulate". Never claim a trained model.

### 6.2 The four factors

For each candidate route, compute a **level** for each factor. Levels are shown to the user with a plain-language explanation. The ranking number below stays internal and is never returned.

| Factor | Inputs | Level rule |
|---|---|---|
| `hazard_proximity` | Eligible zones; the route polyline | Find zones where the minimum distance from the route to the zone centre is at most `radius_m + ROUTE_HAZARD_BUFFER_M`. Level = the highest zone severity found (low → `info`, medium → `caution`, high → `warning`, critical → `critical`). None found → `info` ("No known hazard zone near this route in the current data"). If no zones are loaded at all or the zone query failed → `unknown` |
| `weather_severity` | One weather lookup at the route midpoint (6.5) | Thunderstorm, or rain at least 7.6 mm/h, or wind at least 60 km/h → `warning`. Rain 2.5 to 7.6 mm/h, wind 40 to 60 km/h, or snow → `caution`. Otherwise `info`. Weather unavailable → `unknown` |
| `night_factor` | `departure_time` (default now), converted to Asia/Kolkata | Between 19:00 and 06:00 → `caution`, otherwise `info` |
| `report_density` | **Verified** reports within `REPORT_NEAR_M` of the route in the last `REPORT_WINDOW_H` hours | 0 → `info`; 1 or 2 → `caution`; 3 or more → `warning`. Query failed → `unknown` |

Because weather is looked up once per request, it does not separate alternatives from each other. It still appears in each route's explanation.

### 6.3 Ranking and overall level

```
points: info 0, caution 1, warning 2, critical 3, unknown 1.5      # unknown can never beat a known "info"
risk   = 0.50*points(hazard) + 0.15*points(weather) + 0.10*points(night) + 0.25*points(reports)
```

- Sort routes by `risk` ascending; ties broken by shorter duration. `rank = 1` means "lowest rule-based risk among these alternatives", **not** "safe".
- Overall `advisory_level` = the highest level among the factors. If any factor is `unknown` and the highest known level is `info`, the overall level is `unknown`.
- Weights come from config (`RISK_WEIGHTS`) so they can be tuned without code changes.

### 6.4 Routing (OpenRouteService)

1. Call `POST /v2/directions/{profile}` (profile `driving-car`) with `alternative_routes` (`target_count` 3, `share_factor` 0.6, `weight_factor` 1.4). Alternatives work only for shorter routes; the Manali area is within range.
2. If any eligible zone of severity `high` or `critical` lies near the best route, also request one route with `options.avoid_polygons`, where each zone circle is approximated by a 16-sided polygon with the zone's radius. Mark that candidate with `avoided_zone_ids`.
3. Score every candidate (6.2, 6.3), sort, return `RouteRankResponse`.
4. **If ORS fails or times out:** return the pre-recorded route response from the cut ladder, flagged `is_recorded_sample = true` and shown to the user as "Recorded sample route". SOS is unaffected.
5. ORS and OSM tiles have usage limits. Rate limits are in [SECURITY.md](SECURITY.md).

### 6.5 Weather

- Server-side only; the API key never reaches the browser.
- Cached in memory by coordinates rounded to 2 decimals for `WEATHER_TTL_S`. A call that takes more than `WEATHER_TIMEOUT_S` seconds counts as failed.
- On failure or quota error: the weather card shows "Weather data unavailable", the weather factor is `unknown`. An old cached value is **not** shown as current once its TTL has passed.
- The card shows the observation time and the source, labelled "external weather information". A weather API is not an official disaster-warning system. Official feeds (NDMA SACHET, IMD) are "planned integration", not built.

---

## 7. Price checker `[MVP]`

1. Input: `kind`, `route_or_item`, `quoted_price` (INR).
2. Look up `price_baselines` by `kind` and `route_or_item` (trimmed, case-insensitive exact match). The form offers the known items by reading `price_baselines` directly under RLS.
3. Verdict:

| Condition | `verdict` | `message` |
|---|---|---|
| No baseline row | `no_baseline` | "No reference range for this item." |
| `quoted_price > max_price` | `too_high` | "Price seems too high. Usual range is ₹{min} to ₹{max}." |
| `quoted_price < min_price` | `below_range` | "Below the usual range. Check what is included." |
| otherwise | `within_range` | "Within the usual range of ₹{min} to ₹{max}." |

4. Always return a **range**, never a single number, plus the `source`. If the row `is_sample`, the UI shows "sample data". It is an estimate, not a fixed fare.
5. User-submitted prices and outlier detection are `[Post-MVP]`.

---

## 8. Verified services `[MVP]`

- Tourists, guides, rescue and admin see only `status = 'verified'` rows (a guide also sees their own row). Pending and rejected rows are never shown to tourists.
- Admin decision (`pending → verified` or `rejected`; an admin may later change `verified → rejected` or `rejected → verified`): set `verified_by = admin`; set `verified_at = now()` for `verified`, clear it for `rejected`. Audit `service_verified` or `service_rejected` with entity type `service`.
- A guide's own edits are limited to `name`, `contact`, `area` by the database grant. A guide edit does not change `status`. If a verified listing's details are edited, admins review it before the next event; automatic re-verification is `[Post-MVP]`.
- Ratings and the partner application form with document upload are `[Post-MVP]`. Pitch: verification can be run with tourism departments or taxi unions with annual renewal.

---

## 9. Reports and hazard data `[MVP]`

1. `POST /reports` (tourist): `client_id` idempotent; location required and range-checked; description at most 1000 characters; `media_path`, if given, must start with `<user_id>/` and refer to an existing upload. Status starts as `submitted`.
2. Admin decision (`verified` or `rejected`): set `verified_by` and `verified_at`; audit `report_verified` or `report_rejected` (entity type `report`).
3. **Effects of a verified report:** it counts in `report_density` (6.2) for routes within `REPORT_NEAR_M` for `REPORT_WINDOW_H` hours. It does **not** create a hazard zone automatically.
4. **Zone from a report:** an admin may create a zone by hand from a verified report (source `crowd`). That is a normal zone creation (9.5).
5. Rejected and unverified reports have no effect on routing. A rejected report shows as "rejected" to its author; it is not silently dropped.
6. `[Post-MVP]`: GPS distance check (about 500 m), EXIF checks, trust score, "public alert only after N independent reports", photo classification.

### 9.5 Zones (admin)

- Create: `active = true`; audit `zone_activated` (entity type `hazard_zone`). Deactivate (`active = false`): audit `zone_deactivated`. Other edits are not audited.
- `source` is `authority` or `crowd` when created by an admin. `seed` and `feed` are set only by the seed script.
- Tourists never create or edit zones.

---

## 10. Identity and QR ID `[MVP]`

- **Mock verifier** ("Sandbox/Demo"): `POST /identity/verify` with `provider = mock` creates an `identity_verifications` row with `status = verified`, a generated `reference_id`, and `verified_at = now()`. No number or document is read or stored. The UI always shows the "Sandbox/Demo" label.
- `passport_manual`: creates a `pending` row; an admin approves or rejects it. Approval sets `status = verified` and `verified_at`.
- Verification is optional and never blocks registration or trip creation (F6). "Identity verified" is true if any row for the user is `verified`.
- **QR ID:** regenerate = new random `public_id`, clear `public_id_revoked_at`; admin revoke = set `public_id_revoked_at` and audit `id_revoked` (entity type `profile`). Public page rules: [AUTH_REQUIREMENTS.md](AUTH_REQUIREMENTS.md) 6.2 and 7.

---

## 11. Notifications and SMS `[MVP]`

### 11.1 Outbox lifecycle

1. Created **inside the same transaction** as the committed event that caused them (persist before delivery).
2. `event_id` is stable and unique, which prevents duplicates on retry:

| Type | `event_id` |
|---|---|
| SOS SMS to a contact | `sos_sms:{incident_id}:{contact_id}` |
| SOS alert to staff (in-app) | `sos_staff:{incident_id}:{staff_user_id}` |
| Incident update to tourist (in-app) | `incident_update:{incident_event_id}` |
| Inactivity nudge (in-app) | `inactivity_nudge:{trip_id}:{heartbeat_epoch_ms}` |
| Inactivity SMS to a contact | `inactivity_sms:{trip_id}:{heartbeat_epoch_ms}:{contact_id}` |

3. **In-app** rows are `sent` as soon as they are committed. The in-app feed (plus `safety_alerts`) is the reliable history; never assume a notification was read.
4. **SMS** rows start `pending`. After commit a background task calls the SMS adapter. Success → `sent` and `sent_at`. Failure → `attempts + 1`, `last_error` set; the row stays `pending` until `attempts` reaches `NOTIFY_MAX_ATTEMPTS`, then becomes `failed`.
5. The 5-minute sweep also retries `pending` SMS rows older than 1 minute, so a Render cold start or a crash does not lose them.
6. Delivery is "best effort": no guaranteed-delivery claim anywhere.

### 11.2 SMS adapter and caps

- `SMS_PROVIDER=mock|msg91`. **Mock** writes the row as `sent` with `provider = 'mock'`; the admin outbox shows it labelled "Mock SMS". MSG91 needs DLT registration (entity, sender ID, two approved templates for SOS and inactivity, template ID sent with each message); a template mismatch means silent blocking.
- Recipients are only the user's stored, consented emergency contacts. Daily per-user cap and the global kill switch (`SMS_ENABLED`) are in [SECURITY.md](SECURITY.md) 5.2. A capped or killed SMS is recorded as `failed` with the reason.
- SOS SMS text: `SafeWay: {full_name} sent an SOS at {time IST}. Last location: {lat},{lng} (about {accuracy} m). Ref {reference}. Automated message. If you cannot reach them, call 112.` Omit the location sentence if there is no fix. Plain text, coordinates written out, no links.
- Time is shown in IST. Coordinates have 5 decimal places.

---

## 12. Audit ledger `[MVP]`

### 12.1 What is logged

| Event | `action` | `entity_type` | `entity_id` | Written by |
|---|---|---|---|---|
| SOS submitted | `sos_submitted` | `incident` | incident id | SOS transaction |
| Acknowledge | `incident_acknowledged` | `incident` | incident id | Transition transaction |
| Assign / reassign | `incident_assigned` | `incident` | incident id | Transition transaction |
| Status change (in_progress, resolved, closed, duplicate) | `incident_status_changed` | `incident` | incident id | Transition transaction |
| Cancel | `incident_cancelled` | `incident` | incident id | Transition transaction |
| Role change | `role_changed` | `user` | user id | Seed script |
| Zone activated / deactivated | `zone_activated` / `zone_deactivated` | `hazard_zone` | zone id | Admin action |
| Service decision | `service_verified` / `service_rejected` | `service` | service id | Admin action |
| Report decision | `report_verified` / `report_rejected` | `report` | report id | Admin action |
| QR ID revoked | `id_revoked` | `profile` | user id | Admin action |

Not logged: notes, locations, check-ins, price checks, descriptions or any personal data. `actor_id` is the acting user (or the seed script's admin).

### 12.2 Hashing and verification

Implemented in `append_audit_entry` and `verify_audit_chain` ([DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) Section 8):

```
entry_hash = SHA-256( prev_hash | id | actor_id | action | entity_type | entity_id | created_at_utc )
```

- Fields are joined with `|`; a null `actor_id` or `entity_id` is an empty string; `created_at` is formatted `YYYY-MM-DDTHH:MI:SS.USZ` in UTC. The first entry uses 64 zeros as `prev_hash`.
- A single advisory lock serialises writers so the chain cannot fork.
- `GET /audit/verify` (admin) calls `verify_audit_chain()` and returns `AuditVerifyResponse`. It fails if any row was edited by hand.
- Stated honestly as **tamper-evident, not tamper-proof**. Daily head-hash checkpoint is `[Post-MVP]`.

---

## 13. User-facing wording (honesty table)

| Situation | Say | Never say |
|---|---|---|
| SOS accepted by server | "Report sent to SafeWay response team. Ref SW-000123." | "Police notified", "Help is on the way" |
| SOS not yet confirmed | "Recorded on this phone. Not sent yet. Use the call or SMS buttons." | "Sent" |
| User opened SMS or call | "Opened your messaging app. Delivery is not confirmed." | "SMS delivered" |
| Route result | "Lowest rule-based risk among these routes" | "Safe route", any numeric score |
| Missing data | "Unknown", "Weather data unavailable", "Location needs updating" | "Low risk", "Safe" |
| Seeded content | "Sample data" | Presenting it as live |
| Mocks | "Mock SMS", "Sandbox/Demo" | Implying real delivery or real verification |
| Prices | "Usual range ₹1,200 to ₹1,500 (estimate)" | A single "fair price" |
| Inactivity | "No check-in since {time}. This is not a confirmed emergency." | "In danger", "Missing" |
| Privacy | "Aligned with DPDP Act 2023 principles" | "DPDP compliant" |
| Ledger | "Hash-chained, append-only audit ledger" | "Tamper-proof", "blockchain" |

---

## 14. Unit and integration tests (logic)

One `pytest` module per area; plus one end-to-end test of the demo path.

1. **Haversine:** known coordinate pairs within 1 m; a point exactly on the radius counts as inside.
2. **Geofence state machine:** entering fires once; staying inside fires nothing; leaving inside the hysteresis band fires nothing; leaving beyond `radius + 50 m` fires one exit; a low-accuracy fix and a stale fix are ignored; an inactive or expired zone is ignored.
3. **Heartbeat:** a batch of old points does not move `last_heartbeat_at` backward; a manual check-in and an SOS both update it.
4. **Inactivity sweep:** nudge fires once at the nudge window and again only after a new heartbeat; contact SMS fires once per consented contact; running the sweep twice creates no duplicates; quiet hours suppress only the nudge; with no heartbeat before demo windows, nothing fires early; demo windows are 60 and 120 seconds; a check-in marks fired alerts `cancelled`.
5. **Incident transitions:** every legal transition passes; every illegal one fails at the service and the database; a failed audit call rolls the whole transition back; reassignment keeps the status; internal notes are hidden from the tourist timeline.
6. **SOS idempotency:** same `client_id` twice gives one incident and `duplicate: true`; a second distinct SOS within 60 seconds returns the first; the SMS rows are not duplicated; no GPS is accepted.
7. **Risk ranking:** unknown factors never produce a lower rank than a known `info`; routes rank by risk then duration; weights from config change the order; overall level is `unknown` when a factor is unknown and the rest are `info`; the response contains no numeric risk field; a failing ORS returns the recorded sample.
8. **Weather:** cache hit within TTL; failure shows "unavailable" and an `unknown` factor; an expired cache entry is not served as current.
9. **Price check:** the four verdicts; a missing baseline; range always returned; `is_sample` carried through.
10. **Services and reports:** only verified services returned; admin decisions set the right fields and audit actions; a verified report is counted by `report_density` and creates no zone; a rejected report has no effect.
11. **Notifications:** `event_id` uniqueness stops duplicates; retry stops at 3 attempts; the daily cap and kill switch record `failed` rows with the reasons; mock rows carry `provider = 'mock'`.
12. **Audit:** each logged event writes the right action; the chain verifies; a manually edited row fails `verify_audit_chain()`.
13. **End to end (demo path):** sign in, 2 contacts, start trip, route rank, price check, services, geofence alert, SOS (offline simulated, then sync), acknowledge, assign, status, demo sweep, `/verify`.

---

## 15. Cut ladder reminders (from the PRD)

If behind at hour 3: (1) replace live ORS with the pre-recorded route response (6.4 step 4); (2) drop the reports flow; (3) drop the weather card. **Never cut** the SOS path, the audit chain or the demo script.

---

## 16. Removed and unused (explicitly out)

Numeric 0 to 100 safety score; ML models, Isolation Forest, trust score `[Post-MVP]`; polygon zones and PostGIS `[Post-MVP]`; approach buffer; push notifications (FCM) `[Post-MVP]`; Background Sync and service worker; silent or automatic SOS `[Post-MVP]`; responder availability counts; team chat and route-to-tourist `[Post-MVP]`; blockchain anchoring; family notification; production Aadhaar verification; automatic zone creation from reports; user-submitted prices; ratings and partner applications.

---

## 17. Related documents

[PRD.md](PRD.md) · [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) · [DATABASE_MODELS.md](DATABASE_MODELS.md) · [AUTH_REQUIREMENTS.md](AUTH_REQUIREMENTS.md) · [SECURITY.md](SECURITY.md) · `API_STRUCTURE.md` · `API_ENDPOINTS.md` · `README.md`. Next in the build order: `API_STRUCTURE.md`.
