# SafeWay API Structure

> **Version:** 1.0\
> **Date:** 2026-10-10\
> **Status:** Planned API contract for the 6-hour MVP.\
> **Source of truth:** `context.md` and `PRD.md`; endpoint payload
> details belong in `API_ENDPOINTS.md`.\
> **Backend:** FastAPI (Python 3.11+, Pydantic v2) on Render.\
> **Application base path:** `/api/v1`

## 1. Purpose and scope

This document defines the API layout and shared conventions:
frontend/backend boundaries, authentication, response and error shapes,
pagination, idempotency, rate limiting, and Realtime behavior.

SafeWay's MVP supports trips and foreground location, SOS/incident
handling, hazard-aware route ranking, price checks, verified services,
reports, QR identity lookup, and admin/rescue workflows.

**This is a planned contract, not evidence that endpoints are already
implemented.** Keep the final endpoint-by-endpoint request/response
schemas in `API_ENDPOINTS.md`.

## 2. Architecture and ownership

-   **Next.js frontend:** UI, navigation, and Supabase client session
    handling. It is not the business backend.
-   **Supabase Auth:** email/password authentication and JWT issuance.
-   **FastAPI:** the only business backend under `/api/v1`. It verifies
    JWTs, applies role/ownership rules, validates payloads, performs
    business-rule writes, and coordinates external services.
-   **Supabase PostgreSQL:** source of truth for profiles, trips,
    locations, incidents, reports, zones, services, notifications, and
    the append-only audit ledger.
-   **Supabase RLS:** protects browser-side reads and permitted direct
    writes.
-   **Supabase Realtime:** pushes persisted changes to subscribed
    clients. No custom WebSocket server is required.
-   **External providers:** OpenRouteService for route alternatives,
    OpenWeather for weather, and an SMS provider abstraction (`mock` for
    the MVP; MSG91 only when configured).

### Request/data flow

1.  The user signs in through Supabase Auth.
2.  The frontend sends the Supabase access token to protected FastAPI
    endpoints as a Bearer token.
3.  FastAPI verifies the JWT and derives the user ID and app role from
    trusted claims.
4.  FastAPI validates the request, enforces authorization and business
    rules, then reads/writes Supabase as needed.
5.  The API returns JSON. Persisted changes can subsequently reach
    subscribed clients through Supabase Realtime.

### Direct Supabase access vs. FastAPI

The frontend may read supported data directly through Supabase under
RLS, including profiles, trips, the user's incidents, alerts, zones, and
services where policies permit.

Use FastAPI for operations with business rules or privileged access,
including SOS creation, incident transitions/assignment, staff access to
protected incident details, route ranking, price checks, report
submission/verification, audit verification, QR regeneration,
identity-verification demo flow, and scheduled-job logic.

Emergency contacts are managed through the tourist's Supabase client
under RLS in the MVP; they are data rows, not accounts. The guide role
has no API/UI in the MVP and can only update allowed fields of its own
`services` row through RLS.

## 3. URL and HTTP conventions

-   Application endpoints use the `/api/v1` prefix. Example:
    `POST /api/v1/sos`.
-   Use HTTPS in deployed environments.
-   Use JSON request and response bodies with
    `Content-Type: application/json`, unless a route explicitly
    specifies otherwise.
-   Use `GET` for reads, `POST` for creation/actions, and `PATCH` for
    partial updates.
-   Use lowercase, plural resource names where appropriate; use UUIDs
    for internal record IDs.
-   Use ISO 8601 UTC timestamps. Location records preserve device
    `recorded_at` separately from server `received_at`.
-   Validate bodies and query parameters with Pydantic v2. Reject
    invalid values.
-   Apply request-body size limits, CORS allowlisting, security headers,
    and per-endpoint rate limits.
-   Never return stack traces, database credentials, provider secrets,
    or internal implementation details.

### Health endpoints

`GET /health` and `GET /ready` are public operational endpoints and may
live outside `/api/v1`. They must not expose secrets or detailed
infrastructure information. `/health` indicates process liveness;
`/ready` indicates whether required dependencies are ready.

## 4. Authentication and authorization

### Authentication header

Protected requests include:

``` http
Authorization: Bearer <Supabase access token>
```

Public routes must be explicitly identified. All other routes require a
valid token.

### JWT verification

