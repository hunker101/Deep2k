# Deep2K Improvement Plan

## Overview
Three improvements approved by Andrei to build into Deep2K. All changes are backend/dashboard only — no changes to the tracker script so stealth and undetectability are not affected.

---

## 1. Bot Filtering

### What it does
Filters out known bots and crawlers before they are counted as real visitors. This makes our visitor numbers more accurate.

### Two-layer approach

**Layer 1 — Cloudflare Worker level (first line of defense)**
- Detect and reject bots the moment the beacon arrives at the Worker
- Bot events never reach the API or get stored in the database
- Checks against known bot user-agent patterns (Googlebot, Bingbot, crawlers, scrapers, headless browsers, etc.)

**Layer 2 — Aggregation level (backup)**
- Even if a bot sneaks past the Worker, we skip it when calculating daily stats
- Ensures stats stay clean even if Layer 1 fails

### Files to modify
- `apps/worker/src/index.ts` — add bot user-agent check before processing beacon
- `apps/api/src/jobs/aggregate.ts` — add bot filter condition in aggregation queries

---

## 2. Real-Time Visitor Count

### What it does
Shows how many people are on the stores at this exact moment. Updates every 30 seconds.

### Where it shows

**Stat card at the top of the main analytics page**
- New card showing total live visitors across all 600+ stores combined
- Example: 🟢 Live Visitors — 24
- Updates every 30 seconds automatically

**Per store in the sites table**
- Small green dot with a live visitor count next to each store
- Example: 🟢 3 next to the store domain
- Shows at a glance which stores have active visitors right now

### How it works
- Count events received in the last 5 minutes per site as "live visitors"
- Dashboard polls the API every 30 seconds to refresh the count
- No WebSocket needed — simple polling is enough

### Files to modify
- `apps/api/src/routes/stats.ts` — add new endpoint `GET /stats/live` returning live visitor counts per site and total
- `apps/dashboard/src/app/page.tsx` — add live visitors stat card, add green dot per store in sites table
- `apps/dashboard/src/components/SitesTable.tsx` — add live visitor column

---

## 3. Acquisition Channel Classification (Mockup First)

### What it does
Groups referrer data into clean channel labels so you can see at a glance how much traffic is Paid vs Organic vs Direct vs Social.

### Channels
| Channel | Description |
|---|---|
| Organic Search | Visitors from Google, Bing, DuckDuckGo without clicking an ad |
| Paid Search | Visitors who clicked a paid ad on Google or Bing |
| Paid Social | Visitors who clicked a paid ad on Facebook, Instagram, TikTok |
| Organic Social | Visitors from Facebook, Instagram, TikTok without an ad |
| Direct | Visitors who typed the URL directly or came from a bookmark |
| Referral | Visitors who came from another website linking to the store |
| Email | Visitors who came from an email link |

### Where it shows
- Site detail page — new card alongside the existing Top Referrers card
- Top Referrers stays as is (shows raw referrer domains)
- Acquisition Channels card shows the grouped summary

### Features
- Each channel has a tooltip (ⓘ) explaining what it means on hover
- Clickable — click a channel to expand and see the specific platforms inside
  - Example: Paid Social → facebook.com (18), instagram.com (8), tiktok.com (4)
- Sorted by visitor count descending

### Step 1 — Mockup
- Build a visual mockup on one store with hardcoded/sample data
- Send screenshot to Andrei for approval
- Only proceed to full implementation after Andrei approves

### Step 2 — Full implementation (after approval)
- Build classification logic based on referrer domain + known platform lists
- Roll out to all stores

### Files to modify (mockup)
- `apps/dashboard/src/app/sites/[id]/page.tsx` — add acquisition channel card with mockup data

### Files to modify (full implementation)
- `apps/api/src/jobs/aggregate.ts` — classify referrers into channels during aggregation
- `packages/db/src/schema.ts` — add channel field to aggregated stats if needed
- `apps/dashboard/src/app/sites/[id]/page.tsx` — wire up real data

---

## Build Order

1. Bot filtering — most impactful for data accuracy, simplest to build
2. Real-time visitor count — Andrei said "super good", high priority
3. Acquisition channel mockup — needs Andrei approval before full build

---

## Stealth Note
All three improvements are backend and dashboard changes only. The tracker script injected into Shopify stores is not modified. Stealth and undetectability are not affected.
