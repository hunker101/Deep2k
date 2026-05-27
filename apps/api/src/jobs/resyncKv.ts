import { sites, type Db } from '@deep2k/db';
import { pushSiteToKV } from '../lib/cloudflare.js';

/**
 * Re-pushes every site from the DB into Cloudflare SITES_KV.
 * Run on startup and hourly so KV never drifts from the source of truth.
 */
export async function resyncKv(db: Db, workerUrl?: string): Promise<{ synced: number; errors: number }> {
  const rows = await db.select().from(sites);
  let synced = 0;
  let errors = 0;

  await Promise.all(rows.map(async (row) => {
    const endpointPath = workerUrl
      ? `${workerUrl.replace(/\/$/, '')}${row.endpointPath}`
      : row.endpointPath;
    try {
      await pushSiteToKV(row.domain, {
        id: row.id,
        secret: row.secret,
        endpoint_path: endpointPath,
        backend_url: row.backendUrl,
      }, row.firstPartySubdomain);
      synced++;
    } catch (err) {
      errors++;
      console.error(`[resync-kv] failed for ${row.domain}:`, err);
    }
  }));

  return { synced, errors };
}
