# SafeWay --- Smart Tourist Safety & Emergency Assistance

> **Travel smart. Stay safe.**\
> An AI-assisted tourist-safety web app concept for safer routes,
> fair-price awareness, verified tourism services, and SOS incident
> reporting.

**Team:** Minions --- Mayank, Tomesh, Shivika, Yukta\
**Pilot setting:** Manali, Himachal Pradesh, India\
**Project event:** Build With Bharat 4.0 · Kirori Mal College,
University of Delhi

> **Project status:** This repository currently contains
> project-planning and technical documentation. The presence of an
> endpoint, feature, schema, or setup instruction in these documents
> does not mean that the corresponding code has already been
> implemented. Update this status when runnable application code is
> committed.

------------------------------------------------------------------------

## Contents

-   [Overview](#overview)
-   [Problem](#problem)
-   [MVP features](#mvp-features)
-   [What is real, mocked, and out of
    scope](#what-is-real-mocked-and-out-of-scope)
-   [Architecture](#architecture)
-   [Technology stack](#technology-stack)
-   [User roles](#user-roles)
-   [SOS workflow and limitations](#sos-workflow-and-limitations)
-   [Repository structure](#repository-structure)
-   [Configuration](#configuration)
-   [Development setup](#development-setup)
-   [Database and security](#database-and-security)
-   [Demo walkthrough](#demo-walkthrough)
-   [Deployment](#deployment)
-   [Testing checklist](#testing-checklist)
-   [Limitations and future work](#limitations-and-future-work)
-   [Documentation](#documentation)
-   [Team](#team)

## Overview

SafeWay brings several travel-safety tasks into one mobile-first web
experience:

1.  **Know before you go:** view route alternatives, nearby hazard
    information, and weather when available.
2.  **Avoid overpricing:** compare a quoted price with a clearly
    identified reference range.
3.  **Find trusted services:** browse service listings that an
    administrator has marked as verified.
4.  **Ask for help:** submit an SOS incident, track its status, and use
    SMS/call fallbacks when the network is unreliable.
5.  **Report a problem:** submit a location-aware report for
    administrative review.

The initial pilot scenario is a trip around Manali, where weather, road
closures, landslides, weak connectivity, and tourist overpricing are
relevant safety concerns.

SafeWay's risk calculations are **rules-based and advisory**. They
explain the factors available to the app; they are not a certified
prediction of safety.

## Problem

Tourists may face:

-   Road hazards, landslides, floods, closures, repairs, and accidents.
-   Unclear or inflated prices for taxis, guides, accommodation, and
    activities.
-   Difficulty distinguishing verified service providers from unverified
    listings.
-   Delays sharing location and context when asking for assistance.
-   Fragmented weather, road-condition, and safety information.
-   Weak mobile connectivity in some travel areas.

SafeWay aims to make useful information easier to access and make
emergency-report status more transparent.

## MVP features

### Core SOS and incident workflow

-   Supabase email/password authentication.
-   Two preferred emergency contacts, with consent recorded.
-   Location permission and a visible stop-sharing control.
-   Foreground-only trip location updates.
-   SOS submission with a client-generated idempotency key.
-   Local queueing and retries for unconfirmed submissions.
-   Prefilled SMS and emergency-call fallbacks.
-   A minimal rescue/admin incident queue.
-   Incident status history and a hash-chained audit ledger.

### Road-safety demo

-   Route alternatives from OpenRouteService, where available.
-   Ranking based on proximity to known hazard zones.
-   Hazard-zone advisories and freshness/source labels.
-   Weather card with an explicit unavailable state when the provider
    fails.
-   A price checker using seeded reference ranges.
-   Service listings that are shown as trusted only after verification.
-   User-submitted problem reports, pending administrative review.
-   An opaque, revocable public QR ID with limited public disclosure.

## What is real, mocked, and out of scope

The table describes the **intended MVP behavior**, not implementation
already present in this documentation-only repository.

  -----------------------------------------------------------------------
  Intended MVP behavior   Mocked or sample data   Not included in MVP
  ----------------------- ----------------------- -----------------------
  Supabase Auth and RLS   SMS provider writes to  Production emergency
                          a labelled "Mock SMS"   dispatch
                          outbox by default       

  Trip records and        Seeded hazard zones,    Background GPS tracking
  foreground location     services, and price     
                          baselines labelled as   
                          sample data             

  SOS incident lifecycle  Identity verifier       Direct production UIDAI
  and audit verification  labelled "Sandbox/Demo" integration

  Minimal rescue/admin    Shortened inactivity    Blockchain, Polygon,
  console                 windows in demo mode    Solidity, Hardhat

  Route alternatives and  Demo incidents and      Family dashboard or
  advisory hazard ranking sample listings         family role

  Price checks and        Mock SMS delivery       FCM push notifications
  reports                                         and service worker

  Revocable QR public ID  Seeded verification     Numeric 0--100 safety
                          status where applicable score or trained ML
                                                  predictions
  -----------------------------------------------------------------------

**Honesty rule:** do not describe a mock SMS as delivered, a submitted
incident as acknowledged, or a SafeWay record lookup as proof of legal
identity.

## Architecture

``` text
Browser — Next.js frontend (Vercel)
  ├── Supabase client under RLS
  │     ├── Auth/session
  │     ├── permitted reads
  │     └── permitted direct writes, e.g. emergency contacts
  │
  └── FastAPI REST API (/api/v1) — Render
        ├── JWT and role verification
        ├── SOS and incident lifecycle
        ├── location ingestion and advisory risk logic
        ├── route ranking and price checks
        ├── reports and service verification
        ├── audit ledger
        └── SMS provider adapter
              ├── mock outbox (MVP default)
              └── MSG91 (only when configured)

Supabase PostgreSQL + RLS + Storage + Realtime
  └── persisted records are the source of truth
```

### Architecture principles

-   **FastAPI is the only business backend.** Next.js handles the user
    interface and session experience.
-   **Supabase PostgreSQL is the source of truth.** Realtime distributes
    updates; it is not a separate source of truth.
-   **Authorization is layered.** FastAPI verifies tokens and
    permissions; RLS protects direct Supabase access.
-   **Privileged secrets stay server-side.** The Supabase service-role
    key bypasses RLS and must never reach the browser.
-   **Risk is advisory.** Show source, freshness, and reasons. Missing
    hazard data does not mean a route is safe.
-   **Graceful degradation matters.** A routing or weather failure
    should not prevent SOS submission; the UI must communicate
    unavailable services honestly.

## Technology stack

  -----------------------------------------------------------------------
  Layer                   Technology              Responsibility
  ----------------------- ----------------------- -----------------------
  Frontend                Next.js App Router,     Mobile-first web
                          TypeScript strict       interface

  UI/styling              Tailwind CSS,           Components and
                          shadcn/ui, Framer       restrained transitions
                          Motion                  

  Backend                 FastAPI, Python 3.11+,  Business logic and REST
                          Pydantic v2, Uvicorn    API

  Database                Supabase PostgreSQL     Persistent project data

  Authentication          Supabase Auth           Email/password sessions
                                                  and JWTs

  Authorization           PostgreSQL RLS +        Ownership and role
                          FastAPI checks          enforcement

  Realtime                Supabase Realtime       Push persisted changes
                                                  to clients

  Maps                    Leaflet + OpenStreetMap Map rendering

  Routing                 OpenRouteService        Route alternatives

  Weather                 OpenWeather API         Server-side weather
                                                  lookup

  SMS                     Provider abstraction:   Mock outbox for MVP;
                          `mock` or `msg91`       gateway only when
                                                  configured

  Frontend hosting        Vercel                  Next.js deployment

  Backend hosting         Render                  FastAPI deployment
  -----------------------------------------------------------------------

Versions should be pinned in package and Python lockfiles once the
application scaffold is created. Optional tools should not be treated as
confirmed dependencies until they are selected and added to the
repository.

## User roles

SafeWay has exactly four application roles:

  -----------------------------------------------------------------------
  Role                                Intended permissions
  ----------------------------------- -----------------------------------
  `tourist`                           Manage own profile, contacts,
                                      trips, location consent, SOS,
                                      reports, and own incident history

  `guide`                             Update only permitted fields of
                                      their own service listing through
                                      RLS; no guide UI in the MVP

  `rescue`                            View permitted incidents and
                                      perform allowed acknowledgement,
                                      assignment, and status transitions

  `admin`                             Rescue operations plus hazard-zone
                                      management, service/report
                                      verification, audit review, and
                                      demo job trigger
  -----------------------------------------------------------------------

Emergency contacts are **contact records, not user accounts**. There is
no family role, `super_admin`, or separate `authority` role in the MVP.

Self-registration always creates a tourist. Elevated roles are assigned
through an authorized seed process, not a public endpoint.

## SOS workflow and limitations

### Intended online flow

1.  The tourist presses SOS; a short countdown allows accidental
    cancellation.
2.  The client creates a UUID idempotency key and saves the pending
    request locally before sending it.
3.  The frontend attempts `POST /api/v1/sos` with a short timeout.
4.  If the server confirms durable acceptance, the client displays the
    incident reference and status.
5.  The rescue/admin console can acknowledge, assign, and update the
    incident.
6.  The tourist can view the persisted incident status and timeline.
7.  Sensitive lifecycle actions are written to the append-only audit
    ledger.

### Weak-network fallback

-   If the server cannot confirm submission, the client retains the
    request in its local queue and retries with the same idempotency
    key.
-   The UI offers a prefilled SMS to available, consented emergency
    contacts and call buttons for configured emergency numbers.
-   Opening the SMS or phone app does **not** prove a message was sent
    or delivered.
-   A manual SMS/call does not create a dashboard incident unless the
    server later accepts an API submission.
-   Offline SOS reaches the SafeWay dashboard only after the backend
    receives and accepts the request.
-   The web app is foreground-only; location tracking is not promised to
    continue when the browser is suspended or closed.

The UI must say **"Report sent to SafeWay response team"** only after
server acceptance. It must not claim that police or ambulance have been
notified.

## Repository structure

The repository currently contains planning documents. As application
code is added, a possible structure is:

``` text
SafeWay_hacks/
├── README.md
├── context.md
├── PRD.md
├── API_STRUCTURE.md
├── API_ENDPOINTS.md
├── AUTH_REQUIREMENTS.md
├── BUSINESS_LOGIC.md
├── DATABASE_MODELS.md
├── DATABASE_SCHEMA.md
├── SECURITY.md
├── TECH_STACK.md
├── Safety_Architecture.md
├── Safety_Feature_List.md
├── system_design.md
├── user_flow.md
├── frontend/                 # planned Next.js application
├── backend/                  # planned FastAPI application
├── supabase/
│   └── migrations/           # planned SQL migrations
└── tests/                    # planned automated tests
```

The final folder names may be adjusted when the actual frontend/backend
scaffold is committed. Do not create duplicate or stale architecture
files just to match this illustrative tree.

## Configuration

Create local environment files from blank examples once the application
scaffold exists. **Never commit `.env`, `.env.local`, tokens,
service-role keys, SMS credentials, or cron secrets.**

### Frontend: `.env.local`

``` dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_BASE_URL=
```

Only public client configuration belongs in `NEXT_PUBLIC_*` variables.
Never put the Supabase service-role key in the frontend environment.

### Backend: `.env`

``` dotenv
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=
# Or configure JWT JWKS verification according to the Supabase project.
ORS_API_KEY=
OPENWEATHER_API_KEY=
SMS_PROVIDER=mock
MSG91_AUTH_KEY=
MSG91_SENDER_ID=
MSG91_TEMPLATE_ID_SOS=
MSG91_TEMPLATE_ID_INACTIVITY=
CRON_SECRET=
ALLOWED_ORIGINS=
DEMO_MODE=false
```

Use `SMS_PROVIDER=mock` for the demo unless MSG91 credentials and
required sender/template configuration are actually available.
`DEMO_MODE=true` shortens inactivity alert windows for a demonstration;
do not leave it enabled unintentionally in a public deployment.

### Configuration notes

-   `SUPABASE_SERVICE_ROLE_KEY` is backend-only and bypasses RLS.
-   `SUPABASE_JWT_SECRET` or JWKS settings must match the project's
    Supabase JWT configuration.
-   `ALLOWED_ORIGINS` should contain only trusted frontend origins.
-   `CRON_SECRET` protects the internal inactivity-sweep endpoint.
-   Keep `.env.example` files blank of real credentials.
-   Enable repository secret scanning and push protection.

## Development setup

> **Current status:** the repository is documentation-first. The
> commands below describe the intended workflow after `frontend/`,
> `backend/`, and the Supabase migrations have been created. They will
> not work until the corresponding code and dependency files exist.

### Prerequisites

-   Node.js version supported by the chosen Next.js release.
-   Python 3.11 or newer.
-   A Supabase project.
-   OpenRouteService and OpenWeather API keys for map/routing/weather
    functionality.
-   Optional MSG91 configuration for real SMS gateway integration; mock
    SMS is the default demo mode.

### Intended setup sequence

1.  Clone the repository.
2.  Create the Next.js frontend scaffold and FastAPI backend scaffold.
3.  Install dependencies and commit lockfiles.
4.  Configure local frontend/backend environment files.
5.  Create and apply the SQL migrations in `supabase/migrations/`.
6.  Seed demo users, roles, hazard zones, service listings, and price
    baselines using synthetic data.
7.  Start the backend and frontend using the commands added to their
    respective package/project configuration.
8.  Verify JWT checks, RLS policies, SOS idempotency, incident
    transitions, and the demo fallback flow before presenting.

No generic `npm run dev` or `uvicorn ...` command is included here
because the current repository does not yet define the corresponding
scripts or Python module entry point. Add exact commands when those
files are committed.

## Database and security

The planned database uses Supabase PostgreSQL with RLS enabled for every
applicable table. Business-rule writes are handled through FastAPI;
limited direct browser writes are permitted only where the schema and
RLS policy explicitly allow them.

Core concepts include:

-   `profiles`
-   `emergency_contacts`
-   `trips`
-   `location_updates`
-   `incidents`
-   `incident_events`
-   `hazard_zones`
-   `reports`
-   `services`
-   `price_baselines`
-   `notifications`
-   `idempotency_keys`
-   `audit_ledger`

The final canonical table list, SQL definitions, constraints, grants,
and policies are maintained in `DATABASE_SCHEMA.md`.

### Security baseline

-   Verify JWTs on protected FastAPI endpoints.
-   Read app roles only from verified `app_metadata.role`.
-   Enforce authorization in FastAPI and RLS.
-   Test RLS using two real test accounts; the service-role key bypasses
    RLS and cannot prove that policies work.
-   Use an idempotency key for SOS, location batches, and reports.
-   Rate-limit SOS, reports, location updates, and public QR lookups.
-   Keep location consent explicit and location retention limited.
-   Do not store or log Aadhaar/passport numbers or medical notes in the
    MVP.
-   Keep the audit ledger append-only and verify its hash chain.
-   Use synthetic demo accounts and clearly labelled sample data.

SafeWay should be described as **aligned with DPDP Act 2023
principles**, not as legally compliant or certified.

## Demo walkthrough

Use synthetic accounts and clearly labelled sample data.

1.  Sign in as a seeded tourist.
2.  Add consented emergency contacts and grant location permission.
3.  Start a Manali trip and show foreground-only location status.
4.  View route alternatives and a seeded hazard warning; explain the
    advisory factors.
5.  Check a sample taxi quote against the seeded reference range.
6.  Open a verified sample service.
7.  Submit an SOS and show its incident reference.
8.  Sign in as rescue/admin and acknowledge, assign, and update the
    incident.
9.  Return to the tourist view and show the persisted status update.
10. Run audit verification and show the result.
11. If demonstrating weak-network behavior, distinguish a locally queued
    SOS from a server-accepted incident and explain that opening the SMS
    app does not confirm delivery.

Before the demo, verify that the deployed app, database migrations,
seeded accounts, external keys, and mock provider configuration actually
work. Do not present a planned step as implemented until it has been
tested.

## Deployment

### Frontend --- Vercel

-   Deploy the Next.js application.
-   Set the three frontend environment variables in Vercel.
-   Restrict backend CORS to the deployed frontend origin.
-   Do not place server-side secrets in public frontend variables.

### Backend --- Render

-   Deploy the FastAPI application with its pinned Python dependencies.
-   Set backend secrets as Render environment variables.
-   Configure health checks and the `GET /health` endpoint.
-   Keep the service-role key, provider keys, and cron secret private.
-   Account for possible cold starts on a free tier; a slow first
    request must not be presented as an SOS delivery guarantee.

### Supabase

-   Apply schema only through ordered migrations.
-   Enable and verify RLS policies.
-   Configure Auth and Realtime publication only for the intended
    tables/channels.
-   Confirm retention/purge jobs and backups are configured before
    claiming they operate.
-   Test a restore if recovery has to be described as verified.

### Scheduled inactivity sweep

The intended design uses Supabase `pg_cron` + `pg_net` to call
`/internal/jobs/inactivity-sweep` every five minutes, with a
cron-job.org fallback if needed. The endpoint must require a secret
header. The demo-only `/api/v1/admin/jobs/inactivity-sweep` endpoint
uses an admin JWT and must never expose the cron secret to the browser.

## Testing checklist

Before a demo or release, verify:

-   [ ] Missing/invalid JWT returns `401`.
-   [ ] A tourist cannot call rescue/admin-only operations.
-   [ ] One tourist cannot read another tourist's private trip or
    incident.
-   [ ] RLS is tested with two separate accounts, not the service-role
    key.
-   [ ] Repeated SOS submissions with the same key do not create
    duplicate incidents or SMS outbox rows.
-   [ ] SOS submission can proceed when GPS is unavailable.
-   [ ] Incident transitions follow the canonical state machine.
-   [ ] Rescue users cannot update incidents assigned to another rescue
    user.
-   [ ] Invalid or missing cron secret is rejected.
-   [ ] Public QR lookup reveals no phone numbers or exact location.
-   [ ] Rate limits work and return retry guidance.
-   [ ] Weather/routing failure produces a visible unavailable state.
-   [ ] Audit-chain verification runs against the actual ledger.
-   [ ] No stack traces, tokens, secrets, or sensitive location data
    appear in client responses or logs.

## Limitations and future work

Not part of the MVP:

-   Certified emergency dispatch or direct police/ambulance integration.
-   Guaranteed SMS delivery.
-   Background GPS tracking or native mobile applications.
-   Full offline application support, service worker, and Background
    Sync.
-   Family dashboard or family role.
-   Blockchain, smart contracts, and on-chain identity.
-   Trained ML prediction or numeric 0--100 safety scoring.
-   FCM push notifications.
-   Photo AI/EXIF scanning, analytics, partner onboarding, and advanced
    geospatial/PostGIS features.
-   Production Aadhaar/UIDAI integration.
-   Admin MFA, distributed rate limiting, log shipping, and a full
    penetration test.

These may be considered later, but must not be described as MVP
capabilities.

## Documentation

  -----------------------------------------------------------------------
  Document                            Purpose
  ----------------------------------- -----------------------------------
  `context.md`                        Canonical decisions, scope, stack,
                                      and agent instructions

  `PRD.md`                            Product requirements and MVP
                                      acceptance criteria

  `API_STRUCTURE.md`                  API architecture, conventions,
                                      security flow, and folder layout

  `API_ENDPOINTS.md`                  Endpoint index, request/response
                                      examples, and route-specific rules

  `AUTH_REQUIREMENTS.md`              Role permissions and authentication
                                      requirements

  `BUSINESS_LOGIC.md`                 SOS retries/fallbacks, incident
                                      transitions, and business rules

  `DATABASE_MODELS.md`                Data model and type definitions

  `DATABASE_SCHEMA.md`                SQL migrations, constraints,
                                      indexes, RLS, and audit ledger

  `SECURITY.md`                       Threat model, privacy, rate limits,
                                      and security checklist

  `TECH_STACK.md`                     Technology and implementation
                                      guidance

  `Safety_Architecture.md`            Older architecture reference; defer
                                      to `context.md` for conflicts

  `Safety_Feature_List.md`            Older broad feature catalogue; not
                                      the MVP scope

  `system_design.md`                  Earlier system-design draft; defer
                                      to current decisions

  `user_flow.md`                      Earlier user-flow draft; defer to
                                      current decisions
  -----------------------------------------------------------------------

**Document precedence:** `context.md` records the canonical project
decisions. `PRD.md` is authoritative for its explicit resolved
requirements. Older broad feature and architecture drafts contain
superseded ideas; do not reintroduce blockchain, family features,
background tracking, or the numeric safety score from those drafts.

## Team

**Team Minions**

-   Mayank
-   Tomesh
-   Shivika
-   Yukta

Built for **Build With Bharat 4.0**, with the project piloted around
Manali, Himachal Pradesh.

------------------------------------------------------------------------

*SafeWay is a safety-support prototype. It does not replace emergency
services, official travel advisories, or professional judgement. Always
communicate uncertainty, data freshness, and delivery status clearly.*
