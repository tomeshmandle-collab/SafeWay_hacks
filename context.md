# SafeWay: Complete Project Context

> **Purpose:** One self-contained file that gives any AI assistant or coding agent everything it needs to work on SafeWay without other files.
> **Version:** 1.1 · **Date:** 2026-10-10 · **Status:** Architecture and scope are FINAL. All open defaults F1–F11 are now team-confirmed (Section 3.1). No project files other than this one have been created yet.
> **How to use:** Load this whole file as context (e.g. as `AGENTS.md`, `CLAUDE.md`, a system prompt, or the first message). If anything here conflicts with an older document, **this file wins** (see Section 2).
> **Legend:** `[MVP]` = built in the 6-hour build. `[Post-MVP]` = documented as future work, not built now. `[Proposed]` = a suggestion the team has not confirmed (ask before building on it). `[Mock]` = simulated in the demo and labelled on screen.

---

## 0. Ten-line summary

1. **SafeWay** is an AI-powered tourist safety and emergency assistance web app (installable PWA), piloted for **Manali, Himachal Pradesh, India**.
2. Built by **Team Minions** (Mayank, Tomesh, Shivika, Yukta) for the **Build With Bharat 4.0** national-level hackathon (Kirori Mal College, University of Delhi).
3. The whole MVP must be built in **6 hours** by 4 people working in parallel.
4. Stack: **Next.js + TypeScript + Tailwind + shadcn/ui + Framer Motion** (frontend), **FastAPI** (backend), **Supabase** (Postgres, Auth, Storage, Realtime), **Leaflet + OpenStreetMap + OpenRouteService**, **OpenWeather**, **Vercel + Render**.
5. **Blockchain is REMOVED** (no Solidity, Hardhat, Polygon, web3.py, ethers.js). Integrity comes from a Supabase **hash-chained, append-only `audit_ledger`**.
6. **Family role is REMOVED.** Each tourist has **2 emergency contacts** who receive **SMS only** (no login).
7. Roles: `tourist`, `guide`, `rescue`, `admin`.
8. The core is **one end-to-end workflow:** SOS (with offline SMS fallback) → admin console processes it → tourist sees status → audit chain verifies. Road Safety (hazard-aware routes, price check, verified services, reports) is the demo centerpiece.
9. Tracking is **foreground-only** (PWA). Capacitor and native background GPS are future work.
10. Be **honest in the UI and pitch:** mocks are labelled, seeded data is "sample data", rules-based scoring is explainable, nothing claims police or ambulance are contacted.

---

## 1. Project identity

| Item | Value |
|---|---|
| Name | **SafeWay** |
| Full name | AI-Powered Smart Tourist Safety & Emergency Assistance System |
| Tagline | Smart Travel. Safe Journey. Secure Every Moment. (Team tagline: Travel Smart. Stay Safe.) |
| Pitch line | One app that keeps tourists away from danger, away from scams, and connected to help: hazard-aware routing, fair-price checks, verified services and one-tap SOS. |
| Team | **Minions**: Mayank, Tomesh, Shivika, Yukta (4 people) |
| College | Kirori Mal College, University of Delhi, North Delhi |
| Event | **Build With Bharat 4.0**, national-level hackathon (host: KCC Institute of Technology and Management, Greater Noida; "CodeVerse") |
| Pilot setting | Manali (Himachal Pradesh): landslides, scams and weak networks are everyday risks |
| Build window | **6 hours** for the whole MVP |
| Users | Tourists (solo/group), verified local guides, authorities (police/rescue), administrators |
| Mission line | Technology for Tourism. Safety for Every Journey. |

**Note on team names:** an older overview file lists a different team (Mayank Kumar, Sana A K, Harsh Singh, Rashi Singh). That is superseded. The team name is **Minions** and the project name is **SafeWay**.

### 1.1 The problem (six pain points from the deck)

1. **Unsafe roads and hazards:** landslides, floods, closures, accidents and repairs are not known in advance.
2. **Scams and overpricing:** overcharging for taxis, guides, hotels and adventure activities.
3. **Unverified services:** many guides, taxis, hotels and operators are unverified.
4. **Delayed emergency response:** tourists struggle to get quick help and share their location.
5. **Lack of trusted information:** no single platform offers real-time alerts, road conditions, weather and trusted services together.
6. **Low-connectivity areas:** poor network coverage makes communication difficult.

### 1.2 The solution (headline features)

| # | Feature | What it does |
|---|---|---|
| 1 | Smart Safe Route | Suggests the safest route using hazards, weather and (where available) road info; ranks alternatives by an explainable risk score |
| 2 | Live Road Condition | Alerts for closures, landslides, floods, jams, repairs, accidents ahead (from authority input, corroborated reports, seeded sample data) |
| 3 | Fair Price Checker | Shows an estimated price **range** for taxi, guide, hotel, activities, with a "price seems too high" alert |
| 4 | Verified Tourism Services | Shows only admin-verified guides, taxis, hotels, operators |
| 5 | SOS & Emergency Assistance | One tap submits an incident with location; offline fallback via prefilled SMS and call buttons; emergency contacts notified by SMS |
| 6 | Report a Problem | Users report accidents, scams, landslides, floods, roadblocks, harassment with location (and optional photo); admin verifies |

### 1.3 Example scenario (used as the demo): Trip to Manali

Safe route available → landslide ahead (live alert) → road under repair → normal taxi fare ₹1,200–₹1,500 (a higher quote triggers "price seems too high") → choose a verified guide → SOS available anytime.

---

## 2. Source documents and precedence

### 2.1 Precedence (highest wins)

1. **This file** (it records every decision confirmed in the planning chat).
2. The "Final Architecture Decisions & Project Scope" document.
3. The SafeWay Tech Stack file (stack and engineering rules).
4. The pitch deck (pitch wording only).
5. Reference only, anything conflicting loses: `system_design.md`, `user_flow.md`, the roadmap ("production-minded hackathon roadmap"), the 20-module feature list, the 20-module Architecture document, the 20-module draft text, the Project Overview, the Weak Spots and Fixes document.

### 2.2 What each older source still contributes

| Source | Still useful for | Superseded parts |
|---|---|---|
| Pitch deck (10 slides) | Problem, solution, flow, 8 modules, pitch wording, Manali scenario | Blockchain/Polygon mentions, "notify family", "ML models", "only platform", "tamper-proof" |
| Tech Stack file | Stack, frontend/backend rules, env vars, coding conventions, rules for AI agents | `SafeWayRegistry` contract, blockchain section, `family_links`, `authority` role, `price_submissions`/`device_tokens` tables (MVP) |
| Weak Spots and Fixes | Honesty rules, risk formula, report-validation ideas, demo fragility fixes, rehearsal questions | Blockchain advice, family, Aadhaar "masked" option |
| Roadmap | Incident lifecycle, security thinking, RLS and testing discipline, honest degraded states, definition of done, demo story | Next.js server routes as backend (we use FastAPI), `user_roles` table, 18–24 hour plan, optional AI/blockchain |
| `system_design.md` / `user_flow.md` | Flow diagrams, privacy rules, exception paths to test | Blockchain adapter, family dashboard, role list, table names, SOS statuses |
| 20-module feature list + Architecture doc | Feature catalogue (Section 17), data/ops ideas (zones, state machines) | Blockchain layer, family, 0–100 safety score, signed rotating QR, 5-role model, `TouristRegistry` contract |
| Project Overview | Summary of deck and extended spec | Team names, scope note (resolved in Section 5) |

### 2.3 Resolved conflicts (do not reopen)

