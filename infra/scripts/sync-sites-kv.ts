// One-off script: reads all sites from DB and pushes them to SITES_KV.
// Run after switching Cloudflare accounts so the new Worker knows about existing sites.
//
// Usage:
//   pnpm --filter @deep2k/infra run sync:kv

import pg from 'pg';

interface Site {
  id: string;
  domain: string;
  secret: string;
  endpoint_path: string;
  backend_url: string | null;
}

async function kvPut(
  accountId: string,
  namespaceId: string,
  apiToken: string,
  key: string,
  value: object,
): Promise<void> {
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(value),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`KV write failed for key "${key}" (${res.status}): ${text}`);
  }
}

async function main(): Promise<void> {
  const {
    DATABASE_URL,
    CF_ACCOUNT_ID,
    CF_API_TOKEN,
    CF_SITES_KV_NAMESPACE_ID,
    CF_WORKER_URL,
  } = process.env;

  if (!DATABASE_URL) { console.error('DATABASE_URL not set'); process.exit(1); }
  if (!CF_ACCOUNT_ID || !CF_API_TOKEN || !CF_SITES_KV_NAMESPACE_ID) {
    console.error('CF_ACCOUNT_ID, CF_API_TOKEN, CF_SITES_KV_NAMESPACE_ID required');
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const { rows } = await client.query<Site>(
    `SELECT id, domain, secret, endpoint_path, backend_url FROM sites ORDER BY created_at`
  );
  await client.end();

  console.log(`Found ${rows.length} sites — pushing to SITES_KV...`);

  const workerHost = CF_WORKER_URL ? new URL(CF_WORKER_URL).hostname : null;

  for (const site of rows) {
    const config = {
      id: site.id,
      secret: site.secret,
      endpoint_path: site.endpoint_path,
      backend_url: site.backend_url,
    };

    // Key: "domain:endpointPath"
    const key1 = `${site.domain}:${site.endpoint_path}`;
    await kvPut(CF_ACCOUNT_ID, CF_SITES_KV_NAMESPACE_ID, CF_API_TOKEN, key1, config);
    console.log(`  pushed  ${key1}`);

    // Also push under workerHost so workers.dev testing works
    if (workerHost && workerHost !== site.domain) {
      const key2 = `${workerHost}:${site.endpoint_path}`;
      await kvPut(CF_ACCOUNT_ID, CF_SITES_KV_NAMESPACE_ID, CF_API_TOKEN, key2, config);
      console.log(`  pushed  ${key2}`);
    }
  }

  console.log('Done.');
}

main().catch(err => { console.error(err); process.exit(1); });
