# Deep2K Progress

## Current Status (May 24, 2026)
- 12 sites live, all showing Active
- Deployed on Render (API + Dashboard) from `nard` branch
- Cloudflare Worker handling beacons at `deep2k-worker.vantatech.workers.dev`
- Hourly aggregation running, Discord reports, cron jobs all working
- Boss has requested scaling to 450 sites (scratch setup) with first-party subdomains

---

## What We Just Finished
- Fixed status badge logic — now purely based on `lastEvent`, removed `totalPageviews` dependency
- Fixed stale → active flip without manual flush — cache invalidates automatically after queue flush
- Fixed API crashes — increased `connectionTimeoutMillis` to 30s, added try/catch to stats routes
- Fixed KV collision bug — 4 sites had duplicate endpoint paths, beacons were credited to wrong sites
- Expanded `ENDPOINT_PATH_POOL` from 8 to 20 paths
- Added `POST /admin/fix-collisions` endpoint — auto-detects and fixes duplicate paths
- All 12 sites confirmed Active

---

## Waiting On Boss
- List of 450 sites to onboard
- Who has DNS access to each store's Cloudflare account (needed for first-party subdomains)

---

## To Do (In Order)

### Urgent (before onboarding 450 stores)
- [ ] Upgrade database — free tier expires June 12, 2026
- [ ] Upgrade API server — currently 0.1 CPU 512MB free tier, not enough for 450+ sites
- [ ] Upgrade Cloudflare to Workers Paid plan — free plan KV write limits break at 500+ sites

### First-Party Subdomains
- [ ] Build first-party subdomain feature (e.g. `analytics.sellgital.com` → worker)
- [ ] Automate DNS CNAME record creation via Cloudflare API (so we don't click 450 domains manually)
- [ ] Update beacon script to use store's own subdomain instead of worker domain
- [ ] Re-inject scripts on all affected stores after subdomain setup

### Code Improvements (for scale)
- [ ] Generate truly unique endpoint paths per site (replace pool of 20 with random hex paths)
- [ ] Paginate `/sites-summary` API — currently fetches all sites at once, will timeout at 500+ sites
- [ ] Replace in-memory queue with Redis or proper queue — events lost on server restart
- [ ] Rewrite aggregation job — current correlated subquery approach breaks at 200+ active sites

### Onboarding 450 Sites
- [ ] Get list of 450 sites from boss
- [ ] Automate site creation + script injection (manual is not scalable at 450)
- [ ] Add CNAME record per store subdomain
- [ ] Inject tracker script on each Shopify store