| # | Conflict | Final resolution |
|---|---|---|
| C1 | 8-module deck scope vs 20-module spec | Tiered scope P0/P1/P2, then cut to a 6-hour MVP (Section 5) |
| C2 | Aadhaar "optional, encrypted" vs "do not collect" | **Never stored or logged.** Verification-only, optional, result kept (Section 10.10) |
| C3 | SOS: `sms:` link vs SMS gateway | **Hybrid:** MSG91 via backend when online, prefilled `sms:` link offline, plus call buttons |
| C4 | `SafeWayRegistry` vs `TouristRegistry` contract | **No blockchain.** Replaced by Supabase tables and the `audit_ledger` |
| C5 | web3.py vs ethers.js | **Void** (blockchain removed) |
| C6 | Supabase Realtime vs "real-time processing in FastAPI" | Realtime pushes changes to clients; FastAPI processes and writes. No custom WebSocket server |
| C7 | Background tracking claimed vs impossible in a PWA | Foreground-only with a "Keep SafeWay open for continuous location tracking" notice |
| C8 | Roles: tourist/guide/authority/admin vs family/rescue/super_admin | Exactly `tourist`, `guide`, `rescue`, `admin`. Authority and responder map to `rescue`. No family. No super_admin |
| C9 | Team name | Minions |
| C10 | Delivery format | Separate markdown files, no zip, created one at a time on request |
| C11 | Offline SOS promise vs physical limits | Offline SOS means SMS or phone call. It reaches the dashboard only after the server accepts a submission |
| C12 | Backend: Next.js routes (roadmap) vs FastAPI | **FastAPI is the only business backend** under `/api/v1`. Next.js handles UI and session |
| C13 | Table-name vocabularies | One canonical set (Section 9). SOS is a row in `incidents`. Zones are `hazard_zones`. Audit is `audit_ledger` |
| C14 | Three incident lifecycles | One enum (Section 10.4) |
| C15 | Three scoring schemes | One rules engine, advisory levels only, no 0–100 number (Section 10.6) |
| C16 | QR: rotating signed token vs opaque revocable ID | **Opaque random revocable `public_id`**, works offline |
| C17 | Rescue console in P1 vs needed for the SOS demo | **Minimal console is P0** (Section 5) |
| C18 | SOS vocabularies (feature list vs roadmap) | One enum (Section 9.2), locked by F3 |

---

## 3. Locked decisions (final)

| # | Decision |
|---|---|
| D1 | **Tiered scope** P0/P1/P2 approved; then cut for 6 hours (Section 5). |
| D2 | **Aadhaar is verification-only and optional.** The number is never stored or logged. Only status, provider, timestamp and a reference ID are kept. Does not block registration. Foreign tourists use `passport_manual` (admin approval). |
| D3 | **Hybrid SOS.** Online: backend with MSG91 (SMS provider adapter). Offline: prefilled `sms:` link plus phone-call buttons. Inactivity alert to the 2 emergency contacts. |
| D4 | **No blockchain.** Supabase `audit_ledger`, each entry hash-linked to the previous, append-only, written via backend/DB function only. |
| D5 | **Void:** web3.py, ethers.js, smart contracts, Polygon Amoy config, `contracts/` folder, chain env vars. |
| D6 | **FastAPI** processes; **Supabase** provides Postgres, Auth, Realtime, Storage; clients use Realtime for pushes. |
| D7 | **Foreground-only** PWA location tracking with the notice. Capacitor later for Android with native background GPS. |
| D8 | Roles: `tourist`, `guide`, `rescue`, `admin`. **No family role.** Exactly **2 emergency contacts** (consent recorded). Contacts have no login; SMS only. |
| D9 | Team Minions. Documentation delivered as separate files, one at a time. |
| D10 | Backups: **nightly encrypted `pg_dump`** to separate storage **plus** demo fallbacks (backend warm-up, recorded video, local seed data). |
| D11 | **Offline SOS** = manual SMS or phone call. It reaches the dashboard only after a successful server submission or later sync. |
| D12 | **6-hour MVP** with 4 people in parallel. This chat's decisions take precedence over every earlier file. |
| D13 | Remove all unused portions from every document and codebase to avoid unnecessary complexity. |

### 3.1 Team-confirmed decisions F1–F11 (final, do not reopen)

| # | Decision (final) |
|---|---|
| F1 | **Emergency contacts:** two contacts are the preferred setup. One contact is permitted only after the tourist explicitly acknowledges the reduced fallback. **Zero contacts blocks trip start.** Consent is stored **for each contact** (`emergency_contacts.consent_at`). |
| F2 | **Guide role:** `guide` stays in the role model. Access is limited to the guide's own permitted `services` record (RLS + API). **No guide UI and no partner application workflow in the MVP.** Roles stay in server-controlled Supabase JWT `app_metadata`; **`user_roles` is not reintroduced.** |
| F3 | **SOS categories** are locked across database enums, API models, frontend and tests: `medical`, `accident`, `lost_stranded`, `personal_safety`, `other`. |
| F4 | **Responder availability:** **no "available responders" count.** The console shows active `rescue` accounts and actual incident assignments only. |
| F5 | **Wildlife and low-network zones:** `wildlife` and `low_network` are seeded `hazard_zones` types, labelled **sample data**. No claim of live wildlife tracking or measured network coverage. |
| F6 | **Aadhaar:** a **mock verifier labelled "Sandbox/Demo"** only. Aadhaar numbers are never collected or stored. Verification is optional and does **not** block registration **or trip creation**. No production UIDAI integration. (`offline_xml` and `partner_sandbox` stay Post-MVP.) |
| F7 | **Backups:** nightly encrypted `pg_dump`, decryption key stored separately. Attempt **one restore to a scratch database if time allows**. If skipped, mark restore verification as **incomplete**. **Never claim recovery has been tested** unless it was. |
| F8 | **Offline SMS:** the prefilled `sms:` link addresses the **available, consented** emergency contacts. **No control-room number is assumed;** one is supported only if explicitly configured and verified. The separate call fallback (112/100/108) is preserved. |
| F9 | **Three-hour nudge:** a **persistent server-side in-app notification only** (a `notifications` row, channel `in_app`). FCM/push is Post-MVP. It stays available when the tourist returns to the app. We do **not** promise it is noticed at exactly three hours. |
| F10 | **Demo sweep:** the **real** inactivity-sweep logic runs with demo-only **1-minute and 2-minute** windows (`DEMO_MODE`). The sweep is triggered on demand through an **authenticated admin action** that calls the protected backend operation. The normal **five-minute schedule is kept; no second scheduler is added.** |
| F11 | **Quiet hours** are **disabled by default.** If enabled, they may suppress the three-hour in-app nudge only. They **never delay SOS processing or the four-hour emergency-contact SMS.** |

**Acceptance criteria affected by F1–F11** (each must pass before the demo):
1. A trip cannot start with zero contacts. With one contact it starts only after the acknowledgement is recorded. Each contact has a stored consent timestamp.
2. A `guide` can read or update only their own `services` row; a tourist cannot change any role.
3. Only the five locked SOS categories are accepted by the database, API and UI.
4. The console shows no available-responder count.
5. Seeded wildlife / low-network zones, services and incidents are labelled "sample data"; the Aadhaar and SMS mocks are visibly labelled ("Sandbox/Demo", "Mock SMS").
6. Skipping or failing identity verification never blocks registration or trip creation.
7. The offline SMS link is prefilled only for consented contacts; `manually_sent` means only that the user opened the manual SMS/call flow (delivery and dashboard receipt unconfirmed).
8. With `DEMO_MODE`, the admin-triggered sweep creates the in-app nudge at about 1 minute and the contact SMS (mock outbox) at about 2 minutes, once each; a check-in cancels pending alerts; enabling quiet hours suppresses only the nudge.
9. The README and PRD say whether the backup restore was tested; no "recovery tested" claim without a restore.

---

## 4. Roles and access (high level)

| Role | Can do | Cannot do |
|---|---|---|
| `tourist` | Manage own profile, 2 contacts, trips; share location with consent; submit SOS and reports; read own incidents, alerts and status; regenerate own QR ID | Read other users' data; assign responders; alter incident history; change any role |
| `guide` (F2) | Read/update own `services` row only | Anything else; no UI and no partner application workflow in MVP |
| `rescue` | View incidents in the queue; see detail incl. latest location and permitted info; acknowledge, assign, update status, add notes; view timeline | Manage admins/roles/zones; read unrelated tourist records |
| `admin` | Everything `rescue` can; manage hazard zones; approve services; verify reports; view audit ledger and SMS outbox; trigger demo sweep; approve `passport_manual`; revoke IDs | Edit or delete audit ledger entries |

