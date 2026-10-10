# SafeWay: Product Requirements Document (PRD)

> **Version:** 1.0 · **Date:** 2026-10-10 · **Status:** Final for the 6-hour MVP
> **Team:** Minions (Mayank, Tomesh, Shivika, Yukta) · **Event:** Build With Bharat 4.0
> **Source of truth:** `context.md` plus the resolutions in Section 14 of this file. If anything conflicts, this file wins over `context.md` for the items listed in Section 14.
> **Tags:** `[MVP]` built in the 6-hour build · `[Post-MVP]` future work, one-line mention only · `[Mock]` simulated and labelled on screen.
> **Scope note:** All unused portions are removed from this PRD and from the codebase to avoid unnecessary complexity (see Section 12).

---

## 1. Product summary

**SafeWay** is an AI-assisted tourist safety and emergency assistance web app, piloted for **Manali, Himachal Pradesh**. It keeps tourists away from danger (hazard-aware routing), away from scams (fair-price checks, verified services) and connected to help (one-tap SOS with an offline SMS/call fallback).

**Pitch line:** One app that keeps tourists away from danger, away from scams, and connected to help.

**Delivery form:** a mobile-first web app (Next.js) with a web app manifest and **no service worker** in the MVP. It is foreground-only for location. It is not claimed to be fully installable or offline-capable.

### 1.1 Problems addressed

1. Unsafe roads and hazards (landslides, floods, closures, repairs) not known in advance.
2. Scams and overpricing for taxis, guides, hotels and activities.
3. Unverified guides, taxis, hotels and operators.
4. Slow emergency help and difficulty sharing location.
5. No single place for alerts, road conditions, weather and trusted services.
6. Poor network coverage in tourist areas.

### 1.2 Goals and non-goals

| Goals `[MVP]` | Non-goals |
|---|---|
| One incident moving correctly end to end: SOS, admin processing, tourist sees status, audit chain verifies | Certified emergency dispatch; contacting police or ambulance |
| Explainable, rules-based route risk ranking | Trained ML models, numeric safety scores |
| Honest UI: mocks and seeded data are labelled | Background GPS tracking, native apps |
| Works acceptably on weak networks via queue and fallback ladder | Guaranteed message delivery |

---

## 2. Users and roles

Exactly four roles: `tourist`, `guide`, `rescue`, `admin`. No family role. No `super_admin`. No `user_roles` table.

| Role | Can do | Cannot do |
|---|---|---|
| `tourist` | Manage own profile, 2 emergency contacts, trips; share location with consent; submit SOS and reports; read own incidents, alerts, status; regenerate own QR ID | Read other users' data; assign responders; alter incident history; change any role |
| `guide` | Read and update own `services` row only. **No guide UI and no partner application in MVP** | Anything else |
| `rescue` | View the incident queue and detail (latest location, permitted info); acknowledge, assign, change status, add notes; view timeline | Manage roles or zones; read unrelated tourist records |
| `admin` | Everything `rescue` can; manage hazard zones; approve services; verify reports; view audit ledger and SMS outbox; trigger the demo sweep; approve `passport_manual`; revoke IDs | Edit or delete audit ledger entries |

**Emergency contacts are data rows, not users.** They receive SMS only and never log in.

**Authorization rules**
- The role lives in the Supabase JWT `app_metadata`, set **server-side only**. Never trust a client-sent `role`, `user_id`, status or assignment ID.
- Enforce twice: FastAPI verifies the JWT on every protected route, and Postgres RLS is the second layer.
- **Role assignment in the MVP is done by a seed script using the service-role key.** There is no role-management endpoint or UI.

---

## 3. Technology (summary)

Frontend: Next.js (App Router), TypeScript strict, Tailwind, shadcn/ui, Framer Motion (transitions only). Backend: FastAPI (Python 3.11+), Pydantic v2, `/api/v1`. Data: Supabase (Postgres, Auth email+password, Storage, Realtime). Maps: Leaflet + OpenStreetMap, OpenRouteService. Weather: OpenWeather (server-side, cached). SMS: `SMS_PROVIDER=mock|msg91` (mock in MVP). Scheduling: Supabase `pg_cron` + `pg_net`, with cron-job.org as backup; GitHub Actions for the nightly dump. Deploy: Vercel (frontend), Render (backend).

