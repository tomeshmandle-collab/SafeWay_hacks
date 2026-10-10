# SafeWay API Endpoints

> **Version:** 1.0\
> **Date:** 2026-10-10\
> **Status:** Planned endpoint contract for the 6-hour MVP.\
> **Related documents:** `API_STRUCTURE.md`, `AUTH_REQUIREMENTS.md`,
> `BUSINESS_LOGIC.md`, `DATABASE_SCHEMA.md`, `PRD.md`\
> **API base path:** `/api/v1`, except explicitly noted operational
> endpoints.

## 1. Purpose and implementation status

This document is the endpoint-level companion to `API_STRUCTURE.md`. It
lists the intended MVP routes, access rules, request fields, response
shapes, and important validation behavior.

**Important:** These are implementation contracts to build and test
against, not a claim that the endpoints already exist. Before frontend
integration, keep the actual FastAPI routes and schemas synchronized
with this file.

### Shared conventions

-   JSON requests/responses unless specified otherwise.
-   Protected endpoints require
    `Authorization: Bearer <Supabase access token>`.
-   The application role is read only from verified JWT
    `app_metadata.role`: `tourist`, `guide`, `rescue`, or `admin`.
-   Never trust client-provided `user_id`, `role`, reporter, assignee,
    incident status, or verification actor.
-   Use Pydantic v2 for validation. Return the shared error envelope
    defined in `API_STRUCTURE.md`.
-   Internal IDs are UUIDs unless a field is explicitly described
    otherwise.
-   Timestamps use ISO 8601 UTC. For location, retain both device
    `recorded_at` and server `received_at`.
-   Collections use cursor pagination (`limit`, `cursor`) with a
    server-enforced maximum.
-   `Idempotency-Key` is required for SOS, location batches, and
    reports.
-   Any write made with the Supabase service-role key must enforce
    authorization and ownership in FastAPI because the key bypasses RLS.

## 2. Endpoint index

  -------------------------------------------------------------------------------------------------------
  Method            Path                                            Access            Purpose
  ----------------- ----------------------------------------------- ----------------- -------------------
  GET               `/health`                                       Public            Liveness check

  GET               `/ready`                                        Public            Readiness check

  GET               `/api/v1/me`                                    Authenticated     Read current
                                                                                      profile

  PATCH             `/api/v1/me`                                    Tourist           Update permitted
                                                                                      profile fields

  POST              `/api/v1/trips`                                 Tourist           Create trip

  PATCH             `/api/v1/trips/{trip_id}`                       Tourist, owner    Update an eligible
                                                                                      trip

  POST              `/api/v1/trips/{trip_id}/start`                 Tourist, owner    Start trip

  POST              `/api/v1/trips/{trip_id}/end`                   Tourist, owner    End trip

  POST              `/api/v1/location/batch`                        Tourist           Submit location
                                                                                      updates

  POST              `/api/v1/checkins`                              Tourist           Record "I'm safe"
                                                                                      check-in

  POST              `/api/v1/sos`                                   Tourist           Create or retrieve
                                                                                      idempotent SOS
                                                                                      incident

  POST              `/api/v1/sos/{incident_id}/cancel`              Reporter/admin    Request SOS
                                                                    under rules       cancellation

  GET               `/api/v1/incidents`                             Tourist, rescue,  List incidents
                                                                    admin             visible to caller

  GET               `/api/v1/incidents/{incident_id}`               Authorized        Read incident
                                                                    owner/staff       detail

  POST              `/api/v1/incidents/{incident_id}/acknowledge`   Rescue/admin      Acknowledge
                                                                                      incident

  POST              `/api/v1/incidents/{incident_id}/assign`        Rescue/admin      Assign/reassign
                                                                                      responder

  POST              `/api/v1/incidents/{incident_id}/status`        Authorized        Transition incident
                                                                    assigned          status
                                                                    rescue/admin      

  POST              `/api/v1/routes/rank`                           Tourist           Rank route
                                                                                      alternatives by
                                                                                      advisory risk

  GET               `/api/v1/weather`                               Tourist           Get current weather
                                                                                      for coordinates

  GET               `/api/v1/zones`                                 Authenticated     Read active hazard
                                                                                      zones

  POST              `/api/v1/admin/zones`                           Admin             Create hazard zone

  PATCH             `/api/v1/admin/zones/{zone_id}`                 Admin             Update/deactivate
                                                                                      hazard zone

  POST              `/api/v1/price/check`                           Tourist           Compare quoted
                                                                                      price to seeded
                                                                                      baseline

  GET               `/api/v1/services`                              Authenticated     List eligible
                                                                                      verified services

  PATCH             `/api/v1/admin/services/{service_id}/verify`    Admin             Verify/reject
                                                                                      service

  POST              `/api/v1/reports`                               Tourist           Submit problem
                                                                                      report

  PATCH             `/api/v1/admin/reports/{report_id}/verify`      Admin             Verify/reject
                                                                                      report

  POST              `/api/v1/me/qr/regenerate`                      Tourist           Rotate own opaque
                                                                                      public ID

  GET               `/api/v1/id/{public_id}/verify`                 Public,           Minimal public QR
                                                                    rate-limited      lookup

  POST              `/api/v1/identity/verify`                       Tourist           Run labelled mock
                                                                                      identity
                                                                                      verification

  GET               `/api/v1/audit/verify`                          Admin             Verify audit hash
                                                                                      chain

  GET               `/api/v1/admin/audit`                           Admin             Read permitted
                                                                                      audit entries

  POST              `/internal/jobs/inactivity-sweep`               Scheduler secret  Run scheduled
                                                                                      inactivity sweep

  POST              `/api/v1/admin/jobs/inactivity-sweep`           Admin JWT         Trigger demo
                                                                                      inactivity sweep
  -------------------------------------------------------------------------------------------------------

