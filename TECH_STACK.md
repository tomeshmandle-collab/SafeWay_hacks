# SafeWay: Tech Stack & Engineering Context (for AI coding agents)

> Load this file as project context (e.g. `AGENTS.md`, `CLAUDE.md`, or `.cursor/rules`). It describes what SafeWay is, the exact stack, conventions, and constraints. Follow it unless the user says otherwise.
> Items marked **[Proposed]** are suggested defaults, not yet confirmed by the team. Ask before treating them as final. Do not invent versions: use the latest stable release and pin it in the lockfile.

---

## 1. Project summary

**SafeWay** is an AI-powered tourist safety and emergency assistance system, piloted for Manali (Himachal Pradesh, India). It combines:

1. **Smart safe routing** (hazard-aware, ranked alternatives)
2. **Live road condition and hazard alerts**
3. **Fair price checker** (taxi, guide, hotel, activities)
4. **Verified tourism services** (guides, taxis, hotels, operators)
5. **One-tap SOS** (location share, call police/ambulance, notify family)
6. **Community incident reporting** (photo + location)
7. **Trust layer:** tamper-proof verification records on Polygon Amoy testnet

**Users/roles:** `tourist`, `guide` (partner), `authority` (police/rescue), `admin`.

**Scope priority:** Road Safety is the core. Build and demo it first. Digital Tourist ID, geo-fencing, rescue dashboard and analytics are secondary.

---

## 2. Stack at a glance

| Layer | Technology |
|---|---|
| Frontend | Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui, Framer Motion |
| Backend | FastAPI (Python), Pydantic, Uvicorn |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| File storage | Supabase Storage |
| Maps | Leaflet, OpenStreetMap tiles |
| Routing | OpenRouteService (ORS) |
| Weather | OpenWeather API |
| Push notifications | Firebase Cloud Messaging (FCM) |
| Blockchain | Polygon Amoy testnet, Solidity, Hardhat |
| Deployment | Vercel (frontend), Render (backend) |

### Additions to the stack **[Proposed]**
| Need | Choice |
|---|---|
| PWA / offline | `next-pwa` or Serwist service worker, IndexedDB (via `idb`) |
| Geospatial queries | PostGIS extension in Supabase |
| ML / anomaly detection | scikit-learn (Isolation Forest) |
| Photo classification | Hosted vision-model API with a fixed prompt (no custom training) |
| Frontend data fetching | TanStack Query |
| Forms/validation | React Hook Form + Zod |
| Chain interaction | ethers.js |
| Testing | Vitest/Playwright (frontend), pytest (backend), Hardhat tests (contracts) |

---

## 3. Architecture

```
Browser / PWA (Next.js)
   |  REST (JSON) + Supabase JS client (auth, realtime)
   v
FastAPI backend  ---- Supabase (Postgres + PostGIS, Auth, Storage, Realtime)
   |
   |-- OpenRouteService  (directions, alternative_routes, avoid_polygons)
   |-- OpenWeather       (current weather, forecast)
   |-- FCM               (push to tourists/family/rescue)
   |-- Vision model API  (incident photo classification)
   |-- Polygon Amoy RPC  (write/verify hash records)
```

**Responsibilities**
- **Frontend:** UI, map rendering, geolocation, offline cache, calls FastAPI and Supabase.
- **FastAPI:** business logic, risk scoring, route ranking, price estimation, report validation, alert dispatch, blockchain writes. Verifies the Supabase JWT on every protected route.
- **Supabase:** source of truth for data, auth, and files. Row Level Security (RLS) enforces per-user access.
- **Blockchain:** stores hashes only (partner verification, incident/SOS log hashes). Never store personal data on-chain.

---

## 4. Repository layout **[Proposed]**

```
safeway/
  apps/
    web/                  # Next.js app
      app/                # routes (App Router)
      components/         # shadcn/ui + feature components
      lib/                # api client, supabase client, utils
      public/             # manifest.json, icons, service worker
    api/                  # FastAPI app
      app/
        main.py
        routers/          # routes, hazards, reports, prices, services, sos, auth
        services/         # risk_scoring, routing, weather, fcm, vision, chain
        models/           # Pydantic schemas
        core/             # config, security (JWT), deps
        tests/
      requirements.txt
  contracts/              # Hardhat project (Solidity, scripts, tests)
  supabase/
    migrations/           # SQL migrations (schema, RLS, PostGIS)
    seed/                 # demo seed data (labelled sample data)
  docs/
  AGENTS.md               # this file
```

---

## 5. Frontend rules (Next.js)