Removed entirely: blockchain (Solidity, Hardhat, Polygon, web3.py, ethers.js), family features. Full stack detail and environment variables are in `context.md` Section 6 and the README.

---

## 4. MVP scope: the one story

**Login, add contacts, start the Manali trip (foreground location), see a ranked safe route with a landslide hazard, check a price, pick a verified guide, send an SOS that falls back to SMS offline, admin acknowledges and assigns, tourist sees the status, audit chain verifies.**

MVP = **P0 plus selected P1 items** (QR ID, geofencing advisories, audit verify). P2 is not built.

### 4.1 What is real, mocked and cut

| Real `[MVP]` | Mocked and labelled `[Mock]` | Cut `[Post-MVP]` |
|---|---|---|
| Supabase Auth, RLS, role in JWT `app_metadata` | **SMS:** mock provider writes to an outbox admins can see ("Mock SMS") | Service worker, app-shell and map-tile caching |
| Trips, 2 contacts, foreground location with the "Keep SafeWay open" notice | **Aadhaar:** mock verifier labelled "Sandbox/Demo" | FCM push |
| SOS with client queue, 5 s timeout, `sms:` fallback, idempotent retry | **Inactivity alert:** sweep logic is real; demo shortens the windows | PostGIS and polygon zones |
| `incidents` state machine, `incident_events`, `audit_ledger` with `/verify` | Seeded data: "sample data" | Photo AI, EXIF checks, trust score, ML outlier detection |
| Minimal admin/rescue console | | Partner application, analytics, i18n, dark mode |
| Seeded hazard zones, ORS alternatives ranked by hazard proximity | | Daily head-hash GitHub Action, Capacitor |
| Price checker, verified services, report a problem | | Medical notes, data-deletion endpoint, admin MFA, log shipping |
| Weather card (shows "unavailable" on failure) | | Tables: `price_submissions`, `device_tokens`, `weather_cache`, `responder_profiles`, `sync_log`, `user_roles`, `responder_assignments`, `incident_media` |
| QR ID with opaque revocable `public_id` | | Family features (removed) |

---

## 5. Functional requirements

Each requirement is tagged by ID for traceability. Detailed logic lives in `BUSINESS_LOGIC.md`; schema in `DATABASE_SCHEMA.md`; endpoints in `API_ENDPOINTS.md`.

### 5.1 Accounts, contacts and consent `[MVP]`

- **FR-1** Register and log in with email + password (Supabase Auth). No OTP.
- **FR-2** Profile holds name, optional phone, language, opaque `public_id`. No Aadhaar or passport numbers, no medical notes.
- **FR-3** Emergency contacts: two preferred, each with a stored `consent_at`. One contact is allowed only after the tourist acknowledges the reduced fallback. **Zero contacts blocks trip start.** Maximum two per user (DB constraint).
- **FR-4** Location consent screen and a visible stop-sharing control.

### 5.2 Trips and location `[MVP]`

- **FR-5** Create, start and end a trip. One active trip per user (partial unique index). Start requires at least one consented contact; with exactly one, the acknowledgement must be recorded.
- **FR-6** Foreground `watchPosition` during an active trip, consent-gated and rate-limited, with the notice "Keep SafeWay open for continuous location tracking".
- **FR-7** Show location accuracy and time last received. Stale locations are marked, never shown as current. Device `recorded_at` wins over server `received_at`.
- **FR-8** Location updates are kept for 7 days. The purge runs as a **plain daily `pg_cron` SQL job** (not a new scheduler and not part of the app).

### 5.3 SOS and incidents `[MVP]` (core feature)

- **FR-9** SOS is reachable in one or two taps from anywhere, with a short accidental-press countdown and cancel.
- **FR-10** The UI confirms immediately with no network wait. A client UUID (`client_id`) is the idempotency key. Coordinates, accuracy and timestamp are captured when permitted; SOS proceeds without GPS if it fails.
- **FR-11** Try `POST /api/v1/sos` with a ~5 second timeout.
  - Server confirms: UI state `submitted` with the incident reference. "Submitted" does not mean a responder has seen it.
  - Not confirmed: UI state `pending`; item stored in the IndexedDB queue and retried with backoff; the fallback ladder is offered.
