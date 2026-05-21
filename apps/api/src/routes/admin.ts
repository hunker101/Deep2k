import { Router, type Request, type Response } from 'express';
import type { Db } from '@deep2k/db';
import { sites } from '@deep2k/db';
import { runAggregation } from '../jobs/aggregate.js';
import { flush } from '../queues/index.js';
import { sendDiscordReport } from '../jobs/discordReport.js';
import { pushSiteToKV } from '../lib/cloudflare.js';

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

  return router;
}
