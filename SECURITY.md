# SafeWay: Security

> **Version:** 1.0 · **Date:** 2026-10-10 · **Status:** Final for the 6-hour MVP
> **Team:** Minions · **Depends on:** [PRD.md](PRD.md), [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md), [AUTH_REQUIREMENTS.md](AUTH_REQUIREMENTS.md)
> **Boundary:** This file covers **how the system is protected**. Who can do what is in `AUTH_REQUIREMENTS.md`; table-level RLS and triggers are in `DATABASE_SCHEMA.md`. They are linked, not repeated.
> **Tags:** `[MVP]` built now · `[Post-MVP]` one-line mention only · `[Proposed default]` a value the team has not confirmed, change freely.
> **Scope note:** The MVP security budget is about 25 minutes of the 6 hours. Unused controls are removed (Section 14).

---

## 1. Security goals

1. A tourist's location, contacts and incidents are readable only by that tourist and authorized staff.
2. No one can gain a role or a record they are not entitled to.
3. SOS cannot be silenced, faked in bulk or made to cost money without limit.
4. Incident history cannot be silently edited (tamper-evident, not tamper-proof).
5. No secret or personal data leaks through code, logs, backups or the browser.
6. The prototype never claims protections it does not have (Section 12).

---

## 2. Threat model (summary)

| Threat | Control | Where |
|---|---|---|
| Fake or spam SOS | Rate limit and cooldown, authenticated accounts only, admin triage | 5, `BUSINESS_LOGIC.md` |
| Role escalation | Role only in server-set `app_metadata`; never read from `user_metadata` or the body | `AUTH_REQUIREMENTS.md` 3 |
| IDOR on incident, trip, report IDs | RLS plus FastAPI ownership checks; `404` for foreign records | `AUTH_REQUIREMENTS.md` 3, 9 |
| Location leak | RLS, consent, 7-day retention, scoped Realtime, no location in logs | 6, 8 |
| SMS pumping and cost abuse | Daily per-user cap, global kill switch, contacts-only recipients, validated numbers, max 2 contacts | 5.2 |
| QR ID enumeration | Opaque random 128-bit `public_id`, rate limit, identical response for all invalid IDs, limited fields | 5, `AUTH_REQUIREMENTS.md` 6.2 |
| GPS spoofing | Accuracy limit, stale-fix rejection, server-side geofence evaluation (stronger checks Post-MVP) | `BUSINESS_LOGIC.md` |
| Report poisoning | Admin verifies every report; only verified reports count in routing | PRD FR-28, FR-33 |
| Cron or admin-job abuse | Secret header (`401` otherwise); admin JWT for the demo trigger | 4.3 |
| Audit rewrite | Append-only trigger, revoked privileges, advisory-locked function, `/verify` | 9 |
| Secret leak | Env vars only, secret scanning, rotation list | 3 |
| XSS | Output escaping, CSP, no HTML injection into the DOM or map popups | 7 |
| Malicious upload | Type and size limits, server-generated file names, private bucket, signed URLs | 7.2 |
| Stolen or shared device | Local data minimised; cached personal data cleared on logout | 8 |
| Dependency compromise | One-time `npm audit` and `pip-audit`, lockfiles | 10 |
| Demo-day exposure | Synthetic accounts, credentials rotated after the event | 13 |

---

## 3. Secrets management `[MVP]`

### 3.1 Inventory

| Secret | Lives in | Never in |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Render env | Frontend, repo, logs, Vercel |
| `SUPABASE_JWT_SECRET` (or JWKS) | Render env | Frontend, repo |
| `CRON_SECRET` | Render env and Supabase Vault (`cron_secret`) | Repo, `0009_cron.sql`, browser |
| `ORS_API_KEY`, `OPENWEATHER_API_KEY` | Render env | Frontend (called server-side only) |
| `MSG91_AUTH_KEY` and template IDs | Render env (only when `SMS_PROVIDER=msg91`) | Repo |
| Database connection string | GitHub Actions secret (backup job) | Repo |
| `age` private key | A password manager or separate storage, **not** beside the dumps | Repo, Actions |
| `age` public key | GitHub Actions secret | n/a (public is fine) |
| Demo account passwords | Seed script env | Repo, slides |

