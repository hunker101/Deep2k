# Deep2k — Progress vs. Spec

**Date:** 2026-05-13
**Scope:** Local-dev scaffold + Phase 2 (real ingest + aggregation) + Worker end-to-end verification.
**Backend:** Render-hosted Postgres (free tier).
**Status legend:** ✅ done · 🟡 partial / dev-only · ❌ not started.

---

## Headline

```
Architecture:        ████████████████░░░░  ~80%  (3-layer diagram runs end-to-end)
Diversification:     ███████████████░░░░░  ~75%  (paths/endpoints/methods done; AST obfuscation not)
Privacy plumbing:    ██████████░░░░░░░░░░  ~50%  (hash works; salt rotation missing)
Production glue:     ██░░░░░░░░░░░░░░░░░░  ~10%  (CF deploy, multi-backend, WP/Shopify injection)
Monitoring:          ░░░░░░░░░░░░░░░░░░░░   ~0%
```

The hard architectural problems are solved. Going to production for 2000 stores is mostly checklist work from here — not new architecture.

---

## 1. Architecture (3 layers) — fully wired

| Layer | Status | Evidence |
|---|---|---|
| Browser loads varied `/assets/c.js` | ✅ | 8 script paths in [packages/tracker-generator/src/pools.ts](packages/tracker-generator/src/pools.ts), assigned per-site |
| Browser beacons to varied `/_/p` | ✅ | 8 endpoint paths, hash-spread |
| Cloudflare Worker on each site's domain | ✅ | Multi-tenant deployment verified live in wrangler dev with 5 pilot hosts |
| Worker adds site_id context | ✅ | Host header → lookup in `SITES_JSON` (KV in prod) |
| Worker forwards over private channel | ✅ | `waitUntil(fetch(BACKEND_URL))` fire-and-forget |
| Central backend → time-series store | ✅ | Express + batched insert into partitioned `events` table |
| Dashboard reads aggregated data | ✅ | Next.js reads `daily_stats`, never raw `events` |

**End-to-end test (2026-05-12):** 5 pilot sites, Worker hop succeeded for happy + 404 paths. Dashboard shows `pageviews=6` for pilot-1, `pageviews=1` for pilot-3 after curl-driven event injection.

---

## 2. Detection Vector Mitigations — 6 of 9 covered

| Vector | Spec mitigation | Status |
|---|---|---|
| Shared 3rd-party tracking domain | First-party via edge worker | ✅ Worker runs on site's own host |
| Identical script content | Per-site obfuscation | 🟡 Variable names randomized; string literals & function shapes still identical |
| Identical script path | Path randomization | ✅ 8 paths |
| Identical beacon endpoint | Endpoint randomization | ✅ 8 endpoints |
| Same cookie names | Cookieless | ✅ |
| Predictable beacon timing | Jitter | 🟡 In-browser `init_delay_ms` is jittered 200–2000ms; Worker→backend forwards batched but not per-worker-jittered |
| Same JavaScript globals | IIFE + obfuscate globals | ✅ All vars are local inside IIFE |
| Backend domain leakage | 5–8 backend domains | ❌ **One backend** (Render). No distribution logic. |
| Shared TLS fingerprint | Cloudflare handles TLS | ✅ Will be ✅ when deployed; n/a in dev |

---

## 3. Components

### 3.1 Visitor Identification (cookieless)

| Item | Status |
|---|---|
| `sha256(ip + ua + salt + siteId).slice(0,16)` | ✅ [apps/worker/src/hash.ts](apps/worker/src/hash.ts) |
| Daily-rotating salt in Cloudflare KV | ❌ Hardcoded `DAILY_SALT` in `wrangler.toml`; no KV, no rotation cron |
| No IP/UA stored anywhere | ✅ Worker discards both after hashing |

### 3.2 Tracker Script generator

| Item | Status |
|---|---|
| Per-site template substitution | ✅ [packages/tracker-generator](packages/tracker-generator) |
| All 4 beacon methods | ✅ `sendBeacon`, `fetch`, `image`, `xhr` |
| Random init delay 200–2000ms | ✅ |
| 8 script paths × 8 endpoints × 4 methods | ✅ |
| `(script_path, endpoint_path, beacon, seed)` uniqueness | ✅ DB UNIQUE constraint |
| **AST-level obfuscation** (string array, control-flow flattening, dead code) | ❌ Only identifier renaming today |

### 3.3 Cloudflare Worker

| Item | Status |
|---|---|
| Match endpoint_path, 404 on miss | ✅ Tested |
| POST + GET pixel modes | ✅ Both verified (`POST 204`, `GET 200 image/gif`) |
| `CF-Connecting-IP` + User-Agent → hash | ✅ |
| Country enrichment via `request.cf.country` | 🟡 Correct code; empty in wrangler dev, populated in real CF |
| Device detection | ✅ [apps/worker/src/device.ts](apps/worker/src/device.ts) |
| `waitUntil` forward to backend with `X-Site-Auth` | ✅ |
| **KV-backed site config** | ❌ Currently env-injected JSON; KV wiring + sync webhook is Phase 3 |
| Per-site Worker deployment | n/a — chose **multi-tenant single deployment** per the approved plan, better for 2000 sites |