**Hard rules**
- The **role is carried in the JWT `app_metadata`**, set server-side by an admin action. **Never trust a client-sent `role`, `user_id`, status or assignment ID.**
- Enforce authorization **twice**: FastAPI (verify the Supabase JWT on every protected route) and Postgres **RLS** (second layer).
- Emergency contacts are **data rows, not users.**
- The full role/RLS matrix belongs in `AUTH_REQUIREMENTS.md` (Section 18).

---

## 5. Scope

### 5.1 Priority tiers (full documented scope)

| Tier | Contents |
|---|---|
| **P0** | Road Safety (hazard zones, ranked routes), SOS, Reports, Price Checker, Verified Services, **minimal admin/rescue console** (queue, detail, acknowledge/assign/status, timeline) |
| **P1** | Digital ID + QR, geofencing advisories, full rescue dashboard (route-to-tourist, team chat), audit ledger verify |
| **P2** | Analytics dashboard, AI Vision, guest SOS, incident history polish, silent/auto SOS. (Family dashboard is removed entirely.) |

Every table, endpoint and rule in the documents carries an `MVP` or `Post-MVP` tag.

### 5.2 The 6-hour MVP: one story

**Login → add 2 contacts → start the Manali trip (foreground location) → ranked safe route with a landslide hazard → price check → verified guide → SOS that falls back to SMS offline → admin acknowledges and assigns → tourist sees the status → audit chain verifies.**

| Real `[MVP]` | Mocked and labelled on screen `[Mock]` | Cut to `[Post-MVP]` |
|---|---|---|
| Supabase Auth + basic RLS; role in JWT `app_metadata` | **SMS:** mock provider writes to an outbox the admin can see (MSG91 DLT cannot finish in 6 hours) | PWA service worker and map-tile caching |
| Trips, 2 contacts, foreground location with the "Keep SafeWay open" notice | **Aadhaar:** mock verifier labelled "Sandbox/Demo" | FCM push (in-app notifications only) |
| SOS: client queue, 5-second timeout, `sms:` fallback, idempotent retry | **Inactivity alert:** sweep is real; the demo shortens 3h/4h to 1 and 2 minutes | PostGIS and polygon zones (circle + haversine instead) |
| `incidents` state machine, `incident_events`, `audit_ledger` with `/verify` | | Photo AI, AI Vision, EXIF checks, trust score, Isolation Forest |
| Minimal admin console | | Partner application form, analytics, i18n, dark mode |
| Hazard zones (seeded), ORS alternatives ranked by hazard proximity | | Daily head-hash GitHub Action, Capacitor |
| Price checker (seeded range + "too high"), verified services (admin approves), report a problem (admin verifies) | | Family features (removed) |
| Weather card (shows "unavailable" on failure) | | Medical notes and their encryption, data-deletion endpoint, admin MFA, log shipping |
| QR ID with an opaque revocable `public_id` | | `price_submissions`, `device_tokens`, `weather_cache`, `responder_profiles`, `sync_log`, `user_roles`, `responder_assignments` tables |

### 5.3 Hour gates (4 people in parallel)

| Hour | Gate |
|---|---|
| 0–1 | Supabase schema and seed done. FastAPI `/health` live on Render. Login works for both roles. |
| 1–3 | SOS works end to end and the admin processes it. **This is the core.** |
| 3–4.5 | Offline ladder and idempotent retry, inactivity sweep + mock SMS, audit `/verify` page |
| 4.5–5.5 | Road Safety: map, ranked routes, hazards, price, services, report |
| 5.5–6 | Deploy, seed, one rehearsal, record the backup video, add the `pg_dump` workflow, 20-minute security checklist pass |

**Cut ladder if behind:** (1) at hour 3 replace live ORS routing with a pre-recorded route response, (2) drop the reports flow, (3) drop the weather card, (4) **never cut** the SOS path, the audit chain, or the demo script. P2 is always cut first.

### 5.4 Team tracks and ownership

- **Track A (core, offline reliability):** offline SOS and local storage → sync and duplicate prevention → backups and recovery → audit ledger.
- **Track B (demo centerpiece):** Road Safety, price checker, verified services, reports.
- Road Safety is the demo centerpiece but SOS is built first. If time runs short, P2 goes first.
- Suggested split (from the roadmap, adapt freely): Dev 1 schema, RLS, auth, API contracts · Dev 2 tourist portal, trips, SOS, QR ID · Dev 3 admin console, incident workflow · Dev 4 maps, geofencing, weather, integration tests. One person owns integration and the deployed release.
- Agree on schema and API contracts **before** anyone builds against them.

### 5.5 Do these now, in parallel with the docs

1. Create the Supabase project, GitHub repo (private), Render and Vercel projects.
2. Get OpenRouteService and OpenWeather keys.
3. Start **MSG91 DLT registration** (entity, sender ID, 2 templates). Longest lead time. The demo uses the mock provider meanwhile.

---

## 6. Technology stack (final)

| Layer | Technology | Notes |
|---|---|---|
| Frontend | Next.js (App Router), TypeScript (strict), Tailwind CSS, shadcn/ui, Framer Motion | Framer Motion for transitions only |
| Backend | FastAPI (Python 3.11+), Pydantic v2, Uvicorn | Only business backend; `/api/v1` |
| Database | Supabase PostgreSQL | RLS on every table. PostGIS `[Post-MVP]` |
| Auth | Supabase Auth, **email + password** | No OTP, so no OTP SMS templates needed |
| Storage | Supabase Storage | Private buckets, signed URLs (report photos optional in MVP) |
| Realtime | Supabase Realtime | Client subscriptions; FastAPI does processing and writes |
| Maps | Leaflet, OpenStreetMap tiles | `dynamic(() => import(...), { ssr: false })`; correct OSM attribution |
| Routing | OpenRouteService | `alternative_routes`; `avoid_polygons` (circles must be approximated as polygons in code) |
| Weather | OpenWeather API | Called server-side; cached; free tier current + forecast |
| SMS | MSG91 via `SMS_PROVIDER=msg91\|mock` | Mock in MVP |
| Push | Firebase Cloud Messaging `[Post-MVP]` | In-app notifications in MVP |
| Scheduling | Supabase `pg_cron` + `pg_net` (every 5 min) with cron-job.org as backup; GitHub Actions for nightly `pg_dump` | Render free tier sleeps, so no in-process scheduler |
| Deployment | Vercel (frontend), Render (backend) | Render free tier sleeps: ping `/health` |
| Proposed extras `[Proposed]` | TanStack Query, React Hook Form + Zod, `idb` (IndexedDB), pytest, Vitest/Playwright, Ruff + Black | Ask before treating as final |

**Removed from the original stack:** Solidity, Hardhat, Polygon Amoy, web3.py, ethers.js, `contracts/` folder, Amoy env vars. FCM, PostGIS, service worker, vision API, scikit-learn are Post-MVP.

### 6.1 Environment variables

**Frontend (`.env.local`, only `NEXT_PUBLIC_*` reach the browser)**
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_BASE_URL=
```

**Backend (`.env`, never commit)**
```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=          # backend only
SUPABASE_JWT_SECRET=                # or JWKS, per Supabase project configuration
ORS_API_KEY=
OPENWEATHER_API_KEY=
SMS_PROVIDER=mock                   # msg91 | mock
MSG91_AUTH_KEY=                     # when SMS_PROVIDER=msg91
MSG91_SENDER_ID=
MSG91_TEMPLATE_ID_SOS=
MSG91_TEMPLATE_ID_INACTIVITY=
CRON_SECRET=                        # header secret for /internal/jobs/*
ALLOWED_ORIGINS=                    # Vercel origin(s) only
DEMO_MODE=false                     # shortens inactivity windows
```

**GitHub Actions secrets (backup job):** database connection string, `age` public key for encrypting dumps. Keep the `age` private key somewhere else, not next to the dumps.

Commit only `.env.example` files with blank values. Turn on GitHub secret scanning/push protection.

---

## 7. Architecture

```
Browser / PWA (Next.js on Vercel)
   |  reads via Supabase JS client under RLS (profiles, trips, incidents, alerts, zones, services, ...)
   |  writes that carry business rules go to FastAPI (REST /api/v1, Supabase JWT)
   v
