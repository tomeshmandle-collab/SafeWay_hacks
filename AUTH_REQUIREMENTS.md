# SafeWay: Auth Requirements

> **Version:** 1.0 · **Date:** 2026-10-10 · **Status:** Final for the 6-hour MVP
> **Team:** Minions · **Depends on:** [PRD.md](PRD.md), [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md), [DATABASE_MODELS.md](DATABASE_MODELS.md)
> **Boundary:** This file defines **who can do what**. How the system is protected (secrets, rate limits, hardening) is in `SECURITY.md`. Neither repeats the other.
> **Tags:** `[MVP]` built now · `[Post-MVP]` one-line mention only.
> **Scope note:** Only MVP auth is described. Unused portions (OTP, MFA, user_roles table, family access, partner portal) are removed (Section 12).

---

## 1. Decisions

| # | Decision |
|---|---|
| A1 | Supabase Auth, **email + password**. No OTP, no social login, no magic links `[MVP]` |
| A2 | Four roles: `tourist`, `guide`, `rescue`, `admin`. No family role, no `super_admin`, no `user_roles` table |
| A3 | The role is stored **only** in the JWT `app_metadata.role`, set server-side. A user with no role is a `tourist` |
| A4 | Self-registration always creates a `tourist`. There is no way to register as any other role |
| A5 | Role assignment in the MVP is a **seed script** using the service-role key. No endpoint, no UI (PRD R3) |
| A6 | Authorization is enforced **twice**: FastAPI (every protected route) and Postgres RLS |
| A7 | Emergency contacts are data rows with no login. They receive SMS only |
| A8 | For the hackathon, **email confirmation is turned off** in the Supabase project settings, so demo sign-up needs no SMTP. Seeded accounts are created already confirmed. Turn confirmation back on for anything public `[Proposed default, confirm]` |
| A9 | Roles are never read from `user_metadata` (the user can edit it) or from the top-level JWT `role` claim (that is the Postgres role `authenticated`, not the app role) |

---

## 2. Registration and login flow

1. **Register** (browser, Supabase JS): email, password, `full_name` in `user_metadata`. A database trigger creates the `profiles` row. No role is set, so the user is a `tourist`.
2. **Login** (browser, Supabase JS): returns an access token (JWT) and a refresh token. The access token is sent to FastAPI as `Authorization: Bearer <token>`.
3. **Onboarding gate (tourist):** the app requires, in order, a location-consent screen, then emergency contacts, before a trip can start (PRD FR-3, FR-4, FR-5). Registration itself never requires contacts, location consent or identity verification.
4. **Identity verification** is optional (mock "Sandbox/Demo"). Skipping or failing it never blocks registration or trip creation (F6).
5. **Logout:** Supabase sign-out clears the session. The in-memory SOS queue in IndexedDB is **kept** so a pending SOS is not lost, but it only syncs again after login.
6. **Refresh:** the Supabase client refreshes tokens automatically. A role change applies at the next token refresh or login. After a role change the seed script revokes the user's sessions so the new role takes effect immediately.

Password rules: Supabase minimum length of 8, plus a leaked-password check if the project plan offers it.

---

## 3. JWT verification in FastAPI

Every protected route uses one dependency, `get_current_user`, which:

1. Reads the bearer token. Missing or malformed gives `401`.
2. Verifies the signature with the project's JWT secret (`SUPABASE_JWT_SECRET`) or its JWKS, whichever the Supabase project is configured for.
3. Checks `exp` (not expired), `aud == "authenticated"` and `iss` equal to the project's Supabase auth URL. Any failure gives `401`.
4. Extracts `sub` as `user_id` and `app_metadata.role` as the role. If the role is missing, the role is `tourist`. If it is not one of the four allowed values, the request is rejected with `403`.
5. Returns `CurrentUser(id, role)`. **Nothing from the request body or headers can set the user id or role.**