### 3.4 Backend Collector

| Item | Status |
|---|---|
| Validate `X-Site-Auth` → site lookup | ✅ [apps/api/src/routes/ingest.ts](apps/api/src/routes/ingest.ts) |
| Reject if `event.site_id !== site.id` | ✅ 403 |
| Insert into `events` | ✅ Batched (100 events or 1s), [apps/api/src/queues/index.ts](apps/api/src/queues/index.ts) |
| **5–8 backend collection domains** | ❌ One |
| Per-site secret, not shared | ✅ |

### 3.5 Data Model

| Item | Status |
|---|---|
| `sites` table with all spec columns | ✅ |
| `events` partitioned by `RANGE(timestamp)` | ✅ |
| `events_site_time` index | ✅ |
| `events_site_path_time` index (for top-paths queries) | ✅ Added beyond spec |
| `daily_stats` with `countries`/`devices`/`top_paths` JSONB | ✅ schema; 🟡 only `pageviews` + `unique_visitors` populated, JSONB left `{}` |
| Monthly partitions | ✅ Apr–Jul 2026 created; rotation script in [infra/scripts/create-partitions.ts](infra/scripts/create-partitions.ts) |

### Aggregator

| Item | Status |
|---|---|
| Hourly cron (`5 * * * *`) | ✅ node-cron in [apps/api/src/index.ts](apps/api/src/index.ts) |
| `INSERT...SELECT...GROUP BY...ON CONFLICT` | ✅ [apps/api/src/jobs/aggregate.ts](apps/api/src/jobs/aggregate.ts) |
| Recompute affected (site, day) tuples | ✅ |
| JSONB rollups (countries / devices / top_paths) | ❌ Deferred — needs LATERAL joins; UI doesn't render yet |

---

## 4. Per-site provisioning (operational)

| Step | Status |
|---|---|
| Generate per-site config | ✅ |
| Random `script_path` / `endpoint_path` / `beacon` / `seed` / `delay` / `secret` | ✅ |
| **`backend_url` from a pool of 5–8** | ❌ Always null |
| **Deploy Cloudflare Worker via CF API** | ❌ Not automated |
| Generate per-site tracker script | ✅ |
| **WordPress plugin injection** | ❌ Not started |
| **Shopify theme injection** | ❌ Not started |
| Record config in `sites` table | ✅ |

---

## 5. Operational Practices For Longevity

| Practice | Status |
|---|---|
| **Daily salt rotation** (KV cron) | ❌ [apps/api/src/jobs/rotateSalt.ts](apps/api/src/jobs/rotateSalt.ts) is empty |
| Annual site-secret rotation | ❌ |
| 6-month script regeneration + 404 on old paths | ❌ |
| 5–8 backend domains with distribution | ❌ |
| Worker traffic monitoring + alerts | ❌ |
| Don't pull tracker JS from CDN | ✅ Designed first-party |
| First-party pixel | ✅ |
| **Stagger batched forwards with per-worker jitter** | 🟡 Batched, no jitter |
| Minimal data only | ✅ |

---

## 6. Privacy

| Item | Status |
|---|---|
| No cookies | ✅ |
| No persistent identifier | 🟡 Hash shape is correct; salt isn't rotating in dev → technically persistent today. Becomes ✅ once rotation is wired. |
| IP/UA not stored | ✅ |
| No PII | ✅ |

---

## 7. Testing checklist

| Item | Status |
|---|---|
| Generate 50 site configs as pilot | 🟡 6 created (1 test + 5 pilots); generator can do 50 trivially |
| Verify scripts visibly differ | ✅ Vitest covers this in [packages/tracker-generator/src/obfuscate.test.ts](packages/tracker-generator/src/obfuscate.test.ts) |
| Deploy on 50 pilot sites | ❌ |
| Wappalyzer/BuiltWith verification | ❌ Requires real deployment |
| Dashboard counts vs. independent log | ✅ Partial — manual curl-count matched dashboard (5 → 5, 6 → 6) |

---

## 8. What's left, in priority order

1. **Salt rotation** — 1 hour — the only blocker for the "privacy is genuinely defensible" claim
2. **Real obfuscation** (string arrays, control-flow flattening) — 1–2 hours — closes the script-content detection vector
3. **Multiple backend domains + distribution** — ~30 min code, plus actual domain provisioning — closes the backend leakage vector
4. **Worker jitter on forwards** — ~15 min — closes the timing-pattern vector
5. **WordPress / Shopify injection tooling** — 1–3 hours each — required for any actual deployment
6. **Cloudflare deploy automation + KV wiring** — a few hours, plus needs real CF account and zones
7. **Monitoring / alerting** — separate project, ~1 day

Items 1–4 close the remaining detection vectors. Items 5–7 are deployment glue.
