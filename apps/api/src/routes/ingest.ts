import { Router, type Request, type Response } from 'express';
import { eq } from 'drizzle-orm';
import { sites } from '@deep2k/db';
import { IngestEventSchema } from '@deep2k/shared';
import type { Db } from '@deep2k/db';
import { enqueue } from '../queues/index.js';
import { rateLimit } from '../middleware/rateLimit.js';

export function ingestRouter(db: Db): Router {
  const router = Router();

  router.post('/ingest', rateLimit(), async (req: Request, res: Response) => {
    const auth = req.header('x-site-auth');
    if (!auth) {
      res.status(401).end();
      return;
    }

    const site = await db.query.sites.findFirst({
      where: eq(sites.secret, auth),
      columns: { id: true },
    });
    if (!site) {
      res.status(401).end();
      return;
    }

    const parsed = IngestEventSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid payload' });
      return;
    }
    if (parsed.data.site_id !== site.id) {
      res.status(403).end();
      return;
    }

    enqueue(parsed.data);
    res.status(204).end();
  });

  return router;
}