Emergency-contact CRUD is performed directly through the Supabase client
under RLS in the MVP; there is no separate FastAPI contact endpoint.
Guide access is also RLS-only: a guide can update the allowed fields of
their own `services` row, with no guide UI or API endpoint.

## 3. Health and current user

### `GET /health`

**Auth:** Public\
**Purpose:** Liveness check. Must not reveal environment variables or
internal configuration.

Example response (`200`):

``` json
{
  "status": "ok"
}
```

### `GET /ready`

**Auth:** Public\
**Purpose:** Readiness check for required dependencies. Keep the
response non-sensitive.

Example response (`200`):

``` json
{
  "status": "ready"
}
```

If a required dependency prevents service, return an appropriate non-2xx
response without exposing secrets.

### `GET /api/v1/me`

**Auth:** Any authenticated role\
**Purpose:** Return the current user's safe profile and application
role.

Example response (`200`):

``` json
{
  "id": "user-uuid",
  "full_name": "Sample Tourist",
  "phone": null,
  "language": "en",
  "public_id": "opaque-public-id",
  "role": "tourist"
}
```

The example values are illustrative. Do not return JWTs, internal auth
secrets, or fields the caller is not permitted to see.

### `PATCH /api/v1/me`

**Auth:** Tourist\
**Purpose:** Update only explicitly permitted profile fields.

Example request:

``` json
{
  "full_name": "Updated Display Name",
  "phone": "+91XXXXXXXXXX",
  "language": "en"
}
```

Rules: - Reject or ignore attempts to set `role`, `id`, `public_id`,
verification status, or other server-managed fields. - Enforce
field-length and phone-format validation. - Return the updated safe
profile (`200`).

## 4. Trips

### `POST /api/v1/trips`

**Auth:** Tourist\
**Purpose:** Create a trip.

Example request:

``` json
{
  "destination": "Manali",
  "planned_start_at": "2026-10-12T06:00:00Z",
  "planned_end_at": "2026-10-14T18:00:00Z",
  "traveler_count": 1,
  "travel_mode": "car"
}
```

Rules: - The authenticated user becomes the owner; do not accept an
authoritative `user_id`. - A trip cannot start without at least one
consented emergency contact. With only one contact, require
acknowledgement of the reduced fallback. - Enforce one active trip per
tourist. - Return created trip (`201`).

### `PATCH /api/v1/trips/{trip_id}`

**Auth:** Tourist, owner\
**Purpose:** Update allowed fields of an eligible trip.

Example request:

``` json
{
  "destination": "Old Manali",
  "planned_end_at": "2026-10-14T20:00:00Z"
}
```