FastAPI validates the Supabase JWT signature and relevant claims,
including expiry (`exp`), issuer (`iss`), and audience (`aud`) according
to the project configuration.

-   Identify the user from the verified `sub` claim.
-   Read the application role only from `app_metadata.role`.
-   Allowed roles are exactly `tourist`, `guide`, `rescue`, and `admin`.
-   A missing role defaults to `tourist`; an invalid role is rejected.
-   Never trust a role, user ID, reporter ID, assignment, verification
    status, or privileged status supplied in the request body.
-   Self-registration always creates a tourist. Role assignment is done
    by the authorized seed script; there is no role-management endpoint
    in the MVP.

### Authorization layers

1.  FastAPI checks role, ownership, and allowed state transitions on
    every protected endpoint.
2.  PostgreSQL RLS provides a second layer for direct Supabase access.
3.  The Supabase service-role key is server-only and bypasses RLS.
    Endpoints using it must enforce authorization and ownership
    explicitly.

Recommended response semantics:

-   `401 Unauthorized`: missing, invalid, or expired authentication;
    also used for a missing/invalid cron secret.
-   `403 Forbidden`: authenticated user lacks the required
    role/permission.
-   `404 Not Found`: use for inaccessible private records when revealing
    their existence would leak information.

## 5. Standard response and error format

Successful responses should use a consistent JSON shape appropriate to
the endpoint. Collections return an `items` array and pagination
metadata.

Example:

``` json
{
  "items": [],
  "page": {
    "limit": 20,
    "next_cursor": null
  }
}
```

Errors use this envelope:

``` json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request could not be validated.",
    "details": {}
  }
}
```

-   `code` is a stable machine-readable identifier.
-   `message` is a short, safe explanation.
-   `details` may contain safe field-level validation information;
    otherwise use an empty object.
-   Do not expose SQL errors, stack traces, JWT contents, provider
    credentials, or private record details.

Common status codes:

  -----------------------------------------------------------------------
  Code                                Meaning
  ----------------------------------- -----------------------------------
  `200`                               Successful read/action

  `201`                               Resource created

  `202`                               Work accepted for asynchronous
                                      processing; does not imply delivery

  `204`                               Successful operation with no
                                      response body

  `400`                               Invalid business request

  `401`                               Authentication required or invalid

  `403`                               Role/permission denied

  `404`                               Missing or intentionally concealed
                                      private record

  `409`                               Conflicting state or invalid
                                      transition

  `422`                               Request validation failed, if using
                                      FastAPI's validation status

  `429`                               Rate limit/cooldown; include
                                      `Retry-After` when applicable

  `5xx`                               Server/provider failure; never
                                      include secrets or stack traces
  -----------------------------------------------------------------------

## 6. Pagination

Use cursor pagination for collections that can grow over time.

-   Query parameters: `limit` and `cursor`.
-   Enforce a server-side maximum limit; record default and maximum
    values in `API_ENDPOINTS.md`.
-   Use stable ordering, normally newest-first for incident/report
    feeds, with a deterministic tie-breaker.
-   Return `page.next_cursor` as an opaque value or `null` when no next
    page exists.
-   Do not expose database internals in cursor values.

## 7. Idempotency and retries

Require an idempotency key for operations where retries could create
duplicate records or notifications:

-   SOS: `POST /api/v1/sos`
-   Location batches: `POST /api/v1/location/batch`
-   Reports: `POST /api/v1/reports`

Use the `Idempotency-Key` header. For SOS, it must match the
client-generated UUID `client_id` in the request body.

``` http
Idempotency-Key: 8b8c2d44-2a7b-4b1d-9f4a-0b0b9f1a1234
```

Persist idempotency state with the authenticated user and endpoint.
Repeating the same key for the same user/endpoint returns the original
result rather than creating another incident, location batch, report, or
SMS. Reject key reuse with an incompatible payload if payload
fingerprints are implemented.

SOS clients use a short timeout (about five seconds), persist an
unconfirmed submission in IndexedDB, and retry with backoff. A timeout
does **not** prove that the server rejected the request; retries must
reuse the same key.

A prefilled SMS or call is a separate device fallback. It does not
create a dashboard incident unless the server later accepts the API
submission.

## 8. Rate limiting and abuse controls

Apply rate limits to authentication-sensitive routes, SOS, location
updates, reports, public QR verification, and other expensive
operations.

