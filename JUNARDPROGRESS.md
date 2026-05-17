# Deep2k — Junard Session Progress

**Last updated:** 2026-05-17
**Session contributor:** Junard (hunker101)
**Status legend:** ✅ done · 🟡 partial · ❌ not started

---

## What Was Done This Session

### 1. Detection Vector Mitigations (all 4 remaining closed)

| Item | Status | Notes |
|---|---|---|
| **Salt rotation** | ✅ | `apps/api/src/jobs/rotateSalt.ts` fully implemented. Writes to `salts` DB table + pushes to Cloudflare KV via REST API if `CF_ACCOUNT_ID`, `CF_KV_NAMESPACE_ID`, `CF_API_TOKEN` are set. Dev mode skips KV push silently. Daily cron wired at `0 0 * * *` in `apps/api/src/index.ts`. |
| **Real obfuscation** | ✅ | `packages/tracker-generator/src/obfuscate.ts` now uses `javascript-obfuscator` with string array encoding (base64), control-flow flattening (75%), dead code injection (20%). Seed derived from `variable_seed` for reproducibility. |
| **Worker forward jitter** | ✅ | `apps/worker/src/index.ts` adds `Math.random() * 500ms` delay inside `waitUntil` before backend fetch. |
| **Multiple backend domains** | ✅ | `apps/api/src/env.ts` has optional `BACKEND_URLS` (comma-separated). `apps/api/src/routes/sites.ts` picks randomly at provisioning time. Worker uses `site.backend_url ?? env.BACKEND_URL`. |

---

### 2. New API Endpoints

All endpoints are under `/api` with bearer auth (`ADMIN_TOKEN`).

| Endpoint | Purpose |
|---|---|
| `GET /api/overview?from=&to=` | Combined totals + daily chart data across all sites |
| `GET /api/sites-summary?from=&to=` | Sites list enriched with aggregate pageviews + visitors |
| `GET /api/sites/:id/last-event` | Timestamp of last received event for a site |
| `GET /api/sites/:id/stats?from=&to=` | Per-site daily stats (already existed, date range added) |

---

### 3. Aggregator JSONB Rollups

`apps/api/src/jobs/aggregate.ts` now populates all three JSONB columns:
- `top_paths` — top 10 pages by hit count
- `countries` — top 10 countries by unique visitors
- `devices` — device breakdown by unique visitors

Previously these were always `{}`. Now populated on every hourly aggregation run.

---

### 4. Dashboard — Full Redesign

Matching the dark prototype design (screenshots provided by Junard).

**New files:**
- `apps/dashboard/src/middleware.ts` — cookie-based auth gate, redirects to `/login` if no token
- `apps/dashboard/src/app/login/page.tsx` — sign-in page with token input
- `apps/dashboard/src/app/api/login/route.ts` — sets `deep2k_token` httpOnly cookie
- `apps/dashboard/src/app/api/logout/route.ts` — clears cookie, redirects to `/login`
- `apps/dashboard/src/components/TrafficChart.tsx` — Recharts line chart (visitors + pageviews)
- `apps/dashboard/.env.local` — Next.js env file with `ADMIN_TOKEN` + `NEXT_PUBLIC_API_BASE`

**Redesigned files:**
- `apps/dashboard/src/app/layout.tsx` — full dark theme (`#080f0c` bg)
- `apps/dashboard/src/app/page.tsx` — "All sites" table with period tabs, search, stat cards, combined chart
- `apps/dashboard/src/app/sites/[id]/page.tsx` — site detail with chart, top pages/countries/devices panels, beacon config section
- `apps/dashboard/src/lib/api.ts` — updated with all new endpoint types and fetch helpers

**Dashboard features:**
- Login page (token-gated)
- Period filter: Today / Last 7 Days / Last 30 Days / This Month
- Domain search
- Sites table: domain, visitors, pageviews, endpoint, beacon method, status badge
- Combined traffic line chart across all sites
- Per-site: stat cards, line chart, top pages, top countries, device breakdown bar, beacon & worker config panel, last event received

---

### 5. Bug Fixes

| File | Fix |
|---|---|
| `packages/db/src/migrate.ts` | Added `ssl: { rejectUnauthorized: false }` for Render Postgres |
| `packages/db/src/client.ts` | Same SSL fix |
| `infra/scripts/seed-pilot.ts` | Fixed SITES_JSON always being `{}` when sites already existed — now queries existing rows |
| `packages/db/package.json` | Changed exports from `src/*.ts` → `dist/*.js` for production builds |
| `packages/shared/package.json` | Same |
| `packages/tracker-generator/package.json` | Same |