Rules: validate ownership and trip state; reject changes to owner,
system status, or server timestamps. Return updated trip (`200`).

### `POST /api/v1/trips/{trip_id}/start`

**Auth:** Tourist, owner\
**Purpose:** Start a trip and its foreground-only tracking workflow.

Example request:

``` json
{
  "location_consent": true,
  "single_contact_acknowledged": false
}
```

Rules: - Require location consent and at least one consented emergency
contact. - If exactly one contact exists, require
`single_contact_acknowledged: true`. - Do not promise background
tracking. The UI must say: "Keep SafeWay open for continuous location
tracking." - Return updated trip (`200`).

### `POST /api/v1/trips/{trip_id}/end`

**Auth:** Tourist, owner\
**Purpose:** End an active trip and stop tracking.

Example request:

``` json
{
  "ended_at": "2026-10-12T14:20:00Z"
}
```

Treat the client timestamp as informational and validate it; the server
records its own end/received timestamp. Return the updated trip (`200`).
Ending a trip must not erase incident history.

## 5. Location and check-ins

### `POST /api/v1/location/batch`

**Auth:** Tourist\
**Idempotency:** Required via `Idempotency-Key`\
**Purpose:** Submit a batch of foreground location points for the user's
active trip.

Example request:

``` json
{
  "trip_id": "trip-uuid",
  "points": [
    {
      "client_point_id": "point-uuid",
      "latitude": 32.2432,
      "longitude": 77.1892,
      "accuracy_m": 18.0,
      "recorded_at": "2026-10-12T08:10:00Z"
    }
  ]
}
```

Rules: - Verify the trip belongs to the caller and is active. - Require
location consent. - Validate latitude/longitude bounds and reasonable
accuracy/point counts. - Preserve device `recorded_at` and server
`received_at`; stale data must not be shown as current. - Apply rate
limits and the configured retention policy (7 days). - Repeated keys
must not duplicate points.

Example response (`200`):

``` json
{
  "accepted": 1,
  "rejected": 0,
  "received_at": "2026-10-12T08:10:01Z"
}
```

### `POST /api/v1/checkins`

**Auth:** Tourist\
**Purpose:** Record an "I'm safe" check-in for the user's active trip.

Example request:

``` json
{
  "trip_id": "trip-uuid",
  "message": "Reached the hotel safely",
  "recorded_at": "2026-10-12T12:00:00Z"
}
```

Rules: validate trip ownership and active state; keep message length
bounded; do not treat a check-in as proof of continuous tracking. Return
the created check-in (`201`).

## 6. SOS and incident handling

### `POST /api/v1/sos`

**Auth:** Tourist\
**Idempotency:** Required. `Idempotency-Key` must equal payload
`client_id`.\
**Purpose:** Create an SOS incident or return the existing incident for
a retry.

Example request:

``` json
{
  "client_id": "8b8c2d44-2a7b-4b1d-9f4a-0b0b9f1a1234",
  "trip_id": "trip-uuid",
  "category": "personal_safety",
  "description": "Need assistance",
  "location": {
    "latitude": 32.2432,
    "longitude": 77.1892,
    "accuracy_m": 18.0,
    "recorded_at": "2026-10-12T08:10:00Z"
  }
}
```

`trip_id`, description, and location may be optional where allowed by
the final schema. SOS must proceed when GPS is unavailable.

Rules: - Derive reporter identity from the verified token. - Accept only
canonical incident categories and calculate severity server-side. -
Enforce idempotency and the documented 60-second cooldown; retries must
not enqueue duplicate SMS. - Persist the incident, lifecycle event,
idempotency record, and audit entry consistently. - Create
notification/outbox rows for consented emergency contacts and permitted
staff. The configured mock SMS provider writes to a labelled "Mock SMS"
outbox in the MVP. - Return promptly after durable acceptance; delivery
can happen asynchronously.

Example response (`201` for new incident; `200` for an idempotent
replay):

``` json
{
  "incident_id": "incident-uuid",
  "reference": "SW-2026-0001",
  "status": "submitted",
  "duplicate": false,
  "message": "Report sent to SafeWay response team."
}
```

The message means SafeWay accepted the report. It does **not** mean a
responder saw it, an SMS was delivered, or police/ambulance were
notified.