Role guards are separate dependencies: `require_role("tourist")`, `require_role("rescue", "admin")`, `require_role("admin")`. Routers declare the guard; business logic in `services/` additionally checks ownership (for example, a tourist's incident belongs to them).

**Service-role key:** FastAPI uses it for database writes, which bypass RLS, so the guard plus ownership checks in FastAPI are the **only** protection on those paths. The key is never in the frontend or logs.

**Error behavior:** no token or invalid token gives `401`. Valid token, insufficient role gives `403`. Valid role, wrong owner gives `404` (does not reveal that the record exists).

---

## 4. Role matrix (actions)

`own` = records belonging to the signed-in user. `-` = not allowed.

| Action | tourist | guide | rescue | admin |
|---|---|---|---|---|
| Register, log in, edit own profile | yes | yes | yes | yes |
| Manage own emergency contacts | yes | - | - | - |
| Give or withdraw location consent | yes | - | - | - |
| Create, start, end own trips; send location; check in | yes | - | - | - |
| Submit SOS; cancel own SOS (Section 5) | yes | - | - | - |
| Read own incidents, timeline, alerts, notifications | yes | - | - | - |
| Read all incidents and timelines | - | - | yes | yes |
| Acknowledge, assign, change status, add notes | - | - | yes (rules in Section 5) | yes |
| Mark an incident `duplicate` | - | - | - | yes |
| Submit a report | yes | - | - | - |
| Verify or reject a report | - | - | - | yes |
| Read active hazard zones | yes | yes | yes | yes |
| Create, edit, activate or deactivate zones | - | - | - | yes |
| Rank routes, check price, read weather | yes | - | - | - |
| Read verified services | yes | yes | yes | yes |
| Update own services row (`name`, `contact`, `area`) | - | yes | - | - |
| Approve or reject services | - | - | - | yes |
| Run mock identity verification for self | yes | - | - | - |
| Approve `passport_manual` | - | - | - | yes |
| Regenerate own QR ID | yes | - | - | - |
| Revoke any user's QR ID | - | - | - | yes |
| Read audit ledger; run `/verify` | - | - | - | yes |
| View SMS outbox (labelled "Mock SMS") | - | - | - | yes |
| Trigger the demo sweep (`POST /admin/jobs/inactivity-sweep`) | - | - | - | yes |
| Change any role | - | - | - | - (seed script only) |
| Edit or delete audit entries | - | - | - | - (nobody) |

`guide` has no UI and no API endpoint in the MVP. Its only access is the RLS-permitted direct update of its own `services` row (F2).

---

## 5. Incident permissions (who may do which transition)

The database validates that a transition is legal (`DATABASE_SCHEMA.md`). FastAPI validates that **this actor** may perform it.

| Transition or action | Allowed actor | Extra condition |
|---|---|---|
| Submit (create) | tourist | Own account; idempotent on `client_id` |
| `submitted → acknowledged` | rescue, admin | None |
| `acknowledged → assigned` | rescue, admin | `assignee_id` must be an active `rescue` or `admin` account |
| Reassign (stays `assigned`) | rescue, admin | Previous assignment stays in the event history |
| `assigned → in_progress`, `in_progress → resolved` | assigned rescue, or admin | A rescue can only change status on incidents **assigned to them** |
| `resolved → closed` | assigned rescue, or admin | |
| Add note, "en route", "on site" | assigned rescue, or admin | Internal notes are hidden from the tourist timeline |
| `→ cancelled` | the reporter, or admin | Reporter only within **5 minutes** of submission and only while status is `submitted`, `acknowledged` or `assigned` `[Proposed default, confirm]`. Config value `SOS_CANCEL_WINDOW_S=300` |
| `→ duplicate` | admin | From `submitted`, `acknowledged` or `assigned` |

"Active rescue account" means a user whose `app_metadata.role` is `rescue` (or `admin`). The console lists them by reading the Supabase Admin API. There is **no "available responders" count** (F4). It shows rescue accounts and real assignments only.

**Wording guarantee:** a successful submit means "report sent to SafeWay response team". It never says police or ambulance were notified.

---

## 6. What each party can see

### 6.1 Staff view of a reporter during an incident

Staff reach tourist data only through FastAPI (S17), which returns only the fields below.

| Field | rescue | admin |
|---|---|---|
| Incident: category, severity, status, description, location, accuracy, timestamp, timeline | yes | yes |
| Reporter `full_name`, `public_id` (tourist ID), phone | yes, for incidents they can read | yes |
| Emergency contact names and numbers | no | no |
| Trip route, other trips, location history | no | no |
| Other tourists' records | no | no (admin sees tourists only through incidents, reports and the audit page) |

Emergency contact numbers are used by the system to send SMS and by the tourist's own device for the offline SMS link. Staff do not read them. `[Proposed default, confirm]`

### 6.2 Public QR verification page

`GET /id/{public_id}/verify` is public and rate-limited. It returns **only** these fields, and only if the ID exists and is not revoked:

- display name (`full_name`)
- tourist ID (`public_id`)
- trip status (`planned`, `active`, `completed`, `cancelled`, or none)
- identity-verified badge (true or false, never any document detail)

An unknown, regenerated or revoked ID returns the same response: `{ "valid": false }` with no other fields. The page never shows phone, location, contacts, route or incident data. Private details need a `rescue` or `admin` login. The QR proves that a record can be looked up. It does **not** prove the bearer's legal identity, and the page says so.

---

## 7. QR ID rules

- `public_id` is an opaque random 32-character hex string (from a random UUID). It carries no user data and is not derived from any user field.
- **Regenerate:** the tourist's old ID stops working immediately and a new one is created. `public_id_revoked_at` is cleared.
- **Revoke:** an admin sets `public_id_revoked_at` with no replacement. The ID returns `valid: false`. The action is audit-logged (`id_revoked`). The tourist can then regenerate to get a working ID again.
- The ID is cached on the device for offline display. After regeneration or revocation, an old cached QR may still be shown offline but will fail verification once checked online.
- No signed or rotating tokens. Revocation, rate limiting and limited disclosure are the controls.
- The ID card screen shows the tourist exactly what the public page will reveal before they share it.

---

## 8. Consent rules

| Consent | How it is captured | Effect if missing |
|---|---|---|
| Location sharing | Consent screen sets `profiles.location_consent_at` (server-stamped). A visible stop-sharing control clears it | No location is sent or stored. Trip start is still possible, but tracking and geofence advisories are off and the UI says so |
| Emergency contact | Tick box "this person agreed to receive alerts". The row's `consent_at` is stamped by the database on insert and reset when the phone number changes. Clients cannot send it | A contact row cannot exist without consent. Zero contacts blocks trip start. One contact needs the reduced-fallback acknowledgement (F1) |
| Reduced fallback | Trip start request `reduced_fallback_acknowledged: true`, stored as `trips.reduced_fallback_ack_at` | Trip with exactly one contact cannot start |
| Public QR fields | The four fixed fields in 6.2. Revoking or regenerating is always available to the tourist | n/a |

Quiet hours are off by default (F11). Enabling them is the tourist's own setting and affects only the 3-hour in-app nudge.

---

## 9. Where authorization is enforced (RLS vs API)

| Check | FastAPI | RLS (database) |
|---|---|---|
| JWT valid, role allowed for the route | yes | role helpers read the same JWT claim |
| Ownership (tourist reads only own rows) | yes | yes |
| Staff reads all incidents | yes | yes (`is_staff()`) |
| Admin-only tables (audit, outbox) | yes | yes (`is_admin()`) |
| Incident transition legality | yes | trigger (legal transitions only) |
| Who may perform a transition | **yes (only here)** | no |
| Rescue limited to assigned incidents for status changes | **yes (only here)** | no |
| Guide updates only own services row, only 3 columns | n/a (no endpoint) | yes (policy plus column grants) |
| Staff access to tourist profile or location detail | **yes (only here)** | no (staff have no RLS access to those tables) |
| Trip-start contact rules | yes | trigger |
| Audit append-only | n/a | trigger, privileges |

Anything marked "only here" has no database backstop, so it needs a test (Section 11).

---

## 10. Service accounts and internal callers

| Caller | Credential | Allowed |
|---|---|---|
| Browser | User JWT plus the public anon key | Reads and direct writes allowed by RLS |
| FastAPI | Service-role key (server env only) | All database operations. Must apply Sections 3 to 5 itself |
| `pg_cron` / cron-job.org | `X-Cron-Secret` header equal to `CRON_SECRET` | Only `POST /internal/jobs/inactivity-sweep`. Missing or wrong secret gives `401` |
| Admin console | Admin JWT | `POST /admin/jobs/inactivity-sweep`, which calls the same service function. The cron secret is never sent to the browser |
| Seed script | Service-role key, run by the team | Creates users with roles, calls `append_audit_entry` for `role_changed` |

---

## 11. Auth test checklist (two real accounts, not the service key)

1. A request with no token, an expired token, a wrong-audience token and a tampered token all return `401`.
2. A token with `user_metadata.role = "admin"` set by the user does **not** grant admin access (A9).
3. A tourist calling an admin or rescue endpoint returns `403`. A guide calling any endpoint other than public ones and `/me` returns `403`.
4. Tourist B requesting Tourist A's incident id gets `404` from the API and zero rows from a direct Supabase query.
5. A rescue user cannot change the status of an incident assigned to a different rescue user. An admin can.
6. A rescue user cannot mark `duplicate`. A tourist cannot cancel after 5 minutes or after `in_progress`.
7. A tourist cannot cancel another tourist's SOS.
8. Assigning an incident to a tourist account is rejected.
9. Staff incident detail contains reporter name, tourist ID and phone, and does **not** contain contact numbers, trip route or location history.
10. The public QR endpoint returns identical `{ "valid": false }` for unknown, regenerated and revoked IDs, and never returns phone or location.
11. A guide can update `name`, `contact`, `area` on their own services row via a direct Supabase client call, and cannot update `status`, `owner_id` or another row (no guide UI exists).
12. `/internal/jobs/inactivity-sweep` returns `401` without the secret. `/admin/jobs/inactivity-sweep` returns `403` for non-admin and `401` without a token.
13. After the seed script changes a user's role and revokes sessions, the old token no longer works.
14. Registering with a request body containing `role` has no effect (the account is a `tourist`).

---

## 12. Removed and unused (explicitly out)

OTP and phone login; social login; MFA for admins `[Post-MVP]`; `user_roles` table; `super_admin`; family role and links; `authority` as a separate role (authority and responder map to `rescue`); role-management endpoint or UI; guide UI and partner application `[Post-MVP]`; signed or rotating QR tokens; per-user permission editing; Aadhaar, passport and medical data access rules (the data is not collected).

---

## 13. Related documents

[PRD.md](PRD.md) · [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) · [DATABASE_MODELS.md](DATABASE_MODELS.md) · `SECURITY.md` · `BUSINESS_LOGIC.md` · `API_STRUCTURE.md` · `API_ENDPOINTS.md` · `README.md`. Next in the build order: `SECURITY.md`.