---

### 6. Production Deployment — Phase 1 Complete

| Component | Where | URL / ID |
|---|---|---|
| **API** | Render Web Service | `https://deep2k.onrender.com` |
| **Database** | Render Postgres | `dpg-d81m0cbtqb8s73fhq590-a` (Oregon) |
| **Cloudflare Worker** | Cloudflare Workers | `https://deep2k-worker.junard-chua123a.workers.dev` |
| **KV — DEEP2K_SALTS** | Cloudflare KV | `b7f4051ce32e418093520e7a18f90c35` |
| **KV — DEEP2K_SITES** | Cloudflare KV | `6d6717b1c52540838b658422354c923e` |
| **CF Account ID** | Cloudflare | `33e03180d7a0d6a1837153c26f3435b2` |
| **GitHub branch** | hunker101/Deep2k | `nard` branch |

**Render build command:**
```
npx pnpm install --prod=false && npx pnpm --filter @deep2k/db build && npx pnpm --filter @deep2k/shared build && npx pnpm --filter @deep2k/tracker-generator build && npx pnpm --filter @deep2k/api build
```

**Render start command:** `node dist/index.js`

**Render root directory:** `apps/api`

**Render env vars:** `DATABASE_URL`, `ADMIN_TOKEN`, `NODE_ENV=production`

---

## Environment Files

### `.env` (root, local only — not committed)
```
DATABASE_URL=postgresql://deep2k_db_user:...@dpg-d81m0cbtqb8s73fhq590-a.oregon-postgres.render.com/deep2k_db
API_PORT=3000
ADMIN_TOKEN=change-me-to-a-long-random-string
NEXT_PUBLIC_API_BASE=http://localhost:3000
CF_ACCOUNT_ID=33e03180d7a0d6a1837153c26f3435b2
CF_API_TOKEN=<private>
CF_KV_NAMESPACE_ID=b7f4051ce32e418093520e7a18f90c35
CF_SITES_KV_NAMESPACE_ID=6d6717b1c52540838b658422354c923e
```

### `apps/dashboard/.env.local` (local only — not committed)
```
NEXT_PUBLIC_API_BASE=http://localhost:3000
ADMIN_TOKEN=change-me-to-a-long-random-string
```

---

## How to Run Locally

**Terminal 1 — API:**
```powershell
cd C:\Users\junar\Documents\Deep2k
pnpm --filter @deep2k/api dev
```

**Terminal 2 — Dashboard:**
```powershell
cd C:\Users\junar\Documents\Deep2k
pnpm --filter @deep2k/dashboard dev
```

Open **http://localhost:3001** → sign in with `ADMIN_TOKEN` value.

---

## How to Inject Test Events (local)

```powershell
# Inject event
curl -X POST http://localhost:3000/ingest -H "Content-Type: application/json" -H "X-Site-Auth: 227c4b9ac895715ae96e64c56fe65493c84c13192fb2758f58b5605627501805" -d "{\"site_id\":\"a4327c60-07af-47de-ac3b-a4c3f3161210\",\"visitor_id\":\"abcdef1234567890\",\"path\":\"/test\",\"referrer\":\"\",\"country\":\"US\",\"device\":\"mobile\",\"timestamp\":1747130400000}"

# Flush queue to DB
curl -X POST http://localhost:3000/api/admin/flush -H "Authorization: Bearer change-me-to-a-long-random-string"

# Run aggregation
curl -X POST http://localhost:3000/api/admin/aggregate -H "Authorization: Bearer change-me-to-a-long-random-string"
```

Same commands work on production — replace `localhost:3000` with `https://deep2k.onrender.com`.

---

## What's Next

### Current Sprint — Dashboard Enhancement (pending commit, tested locally)

**New / changed files:**
- `apps/api/src/routes/stats.ts` — `sites-summary` now returns `topPage`, `topCountry`, `topDevice` per site
- `apps/dashboard/src/lib/api.ts` — `SiteSummaryRow` type updated with the three new fields
- `apps/dashboard/src/components/SitesTable.tsx` — sort by visitors/pageviews, filter tabs (All/Active/Inactive), `CountryBadge`, `DeviceIcon`
- `apps/dashboard/src/components/TrafficChart.tsx` — inline visitor/pageview toggle buttons with totals
- `apps/dashboard/src/components/AddSiteModal.tsx` — confirmation step before provisioning
- `apps/dashboard/src/components/FloatingActions.tsx` — new FAB combining Add Site + Bulk Upload
- `apps/dashboard/src/components/CopyButton.tsx` — new `'use client'` component with real clipboard copy + checkmark feedback (replaces broken `onClick={undefined}` stub)
- `apps/dashboard/src/app/page.tsx` — sticky header, FAB wired in, stat counts moved into chart