FastAPI (Render) ---- Supabase (Postgres, Auth, Storage, Realtime)
   |-- OpenRouteService (routes + alternatives)
   |-- OpenWeather (server-side proxy, cached)
   |-- SMS adapter (mock | MSG91)
   |-- pg_cron + pg_net -> POST /internal/jobs/inactivity-sweep (every 5 min)
GitHub Actions: nightly encrypted pg_dump
```

**Responsibilities**
- **Frontend:** UI, map, geolocation (`watchPosition` while open), IndexedDB queue for SOS/location, offline banner, calls FastAPI for rule-bearing writes, Supabase directly for RLS-protected reads and Realtime.
- **FastAPI:** SOS and incident transitions (transactional), location ingestion + geofence evaluation, risk scoring and route ranking, price check, report verification, services approval, audit ledger append and verify, inactivity sweep, SMS adapter. Verifies the JWT on every protected route.
- **Supabase:** source of truth; RLS enforces per-user access; Realtime pushes persisted changes.
- **Principle:** a real-time update is a delivery enhancement, never a second source of truth. Tourist and admin read the same incident rows.
- **Graceful degradation:** if weather, ORS or SMS fail, SOS and tracking still work, and the UI shows "unavailable" rather than a guess.

**Frontend routes (suggested):** `(public)` home, login, register, `id/[public_id]` verify · `(tourist)` dashboard, trips, map, sos, report, price, services, alerts, id, profile · `(ops)/admin` incidents, incident detail, zones, services, reports, audit, outbox · `(ops)/rescue`.

**Backend layout (suggested):** `app/main.py`, `core/` (config, security, deps), `routers/`, `services/` (logic; routers stay thin), `models/` (Pydantic), `tests/`.

**Repo layout (suggested):**
```
safeway/
  apps/web/            # Next.js
  apps/api/            # FastAPI
  supabase/migrations/ # SQL: schema, RLS, triggers, functions
  supabase/seed/       # demo seed (labelled sample data)
  .github/workflows/   # nightly pg_dump, CI
  docs/                # the documentation files
  AGENTS.md            # this file's content