Potential errors: `401`, `403`, `409`, `422`, `429`, `5xx`. If the
client times out, it must retry with the same key rather than generating
a new incident.

### `POST /api/v1/sos/{incident_id}/cancel`

**Auth:** Reporter within permitted cancellation window, or admin under
policy\
**Purpose:** Request cancellation of an eligible incident.

Example request:

``` json
{
  "reason": "Accidental trigger"
}
```

Rules: - Enforce the canonical transition matrix on the server. - The
reporter's cancellation window is intended to be 300 seconds and applies
only to permitted states; keep this configurable. - Cancellation cannot
recall an SMS already sent. - Return the updated incident (`200`) or
`409` for an invalid transition.

### `GET /api/v1/incidents`

**Auth:** Tourist, rescue, admin\
**Purpose:** List incidents visible to the caller.

Query parameters: - `limit` --- page size, server-capped. - `cursor` ---
opaque next-page cursor. - Optional permitted filters such as `status`
and `since`.

Rules: - Tourists see only their own incidents. - Rescue users see only
incidents allowed by the staff visibility/assignment rules. - Admins can
see incidents permitted by the admin role. - Return only fields
appropriate for the caller.

Example response (`200`):

``` json
{
  "items": [
    {
      "id": "incident-uuid",
      "reference": "SW-2026-0001",
      "category": "personal_safety",
      "status": "submitted",
      "created_at": "2026-10-12T08:10:01Z"
    }
  ],
  "page": {
    "limit": 20,
    "next_cursor": null
  }
}
```

### `GET /api/v1/incidents/{incident_id}`

**Auth:** Authorized reporter or staff\
**Purpose:** Read incident details and permitted timeline.

Rules: - A tourist can read only their own incident. - Rescue staff can
read only incident details allowed by their role and assignment rules. -
Staff response must not include emergency-contact numbers, the tourist's
full trip route, or location history. - Return `404` for inaccessible
private records where necessary to avoid revealing existence.

### `POST /api/v1/incidents/{incident_id}/acknowledge`

**Auth:** Rescue/admin\
**Purpose:** Move an eligible incident from `submitted` to
`acknowledged`.

Example request:

``` json
{
  "note": "Incident reviewed"
}
```

Rules: enforce the state transition and actor role; record an immutable
lifecycle event and audit entry. Return updated incident (`200`) or
`409`.

### `POST /api/v1/incidents/{incident_id}/assign`

**Auth:** Rescue/admin\
**Purpose:** Assign or reassign an incident to an active rescue/admin
account.

Example request:

``` json
{
  "assignee_user_id": "rescue-user-uuid",
  "note": "Assigned to on-duty responder"
}
```

Rules: - Validate the target account's server-side role and active
status. - Never trust the caller to assert the target role. - Preserve
reassignment history as incident events. - Return updated incident
(`200`) or `422` if the target is ineligible.

### `POST /api/v1/incidents/{incident_id}/status`

**Auth:** Assigned rescue or admin, according to the transition matrix\
**Purpose:** Advance an incident through its canonical lifecycle.

Example request:

``` json
{
  "status": "in_progress",
  "note": "Response started"
}
```

Allowed primary lifecycle:

`submitted` → `acknowledged` → `assigned` → `in_progress` → `resolved` →
`closed`

Cancellation and duplicate branches are handled separately. Rescue users
may update only incidents assigned to them; admin permissions follow
`AUTH_REQUIREMENTS.md`. Reject invalid transitions with `409`. Record an
event and audit entry for each accepted transition.

## 7. Routes, zones, weather, and prices

### `POST /api/v1/routes/rank`

**Auth:** Tourist\
**Purpose:** Rank route alternatives using available route geometry and
proximity to known hazards.

Example request:

``` json
{
  "origin": {
    "latitude": 32.2396,
    "longitude": 77.1887
  },
  "destination": {
    "latitude": 32.2432,
    "longitude": 77.1892
  },
  "travel_mode": "driving"
}
```

Example response (`200`):

``` json
{
  "routes": [
    {
      "route_id": "route-1",
      "rank": 1,
      "risk_level": "caution",
      "factors": [
        {
          "type": "hazard_proximity",
          "level": "caution",
          "description": "A reported hazard is near this route."
        }
      ],
      "data_freshness": "2026-10-12T08:00:00Z"
    }
  ],
  "advisory_only": true
}
```