- **FR-12 Fallback ladder:** prefilled `sms:` link addressed to the available, consented emergency contacts (coordinates, tourist ID `public_id`, time; Android and iOS link formats differ); one-tap calls to **112**, **100** and **108**. No control-room number is assumed unless explicitly configured and verified. After the user opens the manual SMS/call flow the UI state is `manually_sent`, meaning delivery and dashboard receipt are unconfirmed.
- **FR-13 Sync triggers (no Background Sync, no service worker):** browser `online` event, app resume (`visibilitychange`), timed retry with backoff, and a manual "Sync now" button. `navigator.onLine` is never treated as proof of connectivity.
- **FR-14** Server on success: idempotent incident insert, `incident_events` row, `audit_ledger` entry, `notifications` rows (SMS to consented contacts via the adapter, in-app for staff), Realtime push.
- **FR-15** Locked SOS categories: `medical`, `accident`, `lost_stranded`, `personal_safety`, `other`. Enforced in database enums, API models, frontend and tests.
- **FR-16** Incident lifecycle: `submitted → acknowledged → assigned → in_progress → resolved → closed`, plus `cancelled` (reporter within a short window, or admin) and `duplicate` (admin only). Transitions are validated server-side; each is one transaction (verify state, check permission, apply, write event, create notification, append audit).
- **FR-17** Offline SMS or call is the only no-data path and does **not** create a dashboard incident. Offline SOS works only if the app was already loaded when the connection dropped.
- **FR-18** UI wording: "report sent to SafeWay response team". Never "police notified".

### 5.4 Inactivity alert `[MVP]`

- **FR-19** Armed only while a trip is `active`. A heartbeat is a foreground location ping, an SOS, or a manual "I'm safe" tap.
- **FR-20** After **3 hours** without a heartbeat the server creates a persistent in-app notification (`notifications`, channel `in_app`) asking the tourist to check in. No push. It stays available when the tourist returns; it is not promised to be noticed at exactly 3 hours.
- **FR-21** After **4 hours** the consented contacts get an SMS stating there has been no check-in since a time and the last known location (omitted if none). It does not say the tourist is in danger.
- **FR-22** A check-in cancels pending alerts. Each window fires once. `inactivity_alerts.window` stores **logical names** (`nudge`, `contact_sms`), not durations, with unique `(trip_id, window)`. This keeps demo and real windows from colliding.
- **FR-23** Quiet hours are disabled by default. If enabled they suppress only the 3-hour in-app nudge, never SOS processing or the 4-hour contact SMS.
- **FR-24 Scheduler:** `POST /internal/jobs/inactivity-sweep` (secret header, `401` without it), run every 5 minutes by `pg_cron` + `pg_net`, cron-job.org as backup. No second scheduler. Real-schedule alerts can fire up to about 5 minutes late.
- **FR-25 Demo sweep:** with `DEMO_MODE=true` the same logic uses 1-minute (nudge) and 2-minute (contact SMS) windows. An **authenticated admin action** triggers it on demand through **`POST /admin/jobs/inactivity-sweep`** (admin JWT), which calls the same service function as the cron endpoint. The cron secret is never exposed to the browser. Before running the demo, stop location pings on the demo tourist so heartbeats do not keep resetting the timer.

### 5.5 Road safety `[MVP]` (demo centerpiece)

- **FR-26 Hazard zones:** seeded circles (center, `radius_m`) evaluated with haversine. Types: landslide, flood, road_closure, road_repair, wildlife, low_network, restricted. `wildlife` and `low_network` are seeded and labelled "sample data" with no claim of live tracking or measured coverage. Only admins or seed create zones. Tourists never do.
- **FR-27 Geofence advisories:** server-authoritative state machine per tourist and zone (`OUTSIDE ↔ INSIDE`, optional approach buffer). Events fire only on state change. Guard against GPS jitter (accuracy threshold, 20 to 50 m hysteresis, ignore stale fixes, respect `active`/`starts_at`/`expires_at`, suppress duplicates).
- **FR-28 Route ranking:** ORS `alternative_routes`, ranked by `risk = w1·hazard_proximity + w2·weather_severity + w3·night_factor + w4·report_density` with weights in config. Each response lists contributing factors. `report_density` counts **verified reports only**. `avoid_polygons` routes around an active zone (circles approximated as polygons). Pitch wording: "explainable rule-based scoring now, ML as reports accumulate".
- **FR-29 Advisory levels:** `info`, `caution`, `warning`, `critical`, `unknown`. No 0 to 100 score. The UI never says "safe" and never shows a number. Missing or stale data becomes `unknown`, never "low risk". Each advisory stores rule, source, input timestamp, data quality and suggested action.
- **FR-30 Weather:** server-side only, cached with TTL, shows observation time and source, labelled as external weather information. Failure shows "Weather data unavailable". It is not an official disaster warning.
- **FR-31 Price checker:** returns a **range** plus a confidence/source note, never a single number. A quote above the range shows "price seems too high". Baselines (e.g. Manali taxi ₹1,200 to ₹1,500) are labelled **"sample data"** unless a real citation exists for that row.
- **FR-32 Verified services:** only `verified` services are listed. Admin moves `pending → verified` (or `rejected`); approval is audit-logged. The seeded guide's `services.owner_id` is set.
- **FR-33 Reports:** types accident, landslide, flood, roadblock, scam, harassment. Location required, photo optional. Admin verifies each (`submitted → verified | rejected`). **Verified reports do not create zones automatically; an admin may manually create a zone from a verified report.** Reports stay separate from `incidents`.

