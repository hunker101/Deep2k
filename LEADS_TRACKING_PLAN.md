# Leads Tracking — Implementation Plan

## What it does

Captures real customer actions on top of existing visitor tracking:
- Form submissions (contact, newsletter, chat widget pre-form, any form with an email field)
- Completed orders via Shopify webhooks (name, email, phone, address, products, discount code, payment method)

One script. No extra injection step — just replace the existing tracker script per store.

---

## What gets captured

| Source | Data |
|---|---|
| Any form submission | All fields (name, email, phone, message, etc.) + page URL |
| Shopify order completed | Name, email, phone, address, products, total, discount code, payment method |

### What we intentionally skip
- Password fields (type="password")
- Forms with no email field (search bars, filters, etc.)
- Forms inside iframes (e.g. embedded third-party widgets)
- Credit card info (Shopify never exposes this)

---

## Database

### New table: `leads`
```sql
CREATE TABLE leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid REFERENCES sites(id),
  type text NOT NULL, -- 'form' or 'order'
  fields jsonb NOT NULL DEFAULT '{}', -- all captured fields
  page_url text,
  created_at timestamptz DEFAULT now()
);
```

### Migration endpoint
`POST /admin/migrate-leads` — adds the leads table (one-time run after deploy)

---

## Backend changes

### 1. New endpoint: receive form leads
`POST /api/sites/:id/lead`
- Accepts `{ type, fields, page_url }`
- Saves to leads table
- No auth required (same as beacon)

### 2. New endpoint: Shopify webhook
`POST /api/webhooks/shopify/orders?site_id=<id>`
- Receives Shopify order payload
- Verifies HMAC signature (security)
- Extracts: name, email, phone, address, products, total, discount codes, payment method
- Saves to leads table as type='order'

### 3. New endpoint: fetch leads
`GET /api/sites/:id/leads?from=&to=&type=`
- Returns paginated leads for a site
- Filterable by date range and type

---

## Tracker script changes

Adds form listener on top of existing page view beacon. Still one script, slightly larger.

```js
// existing page view beacon (unchanged)
// ...

// new: form lead capture
document.addEventListener('submit', function(e) {
  const form = e.target;
  // skip if no email field
  if (!form.querySelector('[type="email"], [name*="email"]')) return;
  const fields = {};
  new FormData(form).forEach((value, key) => {
    if (key.toLowerCase().includes('password')) return; // skip passwords
    fields[key] = value;
  });
  navigator.sendBeacon(ENDPOINT, JSON.stringify({
    type: 'form',
    fields,
    page_url: location.href,
  }));
});
```

---

## Dashboard changes

### Top navigation — new tab
Add **Analytics** and **Leads** tabs at the top of the dashboard:
- **Analytics** (default) — existing overview, sites table, charts, all unchanged
- **Leads** — new leads tracking section

---

### Leads tab — main page (`/leads`)
Global leads view across all sites.

**Summary cards at top:**
- Total Leads
- Total Orders
- Total Form Submissions
- Active Sites with Leads

**Filters:**
- Date range (Today / 7d / 30d / Custom)
- Search by store domain
- Type filter: All / Orders / Forms

**Table — all leads across all sites:**

| Date | Store | Type | Name | Email | Phone | Page | Details |
|---|---|---|---|---|---|---|---|
| May 26, 2:14am | scarboroughpeptides.ca | Order | John Smith | john@gmail.com | +1 416-xxx | — | Expand |
| May 26, 1:30am | georginapeptides.ca | Form | Jane Doe | jane@gmail.com | — | /pages/contact | Expand |

- Expandable row shows full fields: products ordered, address, discount code, message, etc.
- Clicking the store name goes to that site's detail page

---

### Leads tab — per site page (`/leads/:id` or accessible from site detail)
Same as global leads page but filtered to one store.

**Summary cards:**
- Total Leads (this store)
- Orders
- Form Submissions
- Last lead received

**Same filters + table as global view but scoped to the site.**

---

### Site detail page (`/sites/:id`)
- New **Leads** row in Beacon & worker section:
  - Shows total leads count for this site
  - Link: "View all leads →" → goes to `/leads/:id`
- New **Webhook URL** row:
  - Shows the Shopify webhook URL for this site (copyable)
  - `https://deep2k.onrender.com/api/webhooks/shopify/orders?site_id=<id>`

---

### Main overview page (Analytics tab)
- New **Total Leads** stat card alongside existing pageviews/visitors cards

---

## Shopify webhook setup per store (manual, one time)

For each store you want order tracking on:
1. Shopify Admin → Settings → Notifications → Webhooks
2. Click **Create webhook**
3. Event: `Order creation`
4. URL: `https://deep2k.onrender.com/api/webhooks/shopify/orders?site_id=<site_id>`
5. Format: JSON
6. Save

Site ID can be copied from the dashboard site page.

---

## Re-injection required

Since the tracker script changes, all stores need the new script injected. Since you're already doing the first-party rollout, do both at the same time:
- Enable first-party → Get Script (new script includes form tracking) → inject

---

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Chat widget inside iframe | Can't capture | Skip iframes automatically |
| Password fields captured | Security issue | Filter out type="password" fields |
| Bot/spam form submissions | Junk data | Require email field to be present |
| Fake webhook requests | Injected fake orders | Verify Shopify HMAC signature |
| Re-injection on all stores | Time effort | Combine with first-party rollout |

---

## Build time estimate

| Task | Time |
|---|---|
| Database migration | 30 min |
| Form lead API endpoint | 2 hours |
| Shopify webhook endpoint + HMAC verify | 3 hours |
| Updated tracker script | 2 hours |
| Dashboard leads page | 3 hours |
| Overview stat card + site detail row | 1 hour |
| **Total** | **~1.5 days** |

---

## Build order

1. Database migration (`leads` table)
2. API endpoints (form lead + webhook)
3. Updated tracker script
4. Dashboard leads page
5. Overview + site detail updates
6. Test end-to-end on one store
7. Roll out to all stores (combine with first-party injection)
