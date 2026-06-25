# First-Party Beacon Rollout — 600 New Canada Stores

No code push needed. All steps are in Cloudflare and the Dashboard.

---

## Per CF Account (do once per account)

Before doing any store in a CF account, deploy the proxy worker if it's not there yet.

1. Go to the CF account
2. **Workers & Pages** → **Create application** → **Create Worker**
3. Name it `deep2k-proxy` → Deploy
4. Open the worker → **Edit code**
5. Select all (Ctrl+A), delete, paste this:

```js
export default {
  async fetch(request) {
    const url = new URL(request.url);
    url.hostname = 'deep2k-worker.vantatech.workers.dev';
    return fetch(url.toString(), {
      method: request.method,
      headers: request.headers,
      body: request.method !== 'GET' ? request.body : undefined,
    });
  }
}
```

6. Click **Deploy**

---

## Per Store (repeat for each of the 600 stores)

### Step 1 — Enable first-party (Dashboard)
1. Go to the dashboard → open the site
2. Click **Enable first-party**
3. Copy the subdomain it generates (e.g. `diagnostics.storename.ca`)

### Step 2 — Add CNAME (Cloudflare DNS)
1. Go to the CF account that owns the store's domain
2. Click the domain → **DNS**
3. Add record:
   - Type: `CNAME`
   - Name: `<subdomain prefix>` (e.g. `diagnostics`)
   - Target: `deep2k-worker.vantatech.workers.dev`
   - Proxy: **Proxied (orange cloud)** ← important
4. Save

### Step 3 — Add Worker Route (Cloudflare)
1. Still inside the same domain zone
2. Left sidebar → **Workers Routes**
3. Click **Add route**
   - Route: `<full subdomain>/*` (e.g. `diagnostics.storename.ca/*`)
   - Worker: `deep2k-proxy`
4. Save

### Step 4 — Re-inject tracker script (Shopify)
1. Dashboard → site → **Get Script**
2. Copy the script
3. Go to Shopify admin → **Online Store** → **Themes** → **Edit code**
4. Open `theme.liquid`
5. Replace the old Deep2k script with the new one
6. Save

---

## Verify

Open the store in a browser → DevTools → Network tab → reload  
Look for a request to `<subdomain>.storename.ca` → should return **200**

---

## Notes
- `deep2k-proxy` only needs to be deployed **once per CF account**
- Each store needs its own CNAME + Worker Route
- The subdomain is auto-generated when you click Enable first-party