```
No `contracts/` folder.

---

## 8. Source of truth for all names (canonical)

Use these exact names in every document and in code.

**Tables [MVP] (16):** `profiles`, `emergency_contacts`, `trips`, `incidents`, `incident_events`, `hazard_zones`, `location_updates`, `safety_alerts`, `notifications`, `audit_ledger`, `idempotency_keys`, `services`, `price_baselines`, `reports`, `inactivity_alerts`, `identity_verifications`.

**Tables [Post-MVP]:** `price_submissions`, `device_tokens`, `weather_cache`, `responder_profiles`, `sync_log`, `user_roles`, `responder_assignments`, `incident_media`.

**Removed entirely:** `family_links`, `audit_logs`, `chain_records`, `sos_events`/`sos_requests`, `geofences`/`zones`/`hazards`, `audit_events`.

**Roles:** `tourist`, `guide`, `rescue`, `admin`.

**Key functions/endpoints:** `append_audit_entry` (Postgres function), `/health`, `/ready`, `/verify` (audit chain walk), `/internal/jobs/inactivity-sweep`.

---

## 9. Data model

> Columns below are the proposed MVP shape. Once `DATABASE_SCHEMA.md` exists it is authoritative. All tables: RLS enabled, foreign keys, indexes on user/trip/time, `created_at` defaults. Use migrations in `supabase/migrations/`; never edit the live schema by hand.

### 9.1 Tables

| Table | Key columns | Notes |
|---|---|---|
| `profiles` | `id` (= `auth.users.id`), `full_name`, `phone` (optional), `language`, `public_id` (opaque random, unique), `public_id_revoked_at`, `location_consent_at`, `created_at` | Role is NOT editable here; it lives in server-controlled JWT `app_metadata`. No Aadhaar/passport numbers, no medical notes in MVP |
| `emergency_contacts` | `id`, `user_id`, `name`, `relationship`, `phone` (validated), `priority` (1 or 2), `consent_at` | Max 2 per user (DB constraint). Contacts get SMS only |
| `trips` | `id`, `user_id`, `destination`, `start_at`, `end_at`, `status`, `route_geojson`, `last_heartbeat_at` | Status: `planned`, `active`, `completed`, `cancelled`. **One active trip per user** (partial unique index). Start requires ≥1 consented contact; with exactly 1 the reduced-fallback acknowledgement must be recorded (F1) |
| `incidents` | `id`, `reference` (public), `reporter_id`, `trip_id`, `category`, `severity`, `status`, `description`, `lat`, `lng`, `accuracy_m`, `location_recorded_at`, `assigned_to`, `client_id`, `resolution_notes`, `created_at`, `updated_at` | **SOS is a row here.** `client_id` = idempotency key. GPS optional (report can proceed without it) |
| `incident_events` | `id`, `incident_id`, `actor_id`, `event_type`, `details` (jsonb), `created_at` | Append-only user-visible timeline. "En route" / "on site" are events inside `in_progress` |
| `hazard_zones` | `id`, `name`, `type`, `severity`, `center_lat`, `center_lng`, `radius_m`, `source`, `active`, `starts_at`, `expires_at`, `reason`, `created_by` | Circle + haversine in MVP. `source`: `authority`, `crowd`, `feed`, `seed`. Types include landslide, flood, road_closure, road_repair, wildlife, low_network, restricted. Tourists never create zones |
| `location_updates` | `id`, `user_id`, `trip_id`, `lat`, `lng`, `accuracy_m`, `speed`, `recorded_at`, `received_at`, `client_id` | `recorded_at` (device time) wins over `received_at`. Retention 7 days (purge job) |
| `safety_alerts` | `id`, `user_id`, `trip_id`, `level`, `type`, `message`, `source`, `reason`, `data_timestamp`, `created_at`, `read_at` | User-facing persistent feed. `level`: `info`, `caution`, `warning`, `critical`, `unknown`. Must show source and timestamp |
| `notifications` | `id`, `event_id` (stable, unique), `recipient_user_id` or `recipient_phone`, `channel`, `type`, `payload`, `status`, `attempts`, `last_error`, `created_at`, `sent_at` | **Delivery outbox**, persisted before delivery. `channel`: `in_app`, `sms`. Mock SMS lands here and is visible to admin |
| `audit_ledger` | `id` (sequential), `prev_hash`, `entry_hash`, `actor_id`, `action`, `entity_type`, `entity_id`, `created_at` | Hash-chained, append-only (Section 10.9). **No personal data in entries** |
| `idempotency_keys` | `key` (client UUID), `user_id`, `endpoint`, `response_ref`, `created_at` | Unique `(user_id, key)`. Used for SOS, location batches, reports |
| `services` | `id`, `kind`, `name`, `owner_id` (nullable), `status`, `contact`, `area`, `verified_by`, `verified_at` | `kind`: `guide`, `taxi`, `hotel`, `operator`. `status`: `pending`, `verified`, `rejected`. Admin approves. Seeded as sample data |
| `price_baselines` | `id`, `kind`, `route_or_item`, `min_price`, `max_price`, `source`, `updated_at` | Seeded from cited rate cards. Example: Manali taxi ₹1,200–₹1,500 |
| `reports` | `id`, `user_id`, `type`, `description`, `lat`, `lng`, `media_path` (optional), `status`, `verified_by`, `created_at` | Crowd reports kept **separate from `incidents`**. Admin verifies in MVP. `status`: `submitted`, `verified`, `rejected` |
| `inactivity_alerts` | `id`, `trip_id`, `user_id`, `window`, `fired_at`, `status`, `cancelled_at` | Unique `(trip_id, window)`. Fires once per window |
| `identity_verifications` | `id`, `user_id`, `provider`, `status`, `reference_id`, `verified_at` | **Never the Aadhaar number.** Providers: `mock`, `offline_xml`, `partner_sandbox`, `passport_manual` |

### 9.2 Enums (canonical)

- `incident_status`: `submitted → acknowledged → assigned → in_progress → resolved → closed`, plus `cancelled`, `duplicate`
- `incident_category` (locked, F3): `medical`, `accident`, `lost_stranded`, `personal_safety`, `other`
- `severity`: `low`, `medium`, `high`, `critical`
- `trip_status`: `planned`, `active`, `completed`, `cancelled`
- `advisory_level`: `info`, `caution`, `warning`, `critical`, `unknown`
- `service_kind`: `guide`, `taxi`, `hotel`, `operator` · `service_status`: `pending`, `verified`, `rejected`
- `report_status`: `submitted`, `verified`, `rejected`
- `hazard_source`: `authority`, `crowd`, `feed`, `seed`
- `identity_provider`: `mock`, `offline_xml`, `partner_sandbox`, `passport_manual`
- `notification_channel`: `in_app`, `sms` · `notification_status`: `pending`, `sent`, `failed`
- Client-only UI states (never database statuses): `draft`, `pending`, `failed`, `manually_sent`

### 9.3 Storage buckets
`report-media` (authenticated upload, restricted read, signed URLs, type and size limits, filenames not trusted). Documents/vision buckets are Post-MVP.

### 9.4 Seed data (all labelled "sample data" in the UI)
- 2 demo tourists, 1 rescue, 1 admin, 1 guide (synthetic accounts only)
- Manali–Kullu hazard zones: a landslide-prone stretch, a road-under-repair stretch, wildlife and low-network areas
- `price_baselines` for popular Manali taxi routes (cited source), a few guide/hotel prices
- A few verified `services` and one pending
- A few fictional historical incidents, clearly marked as seeded

---

## 10. Business logic and rules

### 10.1 SOS flow `[MVP]` (most important feature)

SOS is a **stateful workflow**, not a button that inserts a row.

1. Reachable in one or two taps from anywhere. Short accidental-press countdown with cancel.
2. UI shows confirmation immediately, with **no network wait.**
3. Generate a client UUID (`client_id`/idempotency key). Capture coordinates + accuracy + timestamp if permission is granted; the report proceeds without GPS if it fails.
4. Try `POST /api/v1/sos` with a **~5 second timeout.**
5. **If the server confirms:** state `submitted`; show the incident reference. A database write means "submitted", **not** "a responder has seen it".
6. **If it cannot be confirmed:** state `pending`; store in the IndexedDB queue; keep retrying in the background with backoff; offer the fallback ladder:
   - Prefilled `sms:` link addressed to the available, consented emergency contacts (F8; no control-room number unless explicitly configured and verified), with coordinates, tourist ID (`public_id`) and time (Android and iOS use different link formats). The user must tap Send. After this, UI state is `manually_sent`, which means delivery and dashboard receipt are **not** confirmed.
   - One-tap call buttons: **112**, plus **100** (police) and **108** (ambulance) from the deck.
7. Server on success: insert incident (idempotent), write an `incident_events` row, append an `audit_ledger` entry, create `notifications` rows (SMS to the consented contacts via the adapter, in-app for staff), push via Realtime.
8. Sync triggers: browser `online` event, app resume, Background Sync where supported, plus a manual "Sync now" button (iOS support is limited). Never imply delivery until the server confirms.
9. Cold-start protection: the app pings `/health` on load and trip start; the 5-minute sweep doubles as keep-alive. If cold starts persist in testing, move the SOS insert into a Postgres function called through Supabase.
10. `navigator.onLine` is unreliable. Never treat it as proof of connectivity.
11. Offline SMS/call is the **only** truly no-data path. It does **not** create a dashboard incident.

### 10.2 Offline architecture

| Layer | Content | Status |
|---|---|---|
| 1. On-device | IndexedDB queues (SOS, location points, reports) with client UUIDs; cached emergency contacts, QR ID, nearby hazard zones; offline banner with queued-item count | Queues `[MVP]`; service worker app-shell + tile caching `[Post-MVP]` |
| 2. Offline SOS | Ladder in 10.1 | `[MVP]` |
| 3. Sync | Idempotent batch endpoints; server is source of truth; device `recorded_at` wins for location; rejected reports show "rejected", not lost | `[MVP]` basic |
| 4. Server backup/recovery | Section 13 | `[MVP]` dump + demo fallbacks |

**Honest limit of the MVP cut:** because the service worker is Post-MVP, offline SOS works only if the app is **already open and loaded** when the connection drops. A cold offline reload will not open the app.

### 10.3 Inactivity alert `[MVP]`

- Armed **only while a trip is `active`**.
- **Heartbeat** = foreground location ping, an SOS, or a manual "I'm safe" tap.
- **3 hours** without heartbeat: the server creates a **persistent in-app notification** (`notifications`, channel `in_app`) asking the tourist to check in (F9). No push in the MVP (FCM is Post-MVP). It stays available when the tourist returns to the app; we do not promise it is seen at exactly 3 hours.
- **4 hours:** the consented emergency contacts get an SMS: "no check-in since [time], last known location [coords]" (coordinates omitted if none exist). It **does not say the tourist is in danger.**
- A check-in cancels pending alerts. Each window fires **once** (unique `(trip_id, window)`).
- **Quiet hours** are **disabled by default** (F11). If a tourist enables them, they may suppress **only the 3-hour in-app nudge**. They **never delay SOS processing or the 4-hour contact SMS.**
- Missing heartbeats are **missed check-ins, not proof of an emergency.** Foreground-only PWAs stop sending heartbeats when pocketed, so the rule is conservative and the copy is neutral.
- **Scheduler:** `POST /internal/jobs/inactivity-sweep` (secret header), run **every 5 minutes** by `pg_cron` + `pg_net` (cron-job.org as backup). **No second scheduler is added** (F10). Because the sweep runs every 5 minutes, real-schedule alerts can fire up to about 5 minutes after their window.
- **Demo (F10):** with `DEMO_MODE`, the same sweep logic uses 1-minute and 2-minute windows. An **authenticated admin action** in the console triggers the sweep on demand by calling a protected backend operation (admin JWT required; the cron secret is never exposed to the browser).
- Needs backend connectivity; a browser-only app cannot detect its own offline status or send alerts by itself.

### 10.4 Incident lifecycle `[MVP]`

`submitted → acknowledged → assigned → in_progress → resolved → closed`, plus `cancelled` and `duplicate`.
- Server-side validated transitions only. Clients never write status directly.
- Each transition is **one transaction**: verify current state → check actor permission → apply change → insert `incident_events` → create the notification record → append `audit_ledger`. If any step fails, nothing is partially applied.
- Reassignment keeps the previous assignment in the event history. Assignment is recorded via `incidents.assigned_to` plus an event.
- `cancelled`: by the reporter within a short window, or by admin. `duplicate`: admin only.
- The console shows active `rescue` accounts and actual incident assignments only; **no "available responders" count** (F4).
- Console actions: queue, detail (description, category, severity, status, location + accuracy + timestamp + map, timeline, actions), acknowledge, assign, status, notes.
- Wording: UI says "report sent to SafeWay response team", **never** "police notified".

### 10.5 Location and geofencing `[MVP]` (simple)

- Foreground `watchPosition`; send updates during an active trip at a sensible interval, rate-limited and consent-gated. Show location availability, accuracy, and **time last received**; mark stale locations explicitly (never show as current).
- Server-authoritative evaluation on every update: circle zones with **haversine** distance (`radius_m`). PostGIS/polygons are Post-MVP.
- State machine per tourist and zone: `OUTSIDE ↔ INSIDE` with an optional "approach" buffer. **Events fire only on state change.**
- Guard against GPS jitter: require acceptable accuracy; hysteresis buffer (about 20–50 m) or repeated consistent observations; ignore stale fixes; respect zone `active`, `starts_at`/`expires_at`, `source`; suppress duplicate alerts for an unchanged condition.
- Only admins (or seed) create and activate zones. Crowd reports become a zone only through admin verification.
- Offline: nearby zones cached on device for local warnings `[Post-MVP service worker; in-memory/IndexedDB cache while open]`.

### 10.6 Risk and advisory engine `[MVP]`

- **One rules engine. No 0–100 score. The UI never says "safe" and never shows a number.**
- Route ranking only (formula, weights in config, every response lists contributing factors):
  `risk = w1·hazard_proximity + w2·weather_severity + w3·night_factor + w4·report_density`
- Pitch it as "explainable rule-based scoring now, ML as reports accumulate". Do not claim a trained model.
- Advisory levels: `info`, `caution`, `warning`, `critical`, plus **`unknown`** when data is missing or stale. Missing data is **never** converted to "low risk" or "safe".
- Every advisory stores: rule, source, input timestamp, data quality, suggested action. Deduplicate repeated alerts.
- Messages: weather failure → "Weather data unavailable". Stale location → "Location needs updating".
- Routes: ORS `/v2/directions/{profile}` with `alternative_routes`; rank candidates by the formula; `avoid_polygons` to route around an active zone (approximate circles as polygons). Cut-ladder fallback: a pre-recorded route response.

### 10.7 Weather `[MVP]`
Server-side only (never expose the key). Cache with TTL. Show observation/forecast time and source, labelled as external weather information. Handle timeouts, missing responses, quota errors. A weather API is **not** an official disaster-warning system. Official feeds (NDMA SACHET CAP, IMD) are "planned integration" unless verified usable.

### 10.8 Price checker, verified services, reports `[MVP]`

- **Price checker:** return a **range and a confidence/source note, never a single number.** Baselines are seeded from cited rate cards. A quote above the range triggers "price seems too high". User-submitted prices and the Isolation Forest outlier detector are Post-MVP.
- **Verified services:** only `verified` services are shown. Admin approves `pending → verified`; approval is recorded in the audit ledger. Ratings, partner application form with document upload: Post-MVP. Pitch: verification can be run with tourism departments or taxi unions with annual renewal.
- **Reports:** types include accident, landslide, flood, roadblock, scam, harassment. Location required (within a reasonable distance of the reporter in future validation), optional photo. In MVP an **admin verifies** each report; verified reports can feed hazard data. Post-MVP: 500 m GPS check, EXIF time/location check, per-user trust score, public alert only after N independent reports (e.g. 3 in 30 minutes) or one authority confirmation, report rate-limits, photo classification via a hosted vision API with a fixed prompt (never claim a custom-trained model).

### 10.9 Audit ledger `[MVP]`

- `append_audit_entry` (a single Postgres `SECURITY DEFINER` function) computes each hash under an **advisory lock** so the chain cannot fork. `entry_hash` covers `prev_hash` plus the entry fields.
- **Append-only:** UPDATE/DELETE blocked by trigger and RLS.
- `/verify` re-walks the chain and fails if a row was edited by hand.
- Logged: SOS submitted, incident transitions and assignments, role changes, zone activation, service approval, report verification, ID revocation. **No personal data in entries.**
- `incident_events` = user-visible timeline. `audit_ledger` = hashes of key transitions.
- **Honest statement:** tamper-**evident**, not tamper-**proof**. Anyone controlling the database could rebuild the whole chain. Pitch line: **"Hash-chained, append-only audit ledger, designed to be anchored to a public chain later."** The daily head-hash GitHub Action (outside timestamp) is Post-MVP.

### 10.10 Identity, QR ID and Aadhaar

- **QR ID `[MVP]`:** opaque random revocable `public_id`. Regenerating it revokes the old one. Works offline (cached). The public verification page shows only information the tourist consented to (e.g. display name, tourist ID, trip status, verified badge; exact fields defined in `AUTH_REQUIREMENTS.md`). Private details need a `rescue` or `admin` login. A QR proves a record can be looked up, **not** the bearer's legal identity. Public endpoint is rate-limited and limited in disclosure. No signed rotating token.
- **Identity verification:** `IdentityVerifier` interface with `mock` `[MVP, labelled "Sandbox/Demo"]`, `offline_xml` `[Post-MVP]` (tourist uploads Aadhaar offline XML; backend verifies UIDAI's signature, keeps only the result, discards the file), `partner_sandbox` (only if credentials obtained via an AUA/KUA partner), `passport_manual` (foreign tourists, admin approval). Optional, never blocks registration or trip creation (F6). **Direct UIDAI sandbox access is not assumed.** No production UIDAI integration is claimed.

### 10.11 Notifications and SMS `[MVP]`

- Generate from **committed** database events. **Persist before delivery.** Stable event IDs to prevent duplicates. Bounded retry. Track attempts and errors. The in-app feed is the reliable history. Do not assume a notification was read; do not promise guaranteed delivery.
- Priorities `info`/`warning`/`critical`; dedup with cooldown.
- **SMS adapter** `SMS_PROVIDER=msg91|mock`. MSG91 delivery in India needs DLT registration: entity, sender ID, **2 approved templates** (SOS, inactivity) and the template ID sent with each message; a mismatch means silent blocking. Messages use **plain-text coordinates, no links**. SMS goes **only to registered contacts** with validated numbers. **Daily SMS cap per user and a global kill switch.**
- Mock mode writes to the outbox and is labelled as mock in the admin UI.

### 10.12 Privacy and consent

- Location consent screen and a visible stop-sharing control. Contact-consent tick (the contact agreed to receive alerts).
- Minimal data: no Aadhaar/passport numbers, no medical notes in MVP. Medical info is Post-MVP, optional, app-level encrypted, visible to responders only during an active SOS.
- Location retention **7 days**, purged by a job. SMS bodies minimal.
- Say **"aligned with DPDP Act 2023 principles"**, never "compliant". Digital ID is trip-scoped and consent-based and complements Aadhaar; it does not replace it.
- Demo uses **synthetic accounts only**; no real tourists' live locations.

---

## 11. API conventions and proposed endpoints

> The final list lives in `API_ENDPOINTS.md`. This is the intended MVP shape.

**Conventions:** base `/api/v1`; JSON; `Authorization: Bearer <Supabase JWT>`; Pydantic v2 validation; error format `{ "error": { "code", "message", "details" } }` with no stack traces; pagination with `limit` + `cursor`; `Idempotency-Key` header on SOS, location batches, reports; rate-limit headers; CORS allowlist; request body size limits; security headers.

| Area | Endpoints (proposed) | Roles |
|---|---|---|
| Health | `GET /health`, `GET /ready` | public |
| Me | `GET /me`, `PATCH /me` | any |
| Trips | `POST /trips`, `POST /trips/{id}/start`, `POST /trips/{id}/end`, `PATCH /trips/{id}` | tourist |
| Location | `POST /location/batch` (idempotent), `POST /checkins` ("I'm safe") | tourist |
| SOS / incidents | `POST /sos` (idempotent), `POST /sos/{id}/cancel`, `GET /incidents`, `GET /incidents/{id}`, `POST /incidents/{id}/acknowledge`, `POST /incidents/{id}/assign`, `POST /incidents/{id}/status` | tourist (own), rescue/admin (ops) |
| Routes and risk | `POST /routes/rank` (ORS + hazards), `GET /weather?lat&lng` | tourist |
| Zones | `GET /zones`, `POST/PATCH /admin/zones` | any (read), admin (write) |
| Price | `POST /price/check` | tourist |
| Services | `GET /services`, `PATCH /admin/services/{id}/verify` | any, admin |
| Reports | `POST /reports`, `PATCH /admin/reports/{id}/verify` | tourist, admin |
| QR / identity | `POST /me/qr/regenerate`, `GET /id/{public_id}/verify` (public, rate-limited), `POST /identity/verify` (mock) | tourist, public |
| Audit | `GET /audit/verify`, `GET /admin/audit` | admin |
| Internal | `POST /internal/jobs/inactivity-sweep` (secret header; `401` without it) | scheduler |

**Realtime channels:** `incidents` (tourist sees own; staff per role), `safety_alerts` and `notifications` (target user). No custom WebSocket server.

**Frontend reads directly from Supabase under RLS** for profiles, trips, own incidents, alerts, zones, services. FastAPI handles only writes that carry business rules (SOS, status transitions, audit, sweep, price, risk). This roughly halves the API surface.

---

## 12. Security

### 12.1 MVP baseline (about 25 minutes of the 6 hours) `[MVP]`
1. RLS on every table; the service-role key never reaches the browser.
2. Role from JWT `app_metadata` only, never client-supplied.
3. JWT verified on every FastAPI route.
4. Pydantic validation and body size limits.
5. Rate limits on SOS, location and login; SOS cooldown.
6. SMS daily cap and global kill switch.
7. Cron endpoint protected by a secret header.
8. Audit ledger append-only.
9. CORS allowlist and security headers (incl. CSP).
10. Secrets in env vars, `.env.example`, secret scanning on.

### 12.2 Post-MVP
App-level encryption of medical notes, data-deletion endpoint, admin MFA, daily head-hash checkpoint, log shipping, Dependabot-style supply-chain automation (still run `npm audit` / `pip-audit` once).

### 12.3 Threat table (summary)

| Threat | Control |
|---|---|
| Fake/spam SOS | Rate limits, cooldown, account verification, admin triage |
| Role escalation | Role only in server-set `app_metadata`; RLS; never client-supplied |
| IDOR on incident IDs | RLS + server ownership checks |
| Location leaks | RLS, scoped Realtime, consent, 7-day retention |
| SMS pumping/cost abuse | Daily cap, global kill switch, contacts-only recipients, number validation |
| QR enumeration | Opaque random `public_id`, rate-limited public endpoint, limited disclosure |
| GPS spoofing | Accuracy checks, stale-fix rejection (more Post-MVP) |
| Report poisoning | Admin verification (trust score Post-MVP) |
| Cron endpoint abuse | Secret header, `401` otherwise |
| Audit rewrite | Append-only trigger + RLS, advisory-locked function, `/verify` |
| Key leaks | Env vars only, scanning, rotation list |
| XSS / upload abuse | Escape output, CSP, private buckets, signed URLs, type/size limits |

### 12.4 Security test checklist (20-minute pass in hour 5.5)
- Tourist B cannot read Tourist A's trips or incidents, tested with **two real accounts, not the service key** (the service key bypasses RLS).
- A tourist cannot call admin endpoints or edit a role.
- An IDOR attempt on incident IDs is rejected.
- The cron endpoint without the secret returns `401`.
- Rate limits trigger on repeated SOS.
- A `<script>` in an incident description renders as text.
- A wrong CORS origin is blocked.
- `/verify` fails if an audit row is edited by hand.
- Also: failed submission is never shown as a confirmed SOS; duplicate submissions are handled; GPS denial does not block reporting; unavailable weather is never "safe".

### 12.5 Key-leak response
Rotate the Supabase key, revoke sessions, rotate the MSG91 key, re-run the secret scan.

### 12.6 Demo security
Synthetic accounts only; seed labelled; `/internal/*` never public; rotate demo credentials after the event.

---

## 13. Backup, recovery and demo reliability

- **Nightly `pg_dump`**, encrypted with `age`, run as a scheduled **GitHub Actions** job, stored as an artifact in a **private** repo with **short retention**; the decryption key is kept **separately** from the dump. `[MVP]`
- Supabase's own backups on the free tier are limited, so the dump is the main protection.
- **Restore drill (F7):** attempt one restore to a scratch database if time allows and check `/verify` still passes. If skipped, mark restore verification as **incomplete**. **Never claim recovery has been tested** unless it was.
- Media bucket copies `[Post-MVP]`.
- **`/health`** (liveness) and **`/ready`** (DB and dependencies); uptime pinger; pre-demo warm-up of Render and Supabase (free projects pause when inactive).
- **Demo mode** toggle: runs a scripted Manali trip from seeded local data when the network or backend is down. Seed data is always labelled "sample data".
- **Recorded backup video** of the full flow.
- Test geolocation on the **deployed HTTPS URL**, not only localhost. FCM web push on iOS works only for an installed PWA (Post-MVP).

---

## 14. Demo script (unified)

Use two browser profiles (tourist and admin). Seeded items are labelled.

1. **Sign in** as a tourist; add 2 emergency contacts (consent); **start the Manali trip** (shows "Keep SafeWay open for continuous location tracking").
2. **Safe route:** ranked alternatives with a **landslide** hazard and risk factors; weather card (or "unavailable").
3. **Price check:** taxi shows ₹1,200–₹1,500 with source; a higher quote shows "price seems too high".
4. **Verified guide:** only verified services listed.
5. **Geofence advisory:** a test coordinate enters a hazard zone → alert with rule, source, timestamp.
6. **Offline SOS:** go offline → SOS shows confirmation immediately → timeout → prefilled SMS and call buttons; state shows `manually_sent`, not delivered.
7. **Back online:** the queued SOS syncs; the incident appears in the admin console with a unique reference (the mock SMS to the 2 contacts appears in the outbox).
8. **Process:** admin acknowledges, assigns, updates status; tourist sees the updated status and timeline in real time.
9. **Inactivity alert:** demo-shortened windows fire the nudge and the contacts' SMS (mock outbox).
10. **Audit:** open the audit page and run `/verify`; show it fails after a manual edit (optional demonstration).
11. Show the QR ID verification page (opaque ID, consented info only).

The strongest demo is **one incident moving correctly through the entire system**, not a dashboard full of numbers.

**Rehearse answers to:** What is live vs mocked? How does the AI choose the safest route? Where does hazard data come from? How do you stop fake reports? Why a hash-chained ledger, not a blockchain? What happens with no network? How is location/medical data protected? Who verifies partners? What is the business model? Why use this over Google Maps + a booking app?

---

## 15. Honesty rules (UI copy, README, pitch)

- Label seeded data **"sample data."** Label mocks (SMS as "Mock SMS", Aadhaar as "Sandbox/Demo"). Do not claim live wildlife tracking or measured network coverage. Never present seeded or recorded activity as live tourists.
- **Never claim:** background/continuous tracking; police or ambulance are contacted; SOS is certified dispatch; production blockchain; trained ML (it is rule-based and explainable); full DPDP "compliance"; production UIDAI integration; guaranteed delivery.
- Never show "safe" or a 0–100 score. Use advisory levels and "unknown".
- Show confidence for any AI output; AI is advisory and never a dependency of SOS.
- State: not a certified emergency-dispatch service; prototype of a safety coordination system.
- Never imply an alert was delivered until the server confirms; distinguish `submitted`, `pending`, `failed`, `manually_sent`.

### 15.1 Known limitations (state them)
Web apps cannot track reliably in the background (foreground-only PWA; Capacitor is future work). Without a service worker (Post-MVP), offline SOS needs the app already loaded. SMS fallback is manual. Real-time landslide/closure data is limited (authority input, corroborated reports, seeded samples, official feeds if usable). Free tiers sleep or pause. OSM tiles and ORS have usage policies and rate limits. The ledger is tamper-evident only. Price baselines are seeded from cited rate cards, not a full market dataset.

---

## 16. Coding and process rules for AI agents

1. **Follow this stack and these decisions.** Do not introduce new frameworks, ORMs, state libraries, clouds, or blockchain without asking.
2. **Never hardcode secrets;** use env vars and `.env.example`. Never put the service-role key in frontend code.
3. **Always enforce authorization on the backend;** do not rely on UI hiding. Write RLS with every new table, and **test with real user accounts**, not the service key.
4. **No personal data in the audit ledger.** Never store or log Aadhaar numbers.
5. Keep **SOS fast and simple:** minimal taps, no blocking network call before the user sees confirmation, works offline via the fallback ladder.
6. **Explainable only:** every score or advisory needs a recorded rule, source, and timestamp.
7. **Small, reviewable changes;** explain trade-offs when several approaches exist.
8. TypeScript strict, ESLint + Prettier, named exports, small components. Python type hints, Ruff + Black, thin routers with logic in `services/`. Schema only via migrations. Unit-test risk scoring, geofence state machine, status transitions, price range, and RLS; one end-to-end test for the demo path.
9. **Remove all unused code, tables, endpoints and documentation sections.** Do not build or document anything tagged `Post-MVP` beyond a short mention. Complexity is the main risk in a 6-hour build.
10. If something is marked `[Proposed]` or is unclear, ask before building on it.
11. Keep documents **consistent** (same canonical names) and **non-repetitive** (link instead of repeating).

---

## 17. Original 20-module feature catalogue (for reference, mapped to tiers)

| # | Module | Status |
|---|---|---|
| 1 | Home | `[MVP]` login/register, start trip, emergency numbers, language selection Post-MVP |
| 2 | Tourist registration | `[MVP]` name, email, contacts; Aadhaar/passport optional via verifier; photo and medical Post-MVP |
| 3 | Digital Tourist ID + QR | `[MVP]` opaque revocable `public_id` (blockchain removed) |
| 4 | Trip planner | `[MVP]` destination, dates, safe route, weather |
| 5 | Live location | `[MVP]` foreground only; battery-aware/background Post-MVP |
| 6 | Geo-fencing | `[MVP]` circle zones + advisory; polygons/dynamic zones Post-MVP |
| 7 | AI Safety Engine | `[MVP]` rules-based advisories; no numeric score |
| 8 | SOS Center | `[MVP]` hybrid SOS; silent/auto SOS Post-MVP |
| 9 | Incident reporting | `[MVP]` simplified as `reports` + SOS categories; voice/video/AI classify Post-MVP |
| 10 | AI Vision | `[Post-MVP]` |
| 11 | Weather and disaster alerts | `[MVP]` card with failure state; official feeds planned |
| 12 | Emergency services nearby | `[Post-MVP]` (call buttons 112/100/108 are MVP) |
| 13 | Family dashboard | **Removed** (emergency contacts get SMS) |
| 14 | Smart notifications | `[MVP]` in-app + SMS outbox; FCM Post-MVP |
| 15 | Incident history | `[MVP]` basic own-records list |
| 16 | Admin dashboard | `[MVP]` minimal console (queue, detail, actions, zones, services, reports, audit) |
| 17 | Rescue dashboard | `[MVP]` same console, `rescue` role; route-to-tourist/chat Post-MVP |
| 18 | Blockchain module | **Removed** → `audit_ledger` |
| 19 | Analytics dashboard | `[Post-MVP]` |
| 20 | Settings | `[MVP]` consent, contacts, logout; dark mode/i18n Post-MVP |

**Deck's 8 modules:** Home · Trip Planner · Road Safety · Tourist Safety (unsafe-area, night-travel, wildlife, low-network alerts, seeded as `wildlife` / `low_network` zone types, labelled sample data, F5) · Price Checker · Verified Services · Emergency · Report Problem.

---

## 18. Documentation plan (deliverables)

Create **one file at a time, only when the team asks.** Markdown, meant to be loaded into coding agents (e.g. Antigravity). Every item tagged `MVP` or `Post-MVP`. Each file links to the others instead of repeating content. State explicitly in the PRD and README that all unused portions are removed to avoid unnecessary complexity. Do not load the older files (`system_design.md`, `user_flow.md`, the roadmap, the 20-module docs) next to these.

| # | File | Contents |
|---|---|---|
| 0 | `context.md` | This file (done) |
| 1 | `PRD.md` | Final product requirements, MVP scope, acceptance criteria, explicit "removed/unused" list |
| 2 | `DATABASE_SCHEMA.md` | SQL: tables, enums, indexes, RLS, append-only trigger, `append_audit_entry`, buckets, seed guidance, backup/retention |
| 3 | `DATABASE_MODELS.md` | Pydantic v2 models and matching TypeScript types, ER overview |
| 4 | `AUTH_REQUIREMENTS.md` | Supabase Auth flow, JWT verification, role matrix, RLS vs API table, QR ID rules, consent |
| 5 | `SECURITY.md` | Threat model, secrets, hardening, rate limits, privacy, ledger security, offline/client security, backups, test checklist, MVP vs Post-MVP |
| 6 | `BUSINESS_LOGIC.md` | SOS ladder, incident state machine, inactivity rules, geofence logic, risk formula, price/service/report rules, notifications, SMS caps, audit hashing |
| 7 | `API_STRUCTURE.md` | Base URL/versioning, layout, conventions, errors, pagination, idempotency, rate limits, CORS, JWT dependency flow, Realtime channels |
| 8 | `API_ENDPOINTS.md` | Full endpoint list: method, path, role, tier, request, response, notes |
| 9 | `README.md` | What SafeWay is, locked decisions, features by priority, stack, repo layout, setup, env vars, run/deploy, demo mode, offline and recovery table, limitations, team Minions |

**Build order:** schema → models → auth → security → business logic → API structure → endpoints → README (PRD requested first).
**Boundary:** Auth doc = who can do what. Security doc = how the system is protected. Cross-reference, do not repeat.
**Cross-references:** `DATABASE_SCHEMA` carries the append-only trigger and RLS; `BUSINESS_LOGIC` carries SMS caps and SOS cooldown; `API_STRUCTURE` carries rate-limit headers.

---

## 19. Pitch and slide edits still needed (do not affect the build)

- **Tech stack slide:** remove the Blockchain card (Polygon Amoy, Solidity, Hardhat). **Feasibility slide:** "tamper-proof records (Polygon)" → "Hash-chained, append-only audit ledger, designed to be anchored to a public chain later." **References slide:** remove Polygon/Hardhat/Solidity. **Poster:** same.
- Replace "notify family" with "notify emergency contacts" (solution, flow, architecture/emergency module, competitor table "One-tap SOS + family notify").
- Soften "ML models", "continuous learning", "fair-price prediction using historical data": say rule-based and explainable now, ML as data accumulates.
- Soften "Only platform combining…" to "combines four capabilities that today live in separate apps"; validate the competitor table against real apps and drop the "to be validated" footnote.
- Add a **sustainability slide:** free for tourists; partner listing and subscription fees for verified operators; tourism-board licensing for dashboards; anonymised risk analytics for authorities.
- Add an answer to "why not just Aadhaar?" (trip-scoped, consent-based, complements Aadhaar) and propose a **pilot with one district's tourism office.**
- Remove "real-time processing" from the backend slide (Supabase Realtime handles pushes).

---

## 20. Open items and external blockers

| Item | Owner | Blocking? |
|---|---|---|
| **MSG91 DLT registration** (entity, sender ID, 2 templates) | Team | No. Mock provider covers the demo |
| **Aadhaar route** (`offline_xml` later vs partner sandbox) | Team | No. Mock only in MVP |
| ~~Confirm defaults F1–F11~~ | Team | **Resolved**: confirmed in Section 3.1 |
| ~~Control-room number~~ / ~~quiet-hours default~~ | Team | **Resolved** by F8 (none assumed) and F11 (disabled by default) |
| Poster file (not reviewed; only affects slide edits) | Team | No |
| Create Supabase, GitHub, Render, Vercel projects; get ORS and OpenWeather keys | Team | Yes, before the build starts |

**Assumptions:** 4 people working in parallel (the deck lists 4 members). If fewer, the cut ladder starts earlier. Per the roadmap, fictional users and synthetic incident records only.

---

## 21. Glossary

- **SOS:** an `incidents` row created through the hybrid workflow.
- **Heartbeat:** foreground location ping, SOS, or manual "I'm safe".
- **Sweep:** the scheduled job that detects missed check-ins.
- **Idempotency key:** client-generated UUID so retries never create duplicates.
- **Audit ledger:** hash-chained, append-only table of key transitions.
- **Hazard zone:** an admin/seed-defined circle with severity, source and validity window.
- **Advisory level:** `info` / `caution` / `warning` / `critical` / `unknown`.
- **RLS:** Postgres Row Level Security.
- **DLT:** India's SMS template and sender registration platform required by MSG91.
- **PWA:** installable web app; here foreground-only for location.
- **Capacitor:** future native wrapper for Android background GPS.
- **Sample data:** seeded demo content, always labelled.

---

*End of context. If a question isn't answered here, ask the team before inventing an answer.*
