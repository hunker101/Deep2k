import type { Db } from '@deep2k/db';

// Phase 2: daily cron writes a new salt to Cloudflare KV (prod) and to the
// dev-only `salts` table. Worker reads `current_salt` from KV.
// In dev, the worker reads the latest row from `salts` instead.
export async function rotateDailySalt(_db: Db): Promise<void> {
  // TODO Phase 2
}