**Bug fixes in this sprint:**
- `apps/api/src/lib/cloudflare.ts` — `deleteSiteFromKV` was deleting the wrong KV key (used bare `domain` instead of `domain:endpointPath`). Now constructs the correct key and also deletes the secondary `workerHost:endpointPath` entry.
- `apps/api/src/routes/sites.ts` — updated call to `deleteSiteFromKV` to pass `row.endpointPath`

---

### Phase 2 — Shopify Injection (not started)
- Get tracker script from `GET /api/sites/:id/script` on Render
- Inject inline into Shopify `theme.liquid` (recommended — hides origin, no external load)
- Real events will flow: Shopify → CF Worker → Render API → DB → Dashboard
- Dashboard AddSiteModal already outputs the script — just needs copy-paste into theme

### Phase 2b — WordPress Injection (not started)
- Same approach — inline script into `functions.php` or a micro-plugin via `wp_head()`

### Phase 3 — Production Hardening (partial ✅)

| Item | Status | Notes |
|---|---|---|
| CF env vars on Render | ✅ | `CF_ACCOUNT_ID`, `CF_API_TOKEN`, `CF_SITES_KV_NAMESPACE_ID`, `CF_WORKER_URL` all set — KV sync is live |
| `TZ=UTC` on Render | ✅ | Already set — date alignment fixed |
| Worker reads sites from `SITES_KV` | ✅ | Worker checks KV first, falls back to `SITES_JSON`. API pushes to KV on every `POST /api/sites` |
| Attach real domain to Worker | ❌ | Need CF Worker route on each store's zone (store DNS through Cloudflare, route `store.com/<endpoint_path>` → Worker). Required for true first-party beacons. |
| Monthly partition management | ❌ | Partitions currently only go through July 2026. Need monthly cron or manual run of `infra/scripts/create-partitions.ts` before each new month. |

### Phase 4 — Monitoring (not started)
- Cron job checking `MAX(received_at)` per site — alert when >24h since last event
- Dashboard staleness badge (time-based, not period-relative)
- Worker error rate tracking (currently all backend errors are swallowed silently)

---

## Key Files Reference

| File | Purpose |
|---|---|
| `apps/worker/src/index.ts` | Cloudflare Worker — receives beacons, hashes visitor, forwards to API |
| `apps/worker/wrangler.toml` | Worker config — KV bindings, env vars, account ID |
| `apps/api/src/index.ts` | API entry — Express server, cron jobs (aggregation + salt rotation) |
| `apps/api/src/routes/ingest.ts` | Validates + queues incoming events |
| `apps/api/src/routes/stats.ts` | Stats endpoints including new overview + sites-summary |
| `apps/api/src/jobs/aggregate.ts` | Hourly aggregation with full JSONB rollups |
| `apps/api/src/jobs/rotateSalt.ts` | Daily salt rotation — DB write + CF KV push |
| `packages/tracker-generator/src/obfuscate.ts` | Script generation with real AST obfuscation |
| `packages/db/src/schema.ts` | Drizzle schema — sites, events, daily_stats, salts tables |
| `apps/dashboard/src/app/page.tsx` | Home page — all sites table + combined chart |
| `apps/dashboard/src/app/sites/[id]/page.tsx` | Site detail — charts, panels, beacon config |
| `apps/dashboard/src/lib/api.ts` | Dashboard API client — all fetch helpers + types |
| `apps/dashboard/src/middleware.ts` | Auth gate — redirects to /login if no cookie |
| `apps/dashboard/src/components/FloatingActions.tsx` | FAB — expands to Add Site + Bulk Upload buttons |
| `apps/dashboard/src/components/CopyButton.tsx` | Client component — clipboard copy with checkmark feedback |
| `apps/api/src/lib/cloudflare.ts` | KV sync — push/delete site configs to SITES_KV |
| `infra/scripts/seed-pilot.ts` | Seeds 5 pilot sites + prints SITES_JSON snippet |
