import { randomBytes } from 'node:crypto';
import type { Db } from '@deep2k/db';
import { salts } from '@deep2k/db';
import { sql } from 'drizzle-orm';

async function pushToCloudflareKV(salt: string, env: {
  CF_ACCOUNT_ID: string;
  CF_KV_NAMESPACE_ID: string;
  CF_API_TOKEN: string;
}): Promise<void> {
  const url = `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/storage/kv/namespaces/${env.CF_KV_NAMESPACE_ID}/values/current_salt`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${env.CF_API_TOKEN}`,
      'Content-Type': 'text/plain',
    },
    body: salt,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`CF KV write failed (${res.status}): ${text}`);
  }
}

export async function rotateDailySalt(db: Db): Promise<void> {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const salt = randomBytes(32).toString('hex');

  // Always write to the salts table (dev mirror + audit trail).
  await db
    .insert(salts)
    .values({ date: today, salt })
    .onConflictDoUpdate({ target: salts.date, set: { salt: sql`EXCLUDED.salt` } });

  console.log(`[rotate-salt] wrote salt for ${today} to DB`);

  // Push to Cloudflare KV if credentials are present (prod only).
  const { CF_ACCOUNT_ID, CF_KV_NAMESPACE_ID, CF_API_TOKEN } = process.env;
  if (CF_ACCOUNT_ID && CF_KV_NAMESPACE_ID && CF_API_TOKEN) {
    await pushToCloudflareKV(salt, { CF_ACCOUNT_ID, CF_KV_NAMESPACE_ID, CF_API_TOKEN });
    console.log('[rotate-salt] pushed new salt to Cloudflare KV');
  } else {
    console.log('[rotate-salt] CF credentials not set — skipping KV push (dev mode)');
  }
}