Rules: - Call OpenRouteService from the backend; keep API credentials
private. - Use the single canonical scoring engine and advisory levels,
not a 0--100 safety score. - Explain contributing factors and data
freshness. - Missing hazard data does not mean the route is safe. Do not
claim predictive certainty. - If routing is unavailable, return a clear
provider-unavailable error or documented degraded response; do not
silently fabricate a route.

### `GET /api/v1/weather?lat={latitude}&lng={longitude}`

**Auth:** Tourist\
**Purpose:** Retrieve current weather for a validated coordinate.

Example response (`200`):

``` json
{
  "available": true,
  "source": "OpenWeather",
  "observed_at": "2026-10-12T08:00:00Z",
  "temperature_c": 16.2,
  "condition": "Clouds",
  "warning": null
}
```

If unavailable, return a safe degraded response such as
`available: false` and an explanatory message. Cache server-side as
configured; never expose provider credentials.

### `GET /api/v1/zones`

**Auth:** Authenticated\
**Purpose:** List active hazard zones appropriate for the map/route
workflow.

Query parameters may include bounded `lat`, `lng`, and `radius_km` if
supported. Return only active zones and their advisory metadata. Avoid
claiming completeness when zones are seeded or reports are incomplete.

Example response (`200`):

``` json
{
  "items": [
    {
      "id": "zone-uuid",
      "name": "Sample landslide warning",
      "category": "landslide",
      "severity": "high",
      "source": "sample",
      "sample": true,
      "updated_at": "2026-10-12T07:45:00Z"
    }
  ],
  "page": {
    "limit": 20,
    "next_cursor": null
  }
}
```

### `POST /api/v1/admin/zones`

**Auth:** Admin\
**Purpose:** Create a hazard zone.

Example request:

``` json
{
  "name": "Road repair warning",
  "category": "roadwork",
  "severity": "medium",
  "description": "Road repairs reported near the route",
  "latitude": 32.2432,
  "longitude": 77.1892,
  "radius_m": 250,
  "source": "admin"
}
```

The final MVP schema may support point/radius zones rather than
polygons; validate against `DATABASE_SCHEMA.md`. The actor and
timestamps are server-controlled. Return created zone (`201`).

### `PATCH /api/v1/admin/zones/{zone_id}`

**Auth:** Admin\
**Purpose:** Update allowed hazard-zone fields or deactivate a zone.

Example request:

``` json
{
  "severity": "low",
  "active": false
}
```

Record an audit entry. Return updated zone (`200`) or `404`.

### `POST /api/v1/price/check`

**Auth:** Tourist\
**Purpose:** Compare a user-entered quote against a seeded price
baseline.

Example request:

``` json
{
  "kind": "taxi",
  "route_or_item": "Manali to Solang Valley",
  "quoted_price": 2200,
  "currency": "INR"
}
```

Example response (`200`):

``` json
{
  "currency": "INR",
  "quoted_price": 2200,
  "baseline": {
    "min_price": 1200,
    "max_price": 1500,
    "source": "sample rate card"
  },
  "assessment": "above_range",
  "message": "Price seems too high",
  "sample": true
}
```

Rules: - Use the seeded baseline for the MVP and disclose its
source/freshness. - This is a reference estimate, not a guarantee or an
accusation of fraud. - Validate positive prices and supported service
kinds. - Do not present sample pricing as verified live market data.

## 8. Services and reports

### `GET /api/v1/services`

**Auth:** Authenticated\
**Purpose:** List eligible verified tourism services.

Supported filters may include `kind`, `area`, `limit`, and `cursor`.
Public tourist-facing results should normally include only
`status: verified`; do not show pending/rejected services as trusted.

Example response (`200`):

``` json
{
  "items": [
    {
      "id": "service-uuid",
      "kind": "guide",
      "name": "Sample Local Guide",
      "area": "Manali",
      "status": "verified",
      "sample": true
    }
  ],
  "page": {
    "limit": 20,
    "next_cursor": null
  }
}
```

### `PATCH /api/v1/admin/services/{service_id}/verify`

**Auth:** Admin\
**Purpose:** Approve or reject a service listing.

Example request:

``` json
{
  "status": "verified",
  "note": "Reviewed for the demo"
}
```