### 5.6 Admin and rescue console `[MVP]`

- **FR-34** Incident queue and detail (description, category, severity, status, location with accuracy and timestamp, map, timeline), plus acknowledge, assign, status change and notes.
- **FR-35** Shows active `rescue` accounts and actual incident assignments only. **No "available responders" count.**
- **FR-36** Admin pages: hazard zones, services approval, report verification, audit ledger with `/verify`, SMS outbox (labelled "Mock SMS"), demo-sweep trigger.

### 5.7 Notifications `[MVP]`

- **FR-37** Generated from committed database events and persisted before delivery, with stable event IDs, bounded retry, and tracked attempts and errors. The in-app feed is the reliable history. No guaranteed-delivery claim.
- **FR-38** SMS goes only to registered, validated contact numbers. Messages use plain-text coordinates, no links. Daily SMS cap per user and a global kill switch. `SMS_PROVIDER=mock` writes to the outbox.

### 5.8 Digital ID and identity `[MVP]`

- **FR-39** QR ID uses an opaque random revocable `public_id`; regenerating revokes the old one; cached for offline. The public verification page (`/id/[public_id]`) is rate-limited and shows only consented fields (display name, tourist ID, trip status, verified badge). Private details need a `rescue` or `admin` login. A QR proves a record can be looked up, not legal identity.
- **FR-40** Identity verification is a mock verifier labelled "Sandbox/Demo". The Aadhaar number is never collected, stored or logged. Verification is optional and never blocks registration or trip creation. `passport_manual` needs admin approval. No production UIDAI integration is claimed.

### 5.9 Audit ledger `[MVP]`

- **FR-41** `append_audit_entry` (Postgres `SECURITY DEFINER` function) computes each hash under an advisory lock so the chain cannot fork. Append-only (UPDATE/DELETE blocked by trigger and RLS). No personal data in entries.
- **FR-42** Logged: SOS submitted, incident transitions and assignments, role changes, zone activation, service approval, report verification, ID revocation.
- **FR-43** `/verify` re-walks the chain and fails if any row was edited by hand. Stated honestly as **tamper-evident, not tamper-proof**. Pitch line: "Hash-chained, append-only audit ledger, designed to be anchored to a public chain later."

---

## 6. Data model summary

**MVP tables (16):** `profiles`, `emergency_contacts`, `trips`, `incidents`, `incident_events`, `hazard_zones`, `location_updates`, `safety_alerts`, `notifications`, `audit_ledger`, `idempotency_keys`, `services`, `price_baselines`, `reports`, `inactivity_alerts`, `identity_verifications`. Storage bucket: `report-media` (private, signed URLs).

SOS is a row in `incidents`. Canonical enums and columns are defined in `DATABASE_SCHEMA.md`, which is authoritative once it exists. Client-only UI states (`draft`, `pending`, `failed`, `manually_sent`) are never database statuses.

---

## 7. Non-functional requirements

