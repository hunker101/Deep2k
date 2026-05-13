import { Router, type Request, type Response } from 'express';
import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { dailyStats, type Db } from '@deep2k/db';
import { z } from 'zod';

const RangeQuery = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export function statsRouter(db: Db): Router {
  const router = Router();

  // Per-site daily stats with optional date range.
  router.get('/sites/:id/stats', async (req: Request, res: Response) => {
    const q = RangeQuery.safeParse(req.query);
    if (!q.success) { res.status(400).json({ error: 'invalid query' }); return; }
    const id = req.params.id ?? '';
    const conditions = [eq(dailyStats.siteId, id)];
    if (q.data.from) conditions.push(gte(dailyStats.date, q.data.from));
    if (q.data.to) conditions.push(lte(dailyStats.date, q.data.to));
    const rows = await db.select().from(dailyStats).where(and(...conditions)).orderBy(desc(dailyStats.date));
    res.json(rows);
  });

  // Timestamp of the most recent event received for a site.
  router.get('/sites/:id/last-event', async (req: Request, res: Response) => {
    const id = req.params.id ?? '';
    const result = await db.execute(
      sql`SELECT MAX(received_at) AS last_event FROM events WHERE site_id = ${id}::uuid`
    );
    const row = result.rows[0] as { last_event: string | null } | undefined;
    res.json({ lastEvent: row?.last_event ?? null });
  });

  // Combined overview across all sites: aggregate totals + daily chart data.
  router.get('/overview', async (req: Request, res: Response) => {
    const q = RangeQuery.safeParse(req.query);
    if (!q.success) { res.status(400).json({ error: 'invalid query' }); return; }

    const conditions = [];
    if (q.data.from) conditions.push(gte(dailyStats.date, q.data.from));
    if (q.data.to) conditions.push(lte(dailyStats.date, q.data.to));
    const where = conditions.length ? and(...conditions) : undefined;

    const [totals, daily, siteCount] = await Promise.all([
      db.execute(sql`
        SELECT
          COALESCE(SUM(pageviews), 0)::int       AS total_pageviews,
          COALESCE(SUM(unique_visitors), 0)::int AS total_visitors
        FROM daily_stats
        ${q.data.from ? sql`WHERE date >= ${q.data.from}` : sql``}
        ${q.data.to ? sql`AND date <= ${q.data.to}` : sql``}
      `),
      db.select({
        date: dailyStats.date,
        pageviews: sql<number>`SUM(${dailyStats.pageviews})::int`,
        visitors: sql<number>`SUM(${dailyStats.uniqueVisitors})::int`,
      })
        .from(dailyStats)
        .where(where)
        .groupBy(dailyStats.date)
        .orderBy(dailyStats.date),
      db.execute(sql`SELECT COUNT(*)::int AS count FROM sites`),
    ]);

    const totalsRow = totals.rows[0] as { total_pageviews: number; total_visitors: number };
    const countRow = siteCount.rows[0] as { count: number };
    res.json({
      totalPageviews: totalsRow?.total_pageviews ?? 0,
      totalVisitors: totalsRow?.total_visitors ?? 0,
      siteCount: countRow?.count ?? 0,
      daily,
    });
  });

  // Sites list enriched with aggregate stats for the home page table.
  router.get('/sites-summary', async (req: Request, res: Response) => {
    const q = RangeQuery.safeParse(req.query);
    if (!q.success) { res.status(400).json({ error: 'invalid query' }); return; }

    const result = await db.execute(sql`
      SELECT
        s.id,
        s.domain,
        s.script_path   AS "scriptPath",
        s.endpoint_path AS "endpointPath",
        s.beacon_method AS "beaconMethod",
        s.created_at    AS "createdAt",
        COALESCE(SUM(ds.pageviews), 0)::int       AS "totalPageviews",
        COALESCE(SUM(ds.unique_visitors), 0)::int AS "totalVisitors"
      FROM sites s
      LEFT JOIN daily_stats ds ON ds.site_id = s.id
        ${q.data.from ? sql`AND ds.date >= ${q.data.from}` : sql``}
        ${q.data.to ? sql`AND ds.date <= ${q.data.to}` : sql``}
      GROUP BY s.id
      ORDER BY "totalPageviews" DESC
    `);

    res.json(result.rows);
  });

  return router;
}
