# Deep2K — Documentation

## What is Deep2K?

Deep2K is a private analytics and leads tracking system built for a network of Shopify stores. It tracks visitor traffic, captures orders and form submissions (leads), and reports daily summaries to Discord — all without relying on Shopify's built-in analytics.

---

## Stack

| Layer | Technology |
|---|---|
| Dashboard | Next.js (React) |
| API | Express (Node.js) |
| Database | PostgreSQL (Drizzle ORM) |
| Tracker | Cloudflare Worker |
| Hosting | Render (API + Dashboard) |
| KV Store | Cloudflare KV |

---

## How It Works

1. A tracker script is injected into each Shopify store
2. When a visitor lands on the store, the script sends a beacon to the Cloudflare Worker
3. The Worker forwards the beacon to the API
4. The API stores the event in PostgreSQL
5. Every hour, events are aggregated into daily stats per site
6. The dashboard reads those stats and displays them

---

## Features

### Analytics (Dashboard → Analytics tab)

- **Traffic overview** — total visitors, pageviews, active sites across all stores
- **Traffic chart** — daily visitor trend over selected period (Today / 7 Days / 30 Days / This Month)
- **Sites table** — per-store breakdown with visitors, pageviews, bounce rate, last event, status badge
- **Sort & filter** — search by domain, filter by category, sort by any column
- **Pagination** — 10 rows per page, resets on filter/sort change
- **Status badge** — Active (event in last 24h) / Stale (no recent event) / Never (no events ever)
- **Site detail page** — click a store to see its full stats, script, and settings

### Leads (Dashboard → Leads tab)

- **Leads table** — all orders and form submissions captured across all stores
- **Stat cards** — Total Leads, Orders, Form Submissions, Repeat Buyers, Sites with Leads
- **Repeat Buyers** — shows count + percentage of customers who submitted more than once
- **+Nx badge** — shown next to a customer's name when they appear more than once
- **Repeat filter** — toggle to show only repeat buyers
- **Customer history drawer** — click any row to open a slide-out panel showing the customer's full cross-store history (all stores visited, all orders/forms, total spent, first seen date)
- **Inline expand** — click the chevron (▼) on a row to expand it and see order details inline
- **CSV export** — download all visible leads as a CSV file
- **Period filter** — filter leads by time period

### Site Management

- **Add site** — add a new Shopify store to the network
- **Bulk upload** — add multiple stores at once via CSV
- **Categories** — organize stores into categories, bulk assign, filter by category
- **Get script** — generate the obfuscated tracker script to inject into a store
- **Mark as injected** — track which stores have the script installed
- **First-party subdomain** — set up a store-specific subdomain (e.g. `t.storename.com`) for better stealth tracking
- **Rotate scripts** — regenerate obfuscation parameters for all store scripts (do every 180 days)

### Shopify Webhook

- Stores can register a Shopify `orders/create` webhook pointing to the API
- Captures orders without needing the tracker script injected
- Useful for stores where script injection is not possible

### Discord Daily Report

Sent automatically every day at 8:00 AM UTC. Includes:

- Total visitors, pageviews, active sites
- Top 5 performing stores
- Bottom 3 performing stores
- Top 5 countries
- Device breakdown (mobile/desktop/tablet)
- Leads summary (orders, forms, repeat buyers, top stores by leads)
- Silent sites warning (stores with 0 events in 24h)
- Script rotation reminder (warns at 150 days, urgent at 180 days)

---

## Cron Jobs (run automatically on the API server)

| Job | Schedule | What it does |
|---|---|---|
| Aggregation | Every hour at :05 | Rolls up raw events into daily stats |
| Resync KV | Every hour | Pushes all site configs to Cloudflare KV |
| Prune events | Daily | Deletes old raw events to keep DB size down |
| Discord report | Daily at 8 AM UTC | Sends the daily summary to Discord |
| Create partitions | Weekly | Creates future DB table partitions |

---

## Admin Endpoints

All require `Authorization: Bearer <ADMIN_TOKEN>` header.

| Endpoint | Method | Description |
|---|---|---|
| `/admin/aggregate` | POST | Manually trigger aggregation |
| `/admin/resync-kv` | POST | Re-push all sites to Cloudflare KV |
| `/admin/discord-report` | POST | Manually trigger Discord report |
| `/admin/rotate-scripts` | POST | Rotate obfuscation for all scripts |
| `/admin/fix-collisions` | POST | Fix duplicate endpoint path conflicts |
| `/admin/rotation-status` | GET | Check days since last script rotation |
| `/admin/flush` | POST | Flush in-memory event buffer to DB |

---

## First-Party Subdomains

Instead of beacons going to `deep2k-worker.vantatech.workers.dev`, they go to a subdomain of the store itself (e.g. `t.oshawapeptides.ca`). This makes the tracker harder to detect and block.

**Setup per store:**
1. In the store's DNS, add a CNAME record: `t` → `deep2k-worker.vantatech.workers.dev`
2. In the dashboard, click the store → Enable First-Party Subdomain → enter `t.storename.com`
3. Re-inject the tracker script (it will now use the subdomain as the beacon URL)

---

## Script Rotation

The tracker scripts use obfuscated variable names and randomized timing to avoid detection. These should be rotated every 180 days.

1. Go to the dashboard → click **Rotate Scripts**
2. After rotation, re-inject the new script on every store
3. The Discord report will warn you when rotation is due

---

## Deployment

- **API + Dashboard** → hosted on Render, auto-deploys from `nard` branch
- **Cloudflare Worker** → deployed via `wrangler` from `apps/worker/`
- **Database** → PostgreSQL on Render

---

## Common Issues

| Issue | Cause | Fix |
|---|---|---|
| resync-kv ECONNRESET errors | Cloudflare API drops connections under parallel load | Normal — hourly cron retries automatically |
| Discord report 400 error | Embed field exceeded 1024 char limit | Fixed — silent sites capped at 20 |
| Store showing Stale | No events in last 24h — script may be blocked | Check if script is still injected on the store |
| DNS Error 1000 | Store's A record points to Cloudflare IP instead of Shopify | Fix A record → `23.227.38.65` |