Allowed status values: `verified` or `rejected` (with `pending` as the
initial state). Set `verified_by` and `verified_at` on the server as
appropriate, and append an audit entry. Return updated service (`200`).

### `POST /api/v1/reports`

**Auth:** Tourist\
**Idempotency:** Required via `Idempotency-Key`\
**Purpose:** Report a hazard or safety problem.

Example request:

``` json
{
  "client_id": "report-client-uuid",
  "category": "landslide",
  "description": "Loose rocks reported beside the road",
  "latitude": 32.2432,
  "longitude": 77.1892,
  "recorded_at": "2026-10-12T08:10:00Z"
}
```

Rules: - Derive reporter ID from the token. - Validate category,
description length, coordinates, and any supported proximity/time
constraints. - Photo upload/AI classification are not MVP
requirements. - New reports are unverified until an admin reviews them;
don't present them as confirmed hazards. - Repeated idempotency keys
must not create duplicate reports.

Example response (`201`):

``` json
{
  "report_id": "report-uuid",
  "status": "pending",
  "sample": false
}
```

### `PATCH /api/v1/admin/reports/{report_id}/verify`

**Auth:** Admin\
**Purpose:** Verify or reject a submitted report.

Example request:

``` json
{
  "status": "verified",
  "note": "Reviewed against available evidence"
}
```

Allowed status values must match the canonical report enum in the
schema. Record the reviewing admin and audit event server-side. Return
updated report (`200`).

## 9. QR identity and mock verification

### `POST /api/v1/me/qr/regenerate`

**Auth:** Tourist\
**Purpose:** Replace the user's opaque public ID and invalidate the old
one.

Example response (`200`):

``` json
{
  "public_id": "new-opaque-random-id",
  "message": "Your public ID has been regenerated."
}
```

Rules: - Generate the ID with a cryptographically secure random
source. - Do not encode personal data in it. - The old ID becomes
invalid immediately. - Record the security-sensitive change in the audit
ledger. - This QR lookup proves that a SafeWay record can be found; it
does not prove legal identity.

### `GET /api/v1/id/{public_id}/verify`

**Auth:** Public; strict rate limit\
**Purpose:** Minimal public QR verification.

Valid example response (`200`):

``` json
{
  "valid": true,
  "public_id": "opaque-public-id",
  "display_name": "Sample Tourist",
  "trip_status": "active",
  "verified_badge": false
}
```

Invalid, unknown, regenerated, or revoked IDs must return the same
minimal shape:

``` json
{
  "valid": false
}
```

Do not return phone numbers, emergency contacts, exact location, route
history, or private identity documents. Avoid leaking whether an invalid
ID was unknown versus revoked.

### `POST /api/v1/identity/verify`

**Auth:** Tourist\
**Purpose:** Run the labelled MVP mock identity-verification flow.

Example request:

``` json
{
  "provider": "mock",
  "consent": true
}
```

Example response (`200`):

``` json
{
  "provider": "mock",
  "status": "demo",
  "message": "Sandbox/Demo verification only. No government identity verification was performed."
}
```

Rules: - Identity verification is optional and must not block
registration or trip creation. - Do not accept or store Aadhaar/passport
numbers, scans, or identity documents in the MVP. - Never claim a
production UIDAI integration or real identity validation when using the
mock provider.

## 10. Audit endpoints

### `GET /api/v1/audit/verify`

**Auth:** Admin\
**Purpose:** Verify the audit ledger's hash chain.

Example response (`200`):

``` json
{
  "valid": true,
  "entries_checked": 42,
  "first_invalid_entry_id": null,
  "verified_at": "2026-10-12T08:15:00Z"
}
```

Do not imply that a valid hash chain proves every event was truthful or
that a privileged actor could never rewrite the entire chain. The
endpoint checks the chain according to the implemented ledger algorithm.

### `GET /api/v1/admin/audit`

**Auth:** Admin\
**Purpose:** Read permitted audit entries.

Query parameters: `limit`, `cursor`, and optional bounded filters such
as action/entity type. Return no secrets or unnecessary personal data.
Audit entries are append-only; there must be no endpoint to edit or
delete them.

## 11. Inactivity sweep jobs

### `POST /internal/jobs/inactivity-sweep`