- **Next.js App Router, TypeScript strict mode.** No `any` unless justified in a comment.
- **Styling:** Tailwind + shadcn/ui components. Framer Motion for transitions only, not for essential state.
- **Leaflet:** import with `dynamic(() => import(...), { ssr: false })` because it requires `window`. Use OSM tiles with correct attribution.
- **Mobile first.** Tourists use phones; design touch-first. SOS must be reachable in one tap from any screen.
- **PWA:** installable manifest, service worker caching the app shell, current trip route, map tiles for the trip area. Queue offline reports in IndexedDB and sync when online.
- **Geolocation:** `navigator.geolocation.watchPosition` while the app is open. Browsers do not track in the background, so show a "keep the app open" notice on Start Journey. Do not claim continuous tracking.
- **HTTPS required** for geolocation and service workers. Test on the deployed URL.
- **Push:** FCM web push with `firebase-messaging-sw.js`. On iOS, push works only for an installed PWA.
- **State:** server state via TanStack Query; minimal global client state.
- **Accessibility:** large tap targets, high contrast, text labels with icons, readable in sunlight. Support English first, with i18n structure ready for Hindi.
- **Env:** only `NEXT_PUBLIC_*` variables are exposed to the browser. Never place service keys there.

## 6. Backend rules (FastAPI)

- **Python 3.11+**, Pydantic v2 models for all request/response bodies.
- **Auth:** validate the Supabase JWT (`Authorization: Bearer`) in a dependency; derive `user_id` and `role` from it. Never trust a `user_id` sent in the body.
- **Routing (OpenRouteService):**
  - Use `/v2/directions/{profile}` with `alternative_routes` to get candidates.
  - Use `options.avoid_polygons` to route around active hazard zones.
  - Rank candidates by the risk score below.
- **Risk score** (explainable, rule-based; ML can be layered later):
  `risk = w1·hazard_proximity + w2·weather_severity + w3·night_factor + w4·report_density`
  Weights live in config, and every score response includes the contributing factors.
- **Price checker:** return a **range** and a confidence note, never a single number. Baseline from seeded, cited rate cards; refine with user-submitted prices; flag outliers with an Isolation Forest.
- **Report validation:**
  - reporter GPS within ~500 m of the reported point
  - photo EXIF time/location consistency check (warn on mismatch)
  - per-user trust score (up on corroborated reports, down on rejected)
  - public alert only after N independent reports within a time window, or one authority confirmation
  - rate-limit reporting endpoints
- **Photo classification:** call the vision API with a fixed prompt returning `{category, confidence}`; log it, never present it as certain.
- **Weather:** the free tier supports current weather and forecast endpoints; check the plan before relying on any "One Call" style endpoint.
- **Alerts:** dispatch via FCM using the Firebase Admin SDK from the backend; store tokens per device.
- **CORS:** allow only the Vercel frontend origin(s).
- **Render free tier** sleeps when idle. Expose `/health` and ping it before demos.
- **Errors:** consistent JSON `{ "error": { "code", "message" } }`. Never leak stack traces.

## 7. Database (Supabase / Postgres) **[Proposed schema]**

Enable **PostGIS**. Use `geography(Point, 4326)` for points and `geography(Polygon, 4326)` for zones.

| Table | Key columns |
|---|---|
| `profiles` | `id (= auth.users.id)`, `role`, `full_name`, `phone`, `emergency_contact`, `blood_group`, `consent_share_at`, `trust_score` |
| `trips` | `id`, `user_id`, `destination`, `route_geojson`, `start_at`, `end_at`, `status` |
| `hazards` | `id`, `type`, `severity`, `geom`, `source` (`authority`/`crowd`/`feed`/`seed`), `status`, `expires_at`, `verified_by` |
| `reports` | `id`, `user_id`, `type`, `description`, `geom`, `media_path`, `exif_ok`, `ai_category`, `ai_confidence`, `status`, `created_at` |
| `services` | `id`, `kind` (`guide`/`taxi`/`hotel`/`operator`), `name`, `owner_id`, `status` (`pending`/`verified`/`rejected`), `docs_path`, `chain_tx_hash`, `record_hash` |
| `price_baselines` | `id`, `kind`, `route_or_item`, `min_price`, `max_price`, `source`, `updated_at` |
| `price_submissions` | `id`, `user_id`, `baseline_id`, `paid_price`, `created_at` |
| `sos_events` | `id`, `user_id`, `geom`, `created_at`, `status`, `responder_id`, `chain_tx_hash` |
| `family_links` | `id`, `tourist_id`, `family_user_id`, `permissions`, `expires_at` |
| `device_tokens` | `id`, `user_id`, `fcm_token`, `platform` |

**Security rules**
- **RLS on every table.** Users read and write only their own rows. Family and rescue access goes only through `family_links` or an active `sos_events` row.
- Medical fields are released only while an SOS is active.
- Do **not** collect Aadhaar or passport numbers; if ever needed, store masked values only.
- Storage buckets: `report-media` (authenticated upload, restricted read), `service-docs` (private).
- Service-role key lives only in the backend environment.

## 8. Blockchain (Polygon Amoy)

- **Network:** Polygon Amoy testnet (chain ID `80002`). Configure RPC URL in env. Fund the deployer wallet from a testnet faucet.
- **Tooling:** Hardhat, Solidity (`^0.8.x`), ethers.js.
- **Contract (single, simple) `SafeWayRegistry`:**
  - `registerRecord(bytes32 hash, uint8 kind)` callable only by an authorised verifier address
  - `isRecorded(bytes32 hash) → bool` and event `RecordRegistered(hash, kind, verifier, timestamp)`
  - `kind`: `1 = partner verification`, `2 = incident/SOS log`