-   Return `429 Too Many Requests` and `Retry-After` where applicable.
-   Include rate-limit headers where supported.
-   SOS target: at most 5 submissions per 10 minutes per user, plus a
    60-second cooldown after a successful SOS. An idempotent retry of
    the same `client_id` is not a new SOS.
-   Enforce an SMS daily cap and server-side kill switch.
-   Send emergency SMS only to the tourist's consented contacts after
    phone validation.
-   Public QR lookup must be rate-limited and disclose minimal
    information.
-   The MVP's in-process limiter is suitable only for a single demo
    instance; counters reset on restart. Distributed rate limiting is
    future work.

Rate-limit values are configuration and must be tested; frontend-only
limits are not security controls.

## 9. Endpoint groups

The detailed endpoint inventory and schemas belong in
`API_ENDPOINTS.md`. Intended MVP groups:

  --------------------------------------------------------------------------------------------
  Group                   Intended routes                              Access
  ----------------------- -------------------------------------------- -----------------------
  Health                  `GET /health`, `GET /ready`                  Public operational
                                                                       endpoints

  Current user            `GET /api/v1/me`, `PATCH /api/v1/me`         Authenticated user; own
                                                                       profile

  Trips                   `POST /api/v1/trips`,                        Tourist; own trips
                          `POST /api/v1/trips/{id}/start`,             
                          `POST /api/v1/trips/{id}/end`,               
                          `PATCH /api/v1/trips/{id}`                   

  Location/check-ins      `POST /api/v1/location/batch`,               Tourist; own active
                          `POST /api/v1/checkins`                      trip and consent

  SOS/incidents           `POST /api/v1/sos`,                          Tourist for own
                          `POST /api/v1/sos/{id}/cancel`,              records; rescue/admin
                          `GET /api/v1/incidents`,                     for permitted
                          `GET /api/v1/incidents/{id}`,                operations
                          `POST /api/v1/incidents/{id}/acknowledge`,   
                          `POST /api/v1/incidents/{id}/assign`,        
                          `POST /api/v1/incidents/{id}/status`         

  Routes/weather          `POST /api/v1/routes/rank`,                  Authenticated tourist
                          `GET /api/v1/weather?lat=…&lng=…`            

  Hazard zones            `GET /api/v1/zones`,                         Authenticated read;
                          `POST /api/v1/admin/zones`,                  admin write
                          `PATCH /api/v1/admin/zones/{id}`             

  Price checker           `POST /api/v1/price/check`                   Authenticated tourist

  Services                `GET /api/v1/services`,                      Read eligible/verified
                          `PATCH /api/v1/admin/services/{id}/verify`   services; admin
                                                                       verifies

  Reports                 `POST /api/v1/reports`,                      Tourist submits; admin
                          `PATCH /api/v1/admin/reports/{id}/verify`    verifies

  QR/identity             `POST /api/v1/me/qr/regenerate`,             Tourist for own
                          `GET /api/v1/id/{public_id}/verify`,         QR/verification; public
                          `POST /api/v1/identity/verify`               QR lookup is
                                                                       rate-limited

  Audit                   `GET /api/v1/audit/verify`,                  Admin only
                          `GET /api/v1/admin/audit`                    

  Inactivity jobs         `POST /internal/jobs/inactivity-sweep`,      Scheduler secret; admin
                          `POST /api/v1/admin/jobs/inactivity-sweep`   JWT respectively
  --------------------------------------------------------------------------------------------

**Route note:** `/internal/jobs/inactivity-sweep` is a protected
operational endpoint, not a public browser endpoint. It rejects requests
without the configured secret. The admin demo endpoint requires an admin
JWT and calls the same service function; the cron secret must never
reach the browser.

This is the intended route shape, not a guarantee every route exists in
code. Confirm final paths, statuses, schemas, and permissions in
`API_ENDPOINTS.md` before integration.

## 10. Incident state and SOS semantics

The `incidents` row is the canonical SOS record. Do not create a
separate SOS table or introduce a second status vocabulary.

Expected lifecycle:

``` text
submitted -> acknowledged -> assigned -> in_progress -> resolved -> closed
```

Cancellation and duplicate marking are controlled branches, allowed only
from states and by roles defined in `AUTH_REQUIREMENTS.md` and
`BUSINESS_LOGIC.md`. Enforce transitions on the server.

-   Successful API persistence means **"Report sent to SafeWay response
    team."**