| Area | Requirement |
|---|---|
| Performance | SOS confirmation shown immediately; backend timeout 5 s; ping `/health` on app load and trip start to reduce Render cold starts |
| Reliability | If weather, ORS or SMS fail, SOS and tracking still work and the UI shows "unavailable" |
| Security baseline (about 25 min) | RLS on every table; service-role key never in the browser; role only from JWT `app_metadata`; JWT verified on every FastAPI route; Pydantic validation and body-size limits; rate limits on SOS, location, login; SMS cap and kill switch; cron endpoint secret; append-only audit; CORS allowlist and security headers; secrets in env vars with secret scanning |
| Privacy | Location consent; 7-day retention; no Aadhaar/passport numbers or medical notes; demo uses synthetic accounts only; say "aligned with DPDP Act 2023 principles", never "compliant" |
| Backups | Nightly encrypted `pg_dump` (`age`) via GitHub Actions, private repo, short retention, key stored separately. Attempt one restore to a scratch database if time allows; otherwise mark restore verification **incomplete**. Never claim recovery was tested unless it was |
| Demo reliability | Warm up Render and Supabase before the demo; demo mode with local seed data; recorded backup video; test geolocation on the deployed HTTPS URL |

---

## 8. Honesty rules (UI copy, README, pitch)

- Label seeded data "sample data". Label mocks ("Mock SMS", "Sandbox/Demo"). Never present seeded activity as live tourists.
- Never claim: background tracking; police or ambulance contacted; certified dispatch; blockchain; trained ML; full DPDP compliance; production UIDAI integration; guaranteed delivery.
- Never show "safe" or a numeric score. AI is advisory and never a dependency of SOS.
- State that SafeWay is a prototype of a safety coordination system, not a certified emergency-dispatch service.
- Never imply an alert was delivered until the server confirms. Distinguish `submitted`, `pending`, `failed`, `manually_sent`.

### 8.1 Known limitations (state them)

Foreground-only location; offline SOS needs the app already loaded; SMS fallback is manual; real-time landslide data is limited to authority input, verified reports and seeded samples; free tiers sleep or pause; OSM tiles and ORS have usage limits; the ledger is tamper-evident only; price baselines are not a full market dataset.

---

## 9. Acceptance criteria

All must pass before the demo.

1. A trip cannot start with zero contacts. With one contact it starts only after the acknowledgement is recorded. Each contact has a stored consent timestamp.
2. A `guide` can read or update only their own `services` row (verified at the RLS level with a direct Supabase client call, since there is no guide UI). A tourist cannot change any role.
3. Only the five locked SOS categories are accepted by the database, API and UI.
4. The console shows no available-responder count.
5. Seeded wildlife and low-network zones, services, price baselines and incidents are labelled "sample data". The Aadhaar and SMS mocks are visibly labelled.
6. Skipping or failing identity verification never blocks registration or trip creation.
7. The offline SMS link is prefilled only for consented contacts. `manually_sent` means only that the manual SMS/call flow was opened.
8. With `DEMO_MODE`, the admin-triggered sweep (`POST /admin/jobs/inactivity-sweep`) creates the in-app nudge at about 1 minute and the contact SMS (mock outbox) at about 2 minutes, once each. A check-in cancels pending alerts. Enabling quiet hours suppresses only the nudge.
9. The README and this PRD state whether the backup restore was tested. No "recovery tested" claim without a restore.
10. Queued SOS items sync on `online`, app resume, timed retry and manual "Sync now", with no duplicate incidents (idempotency).
11. `/verify` passes on an untouched chain and fails after a manual edit to an audit row.
12. Security checks pass (Section 10).
13. Only `verified` services are visible to tourists. A quote above the baseline range shows "price seems too high".

---

## 10. Security test checklist (20-minute pass in hour 5.5)

- Tourist B cannot read Tourist A's trips or incidents, tested with two real accounts (not the service key, which bypasses RLS).
- A tourist cannot call admin endpoints or edit a role.
- An IDOR attempt on incident IDs is rejected.
- The cron endpoint without the secret returns `401`; the admin sweep endpoint without an admin JWT is rejected.
- Rate limits trigger on repeated SOS.
- A `<script>` in an incident description renders as text.
- A wrong CORS origin is blocked.
- A failed submission is never shown as a confirmed SOS. GPS denial does not block reporting. Unavailable weather is never "safe".

---

## 11. Build plan (4 people in parallel)

| Hour | Gate |
|---|---|
| 0 to 1 | Schema and seed done. FastAPI `/health` live on Render. Login works for both roles. **First Vercel deploy now** (geolocation needs HTTPS) |
| 1 to 3 | SOS works end to end and the admin processes it. This is the core |
| 3 to 4.5 | Offline ladder and idempotent retry, inactivity sweep with mock SMS, audit `/verify` page |
| 4.5 to 5.5 | Road safety: map, ranked routes, hazards, price, services, report |
| 5.5 to 6 | Final deploy and seed, one rehearsal, record backup video, add the `pg_dump` workflow, security checklist |