Only `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `NEXT_PUBLIC_API_BASE_URL` reach the browser. The anon key is public by design; RLS protects the data.

### 3.2 Rules

- Commit only `.env.example` files with blank values. Add `.env*` (except `.env.example`) to `.gitignore`.
- Turn on GitHub secret scanning and push protection on the private repo before the first commit.
- Render and Vercel environment variables are set in their dashboards, not in files.
- A secret that appears in chat, a screenshot, a commit or a log is treated as leaked and rotated.

### 3.3 Key-leak response

1. Rotate the Supabase service-role key and JWT secret (this invalidates sessions).
2. Revoke all user sessions.
3. Rotate `CRON_SECRET` (Render and Vault), the MSG91 key, and the ORS and OpenWeather keys.
4. Re-run the secret scan on the repo and its history.
5. Record in the audit-adjacent notes what leaked and when; do not claim "no impact" without checking the Supabase logs.

---

## 4. Transport, API and browser hardening `[MVP]`

### 4.1 Transport and CORS

- HTTPS only (Vercel and Render provide it). Geolocation requires HTTPS, so test on the deployed URL.
- CORS allowlist from `ALLOWED_ORIGINS` (the Vercel origin or origins only). No `*`. Credentials not required because auth is a bearer header.
- The backend rejects requests whose `Host` is not the expected host `[Proposed default]`.

### 4.2 Request handling

- Pydantic v2 validation on every body, with `extra="forbid"` ([DATABASE_MODELS.md](DATABASE_MODELS.md) 1.1).
- Body size limit: **1 MB** per request; `POST /location/batch` at most 100 points; report photos go straight to Storage, not through the API `[Proposed default]`.
- Error format `{ "error": { "code", "message", "details" } }`. No stack traces, SQL errors or internal paths in responses. Unhandled exceptions return a generic `500` with a request id; details go to server logs only.
- Parameterised queries only. No string-built SQL anywhere.
- `Idempotency-Key` is scoped per user; keys cannot be used to read another user's response.

### 4.3 Protected internal and admin jobs

- `POST /internal/jobs/inactivity-sweep`: requires header `X-Cron-Secret`; compare with a constant-time function; `401` otherwise; not listed in public docs.
- `POST /admin/jobs/inactivity-sweep`: admin JWT only. It calls the same service function. The cron secret never reaches the browser.
- `/internal/*` is not exposed through the Vercel app and is never linked from the UI.
- Both job endpoints are safe to call repeatedly (each window fires once per inactivity period).

### 4.4 Security headers

Frontend (`next.config` headers) and backend responses:

| Header | Value |
|---|---|
| `Content-Security-Policy` | `default-src 'self'`; `script-src 'self'`; `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`; `font-src 'self' https://fonts.gstatic.com`; `img-src 'self' data: https://*.tile.openstreetmap.org https://*.supabase.co`; `connect-src 'self' https://*.supabase.co wss://*.supabase.co <BACKEND_URL>`; `frame-ancestors 'none'` `[Proposed default, adjust to the final map and font choices]` |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `geolocation=(self), camera=(), microphone=()` |
| `X-Frame-Options` | `DENY` |

Next.js may need `'unsafe-inline'` for scripts in development only. If the CSP breaks the map or fonts in testing, relax only the specific directive, and note the exception.

---

## 5. Rate limits, cooldowns and abuse caps `[MVP]`

Limits are enforced in FastAPI with an in-process limiter (for example `slowapi`, `[Proposed]`), keyed by user id for authenticated routes and by IP for public ones. With a single Render instance this is sufficient for the demo; counters reset on restart. Every limited response is `429` with a `Retry-After` header and rate-limit headers.

### 5.1 Limits `[Proposed defaults, tune before the demo]`

| Endpoint or action | Limit | Notes |
|---|---|---|
| `POST /sos` | 5 per 10 min per user; **cooldown: a second SOS within 60 s of a successful one returns the existing incident reference** (no new row, no new SMS) | Idempotent retries of the same `client_id` are never counted against the limit |
| `POST /location/batch` | 30 per min per user | Max 100 points per batch |
| `POST /checkins` | 10 per min per user | |
| `POST /reports` | 10 per hour per user | |
| `POST /routes/rank` | 20 per min per user | Protects ORS free quota |
| `GET /weather` | 20 per min per user | Cached server-side |
| `POST /price/check` | 30 per min per user | |
| `GET /id/{public_id}/verify` (public) | 30 per min per IP | Uniform `{ "valid": false }` for every invalid ID |
| Login (Supabase Auth) | Supabase's built-in limits, plus a short client-side backoff after repeated failures | |
| Admin actions | 120 per min per user | Catches runaway scripts |

A rate limit never blocks the offline SOS ladder (SMS and call buttons are on the device). A user who hits the SOS limit is told their report is already received if a recent SOS exists.

### 5.2 SMS abuse controls

- Recipients are **only** the user's own stored emergency contacts, validated against E.164 at the database. Maximum 2 contacts per user.
- **Daily cap:** at most 10 SMS per tourist per day `[Proposed default]`, counted from `notifications` by `subject_user_id`. When the cap is hit, further SMS are recorded as `failed` with `last_error = "daily cap"` and shown in the admin outbox.
- **Global kill switch:** environment variable `SMS_ENABLED` (default `true`; `false` stops all outbound SMS and records them as `failed`, "kill switch"). Add `SMS_ENABLED` to the backend `.env.example` and README. Changing it needs a Render redeploy or restart.
- `SMS_PROVIDER=mock` is the MVP default; real sends need MSG91 and its DLT template IDs.
- Message bodies are plain text with coordinates and no links, which also avoids phishing-style content.

---

## 6. Privacy and personal data `[MVP]`

| Data | Handling |
|---|---|
| Location | Consent-gated, 7-day retention (`safeway-daily-purge`), RLS own-only, never logged, shown to staff only inside an incident |
| Emergency contact numbers | Stored with per-contact consent; used only for SOS and inactivity SMS; not shown to staff; E.164 validated |
| Phone and name | Profile only; staff see them only for a reporter during an incident |
| Identity | No Aadhaar number, passport number or document is collected, stored or logged. Only provider, status, reference id and time are kept (mock verifier) |
| Medical notes | Not collected `[Post-MVP]` |
| Photos (reports) | Optional, private bucket, signed URLs |
| Audit ledger | Ids and fixed action names only; **no personal data** |
| Backups | Contain personal data, so they are encrypted (Section 11) |

Wording: SafeWay is "aligned with DPDP Act 2023 principles" (consent, purpose limitation, minimisation, retention). It is **never** called "compliant". A data-deletion endpoint is `[Post-MVP]`.

**Logging rules**
- Log: request id, method, route, status, duration, authenticated user id, error code.
- Never log: tokens, passwords, service-role key, phone numbers, coordinates, request bodies, SMS text, or anything Aadhaar-like.
- Phone numbers in the admin outbox are shown only to admins, and the mock label is always visible.

---

## 7. Client and content security `[MVP]`

### 7.1 XSS and injection

- Render all user content (descriptions, names, report text, notes) as text. No `dangerouslySetInnerHTML`. Leaflet popups are built with text nodes, not HTML strings from user input.
- A `<script>` in an incident description must display as literal text (test in Section 12).
- Validate and length-limit every free-text field (matches the database CHECKs).

### 7.2 Uploads (report photos)

- Bucket `report-media` is private; allowed types `image/jpeg`, `image/png`, `image/webp`; **5 MB** limit (set in `DATABASE_SCHEMA.md`).
- The path is `<user_id>/<server-generated-uuid>.<ext>`. The original file name is never used.
- Photos are shown through signed URLs with a short expiry (about 5 minutes `[Proposed default]`).
- Photo AI, EXIF checks and virus scanning are `[Post-MVP]`. Photos are untrusted, and an admin reviews them before any report is verified.

### 7.3 Realtime

Supabase Realtime applies RLS to what each client receives. Only the four published tables are exposed. Subscribe with the user's JWT, never the service-role key, and never subscribe a client to a table that carries other users' rows without RLS.

---

## 8. Offline and on-device security `[MVP]`

The SOS queue and cached data live in IndexedDB, which is readable by anyone with access to the unlocked device and by any script running on the page (hence the CSP).

| Item | Rule |
|---|---|
| Stored on device | Unsent SOS queue, unsent location points and reports, cached emergency contacts (for the offline SMS link), cached `public_id`, nearby hazard zones |
| Minimise | Remove each queued item as soon as the server confirms it. Cap queued location points (for example the latest 200) |
| Logout | Clear cached contacts, QR ID, zones and profile. **Keep unsent SOS queue items**, warn "1 unsent SOS: it will send after you sign in again", and ask for confirmation |
| Account switch | Queue items are tagged with the user id. A different user never sees or sends another user's queue |
| Token storage | Use the Supabase client default session storage. Never put tokens in `localStorage` keys the app creates itself, in URLs, or in logs |
| `sms:` fallback | Built on the device from cached contacts. The body contains coordinates, tourist ID and time only |
| Never claim | That a manual SMS was delivered, or that the dashboard received it |

---

## 9. Audit ledger security `[MVP]`

Implemented in `DATABASE_SCHEMA.md` Section 8. The security properties and limits:

- **Append-only:** triggers block UPDATE, DELETE and TRUNCATE; INSERT, UPDATE, DELETE and TRUNCATE privileges are revoked from `anon`, `authenticated` and `service_role`.
- **Single writer function:** `append_audit_entry` is `SECURITY DEFINER`, executable only by `service_role`, and takes an advisory lock so the chain cannot fork.
- **Content:** ids and a fixed list of action names (CHECK constraint). No free text, so no personal data.
- **Verification:** `verify_audit_chain()` recomputes every hash. `/verify` fails if any row was edited.
- **Honest limits:** tamper-**evident**, not tamper-**proof**. Anyone controlling the database (or using the `postgres` role to disable a trigger) can rebuild the chain; deleting the newest entries is not detectable until the `[Post-MVP]` daily head-hash checkpoint exists. Do not call it blockchain or tamper-proof.
- **Access:** admin read only. Nobody can edit or delete entries through the app.

---

## 10. Dependencies and supply chain `[MVP]`

- Commit lockfiles (`package-lock.json`, `requirements.txt` with pinned versions or a lock file).
- Run `npm audit` and `pip-audit` once before the demo and fix or note high-severity findings.
- Add no new framework, ORM, state library, cloud or blockchain tooling without asking (project rule).
- Automated dependency updates `[Post-MVP]`.

---

## 11. Backup and recovery security `[MVP]`

- Nightly `pg_dump` via GitHub Actions, encrypted with `age` using the **public** key in the workflow. The dump is stored as an Actions artifact in the **private** repo with **short retention (7 days)** `[Proposed default]`, matching the 7-day location retention.
- The `age` **private** key is stored separately (password manager or another account), never in the repo or next to the dumps.
- The database connection string is a GitHub Actions secret. Use a read-only database role for the dump if one can be created in time `[Proposed]`.
- Restore drill (F7): attempt one restore to a scratch database if time allows, then run `verify_audit_chain()`. If skipped, mark restore verification **incomplete**. **Never claim recovery was tested unless it was.**
- Supabase's own free-tier backups are limited; do not rely on them.

---

## 12. Honesty and claims (security-relevant)

Never claim: tamper-proof records or blockchain; DPDP "compliance"; production UIDAI integration; that police or ambulance are contacted; guaranteed delivery; background tracking; that location is "secure" without qualification. Always label mocks ("Mock SMS", "Sandbox/Demo") and seeded data ("sample data"). State that SafeWay is a prototype of a safety coordination system, not a certified emergency-dispatch service. Known limits are in PRD 8.1.

---

## 13. Demo and event security `[MVP]`

- Use **synthetic accounts only**. No real tourists' live locations or real phone numbers. Contact numbers in the demo are team-owned or clearly fake test numbers.
- Seed data is labelled "sample data".
- `/internal/*` is never shown on screen or in slides.
- Share the deployed URL, not the repo or `.env` files. Do not show the Supabase dashboard or Render environment page while screen sharing.
- Rotate the demo passwords, the cron secret and the service-role key after the event, and remove or reset demo data.

---

## 14. Security test checklist (20-minute pass, hour 5.5)

Auth and RLS tests are in `AUTH_REQUIREMENTS.md` 11 and `DATABASE_SCHEMA.md` 10 and must also pass. Run those with **two real accounts, not the service-role key**. Additional checks here:

1. Repeated SOS: the sixth in 10 minutes returns `429`; a retry of the same `client_id` returns the existing incident without a `429`; a second distinct SOS within 60 seconds returns the existing reference and creates no new SMS row.
2. Repeated public QR lookups beyond 30 per minute return `429`; unknown, revoked and regenerated IDs return the identical body.
3. SMS: the eleventh SMS for one tourist in a day is recorded as `failed` ("daily cap"); with `SMS_ENABLED=false` no SMS is sent and each is recorded as `failed` ("kill switch").
4. A `<script>` and an `<img onerror=...>` in an incident description, report text and a note render as plain text in the console and tourist app.
5. A request from a wrong CORS origin is blocked; a request with a body over 1 MB is rejected.
6. A forced server error returns the generic error envelope with no stack trace.
7. Logs from a full demo run contain no tokens, phone numbers or coordinates (search for a test phone number and a test coordinate).
8. The built frontend bundle contains no service-role key, JWT secret or `CRON_SECRET` (search the `.next` output).
9. An uploaded file with the wrong type or over 5 MB is refused; a signed photo URL stops working after expiry.
10. Logout clears cached contacts and QR; an unsent SOS stays in the queue and is not visible to a different user who signs in on the same device.
11. `/verify` returns `ok = true` on the untouched chain and `ok = false` after the tamper demo.
12. Secret scanning is on and a test commit of a fake key is blocked or flagged.
13. Response headers on the deployed frontend and API include the headers in 4.4.
14. A failed submission is never shown as a confirmed SOS, GPS denial does not block reporting, and unavailable weather is never shown as "safe".

---

## 15. MVP baseline vs Post-MVP

**MVP baseline (about 25 minutes):** RLS on every table; service-role key server-only; role from JWT `app_metadata` only; JWT verified on every FastAPI route; Pydantic validation and body limits; rate limits on SOS, location and login; SMS daily cap and kill switch; cron endpoint secret; append-only audit; CORS allowlist and security headers; env-var secrets with scanning.

**Post-MVP (one line each):** app-level encryption of medical notes; data-deletion endpoint; admin MFA; daily head-hash checkpoint; log shipping and alerting; automated dependency updates; photo scanning and EXIF checks; distributed rate limiting; penetration test.

---

## 16. Related documents

[PRD.md](PRD.md) · [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) · [DATABASE_MODELS.md](DATABASE_MODELS.md) · [AUTH_REQUIREMENTS.md](AUTH_REQUIREMENTS.md) · `BUSINESS_LOGIC.md` · `API_STRUCTURE.md` · `API_ENDPOINTS.md` · `README.md`. Next in the build order: `BUSINESS_LOGIC.md`.
