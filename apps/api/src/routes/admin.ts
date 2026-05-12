import { Router, type Request, type Response } from 'express';
import type { Db } from '@deep2k/db';
import { runAggregation } from '../jobs/aggregate.js';
import { flush } from '../queues/index.js';

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

  return router;
}
