import { Router, type Request, type Response } from 'express';
import type { Db } from '@deep2k/db';
import { sites } from '@deep2k/db';
import { eq, sql } from 'drizzle-orm';
import { runAggregation } from '../jobs/aggregate.js';
import { flush } from '../queues/index.js';
import { sendDiscordReport } from '../jobs/discordReport.js';
import { pushSiteToKV } from '../lib/cloudflare.js';
import { generateVariableSeed, pickBeaconMethod, pickInitDelayMs } from '@deep2k/tracker-generator';

export function adminRouter(db: Db): Router {
  const router = Router();

  // Force-flush the in-memory event buffer to the DB. Use before aggregation
  // in tests/dev so freshly POSTed events land in `events` before the rollup.
  router.post('/admin/flush', async (_req: Request, res: Response) => {
    try {
      await flush();
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  // Manually trigger the hourly aggregation. The real schedule runs every
  // hour at :05; this endpoint is for testing and ad-hoc recompute.
  router.post('/admin/aggregate', async (_req: Request, res: Response) => {
    try {
      const rows = await runAggregation(db);
      res.json({ ok: true, rows_upserted: rows });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  router.post('/admin/discord-report', async (_req: Request, res: Response) => {
    try {
      await sendDiscordReport(db);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  // Re-push every site from DB into Cloudflare SITES_KV.
  // Use this once after CF_WORKER_URL is corrected so all worker-host KV keys are written.
  router.post('/admin/resync-kv', async (_req: Request, res: Response) => {
    try {
      const rows = await db.select().from(sites);
      const workerUrl = process.env.CF_WORKER_URL;
      const results: { domain: string; status: string }[] = [];
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
          });
          results.push({ domain: row.domain, status: 'ok' });
        } catch (err) {
          results.push({ domain: row.domain, status: `error: ${String(err)}` });
        }
      }));
      res.json({ ok: true, synced: results.length, results });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  router.get('/admin/rotation-status', async (_req: Request, res: Response) => {
    try {
      const result = await db.execute(sql`
        SELECT value FROM app_settings WHERE key = 'scripts_last_rotated_at'
      `);
      const row = result.rows[0] as { value: string } | undefined;
      if (!row) { res.json({ lastRotatedAt: null, daysSince: null }); return; }
      const daysSince = Math.floor((Date.now() - new Date(row.value).getTime()) / (1000 * 60 * 60 * 24));
      res.json({ lastRotatedAt: row.value, daysSince });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  // Rotate obfuscation fields (variable names, beacon method, timing) for all sites.
  // Endpoint paths stay the same so existing Shopify injections keep working.
  // After running this, re-inject the new script from the dashboard on each store.
  router.post('/admin/rotate-scripts', async (_req: Request, res: Response) => {
    try {
      const rows = await db.select().from(sites);
      const results: { domain: string; status: string }[] = [];
      await Promise.all(rows.map(async (row) => {
        try {
          await db.update(sites)
            .set({
              variableSeed: generateVariableSeed(),
              beaconMethod: pickBeaconMethod(),
              initDelayMs: pickInitDelayMs(),
            })
            .where(eq(sites.id, row.id));
          results.push({ domain: row.domain, status: 'rotated' });
        } catch (err) {
          results.push({ domain: row.domain, status: `error: ${String(err)}` });
        }
      }));
      await db.execute(sql`
        INSERT INTO app_settings (key, value, updated_at)
        VALUES ('scripts_last_rotated_at', now()::text, now())
        ON CONFLICT (key) DO UPDATE SET value = now()::text, updated_at = now()
      `);

      res.json({
        ok: true,
        rotated: results.length,
        results,
        note: 'Re-inject the tracker script from the dashboard on each store.',
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  return router;
}