**Cut ladder if behind:** (1) at hour 3 replace live ORS with a pre-recorded route response, (2) drop the reports flow, (3) drop the weather card, (4) never cut the SOS path, the audit chain or the demo script. P2 is always cut first.

**Suggested ownership:** schema, RLS, auth and API contracts; tourist portal, trips, SOS, QR ID; admin console and incident workflow; maps, geofencing, weather and integration tests. One person owns integration and the deployed release. Agree on schema and API contracts before anyone builds against them.

**Before the build starts (blocking):** create the Supabase, GitHub (private), Render and Vercel projects; get ORS and OpenWeather keys. **Not blocking:** start MSG91 DLT registration (the mock provider covers the demo).

---

## 12. Removed and unused (explicitly out)

Blockchain and all chain tooling and env vars; `contracts/` folder; family role and dashboard; `user_roles`, `family_links`, `audit_logs`, `chain_records`, `sos_events`, `geofences`, `audit_events` and the Post-MVP tables listed in Section 4.1; numeric safety score; signed rotating QR; background tracking; Background Sync; service worker; FCM; PostGIS; AI Vision; analytics; i18n; dark mode; partner application; medical notes; guide UI; role-management endpoint; second scheduler; production Aadhaar integration. None of these are built or documented beyond a one-line mention.

---

## 13. Demo script (summary)

Two browser profiles (tourist and admin), synthetic accounts only.

1. Sign in, add 2 contacts, start the Manali trip.
2. Ranked routes with a landslide hazard and risk factors; weather card or "unavailable".
3. Price check: ₹1,200 to ₹1,500 range; a higher quote shows "price seems too high".
4. Verified guides only.
5. Geofence advisory from a test coordinate in a hazard zone.
6. Offline SOS: immediate confirmation, timeout, prefilled SMS and call buttons, state `manually_sent`.
7. Back online: queued SOS syncs; incident appears in the console with a reference; mock SMS in the outbox.
8. Admin acknowledges, assigns and updates status; tourist sees it live.
9. Admin triggers the demo sweep; nudge and contact SMS (mock) appear.
10. Audit page: run `/verify`; optionally show it failing after a manual edit.
11. QR ID verification page.

**Rehearse answers to:** What is live vs mocked? How is the safest route chosen? Where does hazard data come from? How are fake reports stopped? Why a hash-chained ledger instead of a blockchain? What happens with no network? How is data protected? Who verifies partners? What is the business model? Why this over Google Maps plus a booking app?

---

## 14. Decisions resolved in this PRD (override `context.md` where different)

| # | Resolution |
|---|---|
| R1 | Background Sync is removed. Sync triggers are `online`, app resume, timed backoff retry and manual "Sync now". The MVP ships a web app manifest only and does not claim full installability |
| R2 | Demo sweep endpoint is `POST /admin/jobs/inactivity-sweep` (admin JWT) calling the same service function as the cron endpoint |
| R3 | Role assignment is a seed script with the service-role key; no endpoint or UI |
| R4 | Guide access is tested at the RLS level; the seeded guide has `services.owner_id` set |
| R5 | `inactivity_alerts.window` stores logical names `nudge` and `contact_sms` |
| R6 | The 7-day location purge is a plain daily `pg_cron` SQL job |
| R7 | Verified reports feed hazards only through an admin manually creating a zone; `report_density` counts verified reports only |
| R8 | Price baselines are labelled "sample data" unless a real citation exists |
| R9 | MVP = P0 plus selected P1 (QR ID, geofencing advisories, audit verify) |
| R10 | First Vercel deploy happens in hour 0 to 1; location pings on the demo tourist are stopped before the demo sweep |

---

## 15. Related documents

`context.md` (full context) · `DATABASE_SCHEMA.md` · `DATABASE_MODELS.md` · `AUTH_REQUIREMENTS.md` · `SECURITY.md` · `BUSINESS_LOGIC.md` · `API_STRUCTURE.md` · `API_ENDPOINTS.md` · `README.md`. Each is created one at a time on request and links here instead of repeating content.