-   It does not mean a responder has seen it, an SMS was delivered, or
    police/ambulance were notified.
-   An SOS can be submitted without GPS coordinates.
-   Manual SMS/call fallback must explain that opening the
    messaging/calling app does not confirm delivery or dashboard
    receipt.
-   Label mocked SMS and seeded sample data in the UI.

## 11. Realtime subscriptions

Use Supabase Realtime for persisted changes; do not add a custom
WebSocket server in the MVP.

-   **`incidents`:** tourists observe only their own incidents;
    rescue/admin visibility is limited to permitted incidents.
-   **`safety_alerts`:** deliver only alerts appropriate for the
    subscribed user/area and policy.
-   **`notifications`:** target the relevant user.
-   Realtime events do not replace authorization. RLS and server-side
    controls remain mandatory.
-   Realtime is not a substitute for a durable database write or
    explicit SOS status.

## 12. CORS, secrets, and deployment

-   Allow only configured frontend origins, including deployed Vercel
    and explicit local development origins.
-   Keep Supabase service-role credentials, SMS credentials, cron
    secrets, and provider keys in backend environment variables.
-   Never expose server secrets through browser bundles, public frontend
    environment variables, API responses, or logs.
-   The browser may use the Supabase anon/publishable key with RLS;
    privileged writes stay server-side.
-   Apply security headers and a restrictive Content Security Policy
    appropriate to the deployed app.
-   Validate/normalize coordinates, phone numbers, pagination values,
    IDs, and free-text reports.
-   Log request IDs and safe operational metadata, but not access
    tokens, precise location history, emergency contact numbers,
    Aadhaar/passport identifiers, or sensitive payloads.

## 13. Suggested FastAPI layout

Adapt this structure to the actual repository once code is added:

``` text
backend/
  app/
    main.py                 # App, middleware, router registration
    core/
      config.py             # Environment configuration
      security.py           # JWT verification and role dependencies
      errors.py             # Error envelope and exception handlers
      rate_limit.py         # Rate-limit configuration
    api/
      deps.py               # Current-user and role dependencies
      v1/
        router.py           # /api/v1 router aggregation
        routes/
          me.py
          trips.py
          location.py
          sos.py
          incidents.py
          routes.py
          weather.py
          zones.py
          price.py
          services.py
          reports.py
          identity.py
          audit.py
          admin.py
    schemas/                 # Pydantic request/response models
    services/                # Business logic and provider integrations
    repositories/            # Optional database access helpers
    tests/
      unit/
      integration/
```

Keep routers thin: validate input, call a service, and map the result to
a response schema. Keep lifecycle rules, idempotency,
authorization-sensitive operations, and notification decisions in
service functions.

## 14. Minimum API tests before demo

-   Missing/invalid JWT returns `401`; a tourist calling an
    admin/rescue-only operation returns `403`.
-   User B cannot read User A's incidents or trips.
-   Client-supplied `role` or `user_id` cannot elevate permissions or
    change ownership.
-   Repeating an SOS with the same idempotency key returns the same
    incident and does not enqueue duplicate SMS.
-   A timeout followed by a retry does not create duplicate incidents.
-   Invalid incident transitions are rejected; rescue staff cannot
    update another rescue user's assigned incident.
-   SOS can be submitted without GPS coordinates.
-   The cron endpoint rejects a missing/incorrect secret; the admin
    sweep endpoint rejects non-admin users.
-   Rate limits return `429` with retry guidance.
-   Public QR lookup returns the same minimal invalid result for
    unknown, regenerated, or revoked IDs and never exposes phone numbers
    or location.
-   Realtime visibility does not expose another tourist's private
    incident data.
-   Error responses contain no stack traces or secrets.

## 15. Related documents

-   `context.md` --- canonical project decisions and stack
-   `PRD.md` --- MVP scope and acceptance criteria
-   `AUTH_REQUIREMENTS.md` --- role permissions and incident transition
    matrix
-   `BUSINESS_LOGIC.md` --- SOS queue, retries, fallbacks, risk rules,
    and incident behavior
-   `DATABASE_SCHEMA.md` --- tables, constraints, migrations, RLS, and
    audit ledger
-   `DATABASE_MODELS.md` --- database model definitions
-   `SECURITY.md` --- hardening, privacy, rate limits, logging, and
    operational security
-   `API_ENDPOINTS.md` --- detailed endpoint-by-endpoint
    request/response contract