**Auth:** Scheduler secret header\
**Purpose:** Run the scheduled inactivity sweep.

Example header:

``` http
X-Cron-Secret: <server-configured-secret>
```

Rules: - Return `401` when the secret is missing or invalid. - Never
expose this secret to the browser or log its value. - Make the operation
safe to invoke repeatedly. - In production/demo configuration, run the
same service logic as the admin-triggered sweep.

Example response (`200`):

``` json
{
  "processed": 0,
  "alerts_created": 0
}
```

### `POST /api/v1/admin/jobs/inactivity-sweep`

**Auth:** Admin JWT\
**Purpose:** Trigger the same inactivity-sweep logic manually for the
hackathon demo.

No cron secret is sent by the browser. Return a summary of processed
records without exposing contact numbers or sensitive location history.
Reject non-admin callers with `403`.

## 12. Shared validation and security rules

Every endpoint must follow the relevant items below:

1.  **Identity:** use the verified JWT `sub`; never accept a
    client-selected actor identity.
2.  **Roles:** use `app_metadata.role` only; allowed roles are
    `tourist`, `guide`, `rescue`, `admin`.
3.  **Ownership:** check ownership explicitly, especially when using the
    Supabase service-role key.
4.  **State transitions:** validate incident/trip/report state changes
    on the server.
5.  **Input validation:** constrain IDs, enums, strings, coordinates,
    timestamps, numeric values, and payload sizes.
6.  **Idempotency:** persist and replay results for the same
    user/key/endpoint; do not duplicate SMS or records.
7.  **Rate limits:** apply to SOS, location, reports, login-sensitive
    flows, and public QR lookup.
8.  **Audit:** record sensitive administrative actions and incident
    lifecycle changes through the append-only audit function.
9.  **Privacy:** do not log access tokens, precise location histories,
    emergency contact numbers, Aadhaar/passport data, or sensitive
    payloads.
10. **Honest status:** never claim SMS delivery, responder
    acknowledgement, or emergency-service contact without evidence.
11. **Sample data:** mark seeded zones, services, prices, and other demo
    content as sample data.
12. **Degraded providers:** weather/routing failures should be visible
    as unavailable; SOS must not depend on weather or routing being
    available.

## 13. Suggested implementation order

1.  Health endpoints and shared error handling.
2.  JWT verification and role/ownership dependencies.
3.  Current user and trip endpoints.
4.  SOS, idempotency storage, incident lifecycle, and audit transaction.
5.  Rescue/admin incident queue and status updates.
6.  Location batches and check-ins.
7.  QR regeneration and public verification.
8.  Zones, route ranking, weather, price checks, services, and reports.
9.  Audit verification and inactivity jobs.
10. API integration/security tests and frontend integration.

## 14. Minimum acceptance tests

-   Missing or invalid token returns `401`.
-   Tourist calling an admin/rescue-only route returns `403`.
-   User B cannot read User A's trips or incidents.
-   A client cannot elevate its role by sending `role: "admin"` or
    change another user's ownership.
-   Duplicate SOS request with the same idempotency key returns the same
    incident and does not enqueue duplicate SMS.
-   Retry after a network timeout does not create a second incident.
-   SOS submission works without GPS coordinates.
-   Rescue cannot transition an incident assigned to another rescue
    account.
-   Invalid incident transitions return `409`.
-   Cron endpoint rejects missing/incorrect secret; admin sweep rejects
    non-admin users.
-   Public QR verification reveals no phone/location and gives the same
    invalid result for unknown/revoked IDs.
-   Rate-limited requests return `429` and retry guidance.
-   All audit-sensitive transitions append an audit entry.
-   Errors never expose stack traces, credentials, or sensitive data.

## 15. Open implementation notes

-   Keep this file synchronized with actual FastAPI routers and Pydantic
    schemas as they are implemented.
-   Confirm final table/column names against `DATABASE_SCHEMA.md`; this
    document intentionally avoids inventing schema-specific field
    requirements beyond the agreed concepts.
-   The API path list is the planned MVP contract. If implementation
    changes a path or response, update this file and the frontend client
    together.
-   Do not add blockchain, family dashboard, background GPS, FCM,
    numeric 0--100 safety scoring, or a separate SOS table to this MVP.
