import { Router, type Request, type Response } from 'express';
import { and, desc, eq, gte, lte } from 'drizzle-orm';
import { dailyStats, type Db } from '@deep2k/db';
import { z } from 'zod';

const StatsQuery = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export function statsRouter(db: Db): Router {
  const router = Router();

  router.get('/sites/:id/stats', async (req: Request, res: Response) => {
    const q = StatsQuery.safeParse(req.query);
    if (!q.success) {
      res.status(400).json({ error: 'invalid query' });
      return;
    }
    const id = req.params.id ?? '';
    const conditions = [eq(dailyStats.siteId, id)];
    if (q.data.from) conditions.push(gte(dailyStats.date, q.data.from));
    if (q.data.to) conditions.push(lte(dailyStats.date, q.data.to));

    const rows = await db
      .select()
      .from(dailyStats)
      .where(and(...conditions))
      .orderBy(desc(dailyStats.date));
    res.json(rows);
  });

  return router;
}
