interface WorkerSiteConfig {
  id: string;
  secret: string;
  endpoint_path: string;
  backend_url?: string | null;
}

interface CfCreds {
  accountId: string;
  apiToken: string;
  sitesKvNamespaceId: string;
}

function getCreds(): CfCreds | null {
  const { CF_ACCOUNT_ID, CF_API_TOKEN, CF_SITES_KV_NAMESPACE_ID } = process.env;
  if (!CF_ACCOUNT_ID || !CF_API_TOKEN || !CF_SITES_KV_NAMESPACE_ID) return null;
  return { accountId: CF_ACCOUNT_ID, apiToken: CF_API_TOKEN, sitesKvNamespaceId: CF_SITES_KV_NAMESPACE_ID };
}

async function kvPut(creds: CfCreds, key: string, value: object): Promise<void> {
  const url = `https://api.cloudflare.com/client/v4/accounts/${creds.accountId}/storage/kv/namespaces/${creds.sitesKvNamespaceId}/values/${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${creds.apiToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(value),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`CF KV write failed for key "${key}" (${res.status}): ${text}`);
  }
}

export async function pushSiteToKV(domain: string, config: WorkerSiteConfig, firstPartySubdomain?: string | null): Promise<void> {
  const creds = getCreds();
  if (!creds) {
    console.log('[cf-kv] credentials not set — skipping KV push (dev mode)');
    return;
  }

  const endpointPath = config.endpoint_path.startsWith('http')
    ? new URL(config.endpoint_path).pathname
    : config.endpoint_path;

  // Key format: "hostname:endpointPath"
  // Store under the store's own domain (for production with real domain).
  await kvPut(creds, `${domain}:${endpointPath}`, config);

  // Also store under the Worker's hostname (for workers.dev testing).
  const workerUrl = process.env.CF_WORKER_URL;
  if (workerUrl) {
    const workerHost = new URL(workerUrl).hostname;
    if (workerHost !== domain) {
      await kvPut(creds, `${workerHost}:${endpointPath}`, config);
    }
  }

  // Store under the first-party subdomain so beacons routed via that CNAME resolve correctly.
  if (firstPartySubdomain) {
    await kvPut(creds, `${firstPartySubdomain}:${endpointPath}`, config);
  }

  console.log(`[cf-kv] pushed site config for ${domain} to SITES_KV`);
}

export async function deleteSiteFromKV(domain: string, endpointPath: string, firstPartySubdomain?: string | null): Promise<void> {
  const creds = getCreds();
  if (!creds) return;

  const pathname = endpointPath.startsWith('http')
    ? new URL(endpointPath).pathname
    : endpointPath;

  const keysToDelete = [`${domain}:${pathname}`];

  const workerUrl = process.env.CF_WORKER_URL;
  if (workerUrl) {
    const workerHost = new URL(workerUrl).hostname;
    if (workerHost !== domain) {
      keysToDelete.push(`${workerHost}:${pathname}`);
    }
  }

  if (firstPartySubdomain) {
    keysToDelete.push(`${firstPartySubdomain}:${pathname}`);
  }

  await Promise.all(keysToDelete.map(key => {
    const url = `https://api.cloudflare.com/client/v4/accounts/${creds.accountId}/storage/kv/namespaces/${creds.sitesKvNamespaceId}/values/${encodeURIComponent(key)}`;
    return fetch(url, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${creds.apiToken}` },
    });
  }));

  console.log(`[cf-kv] deleted site config for ${domain} from SITES_KV`);
}