- **Rules:**
  - Store **hashes only**. Hash a canonical JSON of the record (SHA-256 or keccak256) and keep the record in Supabase.
  - Backend signs transactions with a server-held key; it is never exposed to the frontend.
  - Provide a public **Verify** page: recompute the hash from the record, check `isRecorded`, show "verified" or "tampered".
- Be honest in the UI and pitch: this is a testnet prototype.

## 9. Feature to technology map

| Feature | Frontend | Backend / data |
|---|---|---|
| Safe route | Leaflet map, route cards with risk factors | ORS alternatives + risk score + `hazards` |
| Live road alerts | Alert list, map overlays, push | `hazards`, FCM, official feed ingestion (if available) |
| Price checker | Range display + "too high" warning | `price_baselines`, outlier detector |
| Verified services | Partner list, apply form, verify badge | `services`, admin approval, chain hash |
| SOS | Always-visible button, offline `sms:` fallback | `sos_events`, FCM to family/authority, chain log hash |
| Report problem | Camera upload, GPS tag, offline queue | Storage, EXIF check, vision classify, trust score |
| Weather | Weather card on trip screen | OpenWeather proxy via backend |
| Family view | Consent-gated live view | `family_links`, RLS, Realtime |
| Rescue/admin dashboards | Role-gated pages | Role checks via JWT claims |

## 10. Offline and low-network behaviour

- Service worker caches app shell, current route and trip-area tiles.
- IndexedDB stores emergency contacts and queued reports.
- **SOS fallback with no data:** open an `sms:` link prefilled with coordinates, user ID and time. No paid gateway needed.
- Show an explicit offline banner and queued-items count.

## 11. Environment variables

**Frontend (`apps/web/.env.local`)**
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_BASE_URL=
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_VAPID_KEY=
NEXT_PUBLIC_CHAIN_ID=80002
NEXT_PUBLIC_REGISTRY_ADDRESS=
```

**Backend (`apps/api/.env`)** (never commit)
```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=
ORS_API_KEY=
OPENWEATHER_API_KEY=
FIREBASE_SERVICE_ACCOUNT_JSON=
VISION_API_KEY=
AMOY_RPC_URL=
VERIFIER_PRIVATE_KEY=
REGISTRY_ADDRESS=
ALLOWED_ORIGINS=
```

Commit only `.env.example` files with blank values.

## 12. Deployment

- **Frontend:** Vercel. Set env vars in the dashboard. Preview deployments per branch.
- **Backend:** Render web service (`uvicorn app.main:app --host 0.0.0.0 --port $PORT`). Free tier sleeps: ping `/health` before demos or use an uptime pinger.
- **Supabase:** free projects pause when inactive: confirm the project is awake before demos.
- **Contracts:** deploy with Hardhat to Amoy; save the address to env; verify on the block explorer.

## 13. Demo mode (important for hackathon)

- Add a **demo mode** toggle that runs a scripted Manali trip: route shown, landslide alert triggers, price check shows ₹1,200–₹1,500 range, verified guide selected, SOS sent and visible on the rescue dashboard.
- Seed data must be clearly labelled "sample data" in the UI.
- Keep a recorded backup of the full flow.

## 14. Coding conventions

- **TypeScript:** strict, ESLint + Prettier, named exports, small components, colocate feature code.
- **Python:** type hints everywhere, Ruff + Black, routers thin and logic in `services/`.
- **SQL:** all schema changes via migration files in `supabase/migrations/`; never edit the live schema by hand without a migration.
- **Git:** small commits, descriptive messages, feature branches, no secrets in history.
- **Tests:** unit-test the risk scoring, report validation and price range logic; test contract functions in Hardhat; one end-to-end test for the demo path.
- **Docs:** update this file when the stack changes.

## 15. Rules for AI agents working in this repo

1. **Follow this stack.** Don't introduce a new framework, ORM, state library or cloud service without asking.
2. **Never hardcode secrets.** Use env vars and `.env.example`.
3. **Never put the Supabase service-role key or the blockchain private key in frontend code.**
4. **Always enforce authorization on the backend** by verifying the JWT; don't rely on UI hiding.
5. **Write RLS policies with every new table.**
6. **No personal data on-chain.** Hashes only.
7. **Be honest in UI copy:** label seeded data as sample data, label AI outputs with confidence, don't claim background tracking or production-grade blockchain.
8. **Keep SOS fast and simple:** minimal taps, works offline via fallback, no blocking network calls before the user sees confirmation.
9. **Prefer small, reviewable changes** and explain trade-offs when several approaches exist.
10. **If something here is marked [Proposed] or unclear, ask the user before building on it.**

## 16. Known limitations (state these, don't hide them)

- Web apps cannot track location reliably in the background (PWA, foreground only; native wrapper is future work).
- Real-time landslide and closure data is limited: sources are authority input, corroborated crowd reports, and any official feeds that prove usable.
- Polygon Amoy is a testnet.
- AI risk scoring is rule-based and explainable for now; ML improves as report data accumulates.
- Price baselines are seeded from cited rate cards and user submissions, not a complete market dataset.
