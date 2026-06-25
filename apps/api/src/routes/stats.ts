import { Router, type Request, type Response } from 'express';
import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { dailyStats, type Db } from '@deep2k/db';
import { z } from 'zod';
import { summaryCache } from '../summaryCache.js';

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

    try {
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
    } catch (err) {
      console.error('[overview] db error:', err);
      res.status(500).json({ error: 'db error' });
    }
  });

  // Sites list enriched with aggregate stats for the home page table.
  router.get('/sites-summary', async (req: Request, res: Response) => {
    const q = RangeQuery.safeParse(req.query);
    if (!q.success) { res.status(400).json({ error: 'invalid query' }); return; }

    const cacheKey = `${q.data.from ?? ''}|${q.data.to ?? ''}`;
    const cached = summaryCache.get(cacheKey);
    if (cached && Date.now() < cached.expires) {
      res.json(cached.data);
      return;
    }

    try {
    // Step 1: fast base query — sites + totals + last event via single GROUP BY
    const baseResult = await db.execute(sql`
      SELECT
        s.id,
        s.domain,
        s.script_path   AS "scriptPath",
        s.endpoint_path AS "endpointPath",
        s.beacon_method AS "beaconMethod",
        s.created_at        AS "createdAt",
        s.last_injected_at  AS "lastInjectedAt",
        s.category_id       AS "categoryId",
        COALESCE(SUM(ds.pageviews), 0)::int       AS "totalPageviews",
        COALESCE(SUM(ds.unique_visitors), 0)::int AS "totalVisitors",
        le.last_event                             AS "lastEvent"
      FROM sites s
      LEFT JOIN daily_stats ds ON ds.site_id = s.id
        ${q.data.from ? sql`AND ds.date >= ${q.data.from}` : sql``}
        ${q.data.to ? sql`AND ds.date <= ${q.data.to}` : sql``}
      LEFT JOIN (
        SELECT site_id, MAX(received_at) AS last_event
        FROM events
        GROUP BY site_id
      ) le ON le.site_id = s.id
      GROUP BY s.id, s.last_injected_at, s.category_id, le.last_event
      ORDER BY s.created_at DESC
    `);

    // Step 2: batch JSONB top-values for all sites at once
    const [topPages, topCountries, topDevices] = await Promise.all([
      db.execute(sql`
        SELECT site_id::text, key AS value FROM (
          SELECT site_id, key, SUM(value::int) AS cnt,
            ROW_NUMBER() OVER (PARTITION BY site_id ORDER BY SUM(value::int) DESC) AS rn
          FROM daily_stats, jsonb_each_text(top_paths)
          WHERE top_paths != '{}'
            ${q.data.from ? sql`AND date >= ${q.data.from}` : sql``}
            ${q.data.to ? sql`AND date <= ${q.data.to}` : sql``}
          GROUP BY site_id, key
        ) t WHERE rn = 1
      `),
      db.execute(sql`
        SELECT site_id::text, key AS value FROM (
          SELECT site_id, key, SUM(value::int) AS cnt,
            ROW_NUMBER() OVER (PARTITION BY site_id ORDER BY SUM(value::int) DESC) AS rn
          FROM daily_stats, jsonb_each_text(countries)
          WHERE countries != '{}'
            ${q.data.from ? sql`AND date >= ${q.data.from}` : sql``}
            ${q.data.to ? sql`AND date <= ${q.data.to}` : sql``}
          GROUP BY site_id, key
        ) t WHERE rn = 1
      `),
      db.execute(sql`
        SELECT site_id::text, key AS value FROM (
          SELECT site_id, key, SUM(value::int) AS cnt,
            ROW_NUMBER() OVER (PARTITION BY site_id ORDER BY SUM(value::int) DESC) AS rn
          FROM daily_stats, jsonb_each_text(devices)
          WHERE devices != '{}'
            ${q.data.from ? sql`AND date >= ${q.data.from}` : sql``}
            ${q.data.to ? sql`AND date <= ${q.data.to}` : sql``}
          GROUP BY site_id, key
        ) t WHERE rn = 1
      `),
    ]);

    // Build lookup maps
    const pageMap = Object.fromEntries(topPages.rows.map((r: any) => [r.site_id, r.value]));
    const countryMap = Object.fromEntries(topCountries.rows.map((r: any) => [r.site_id, r.value]));
    const deviceMap = Object.fromEntries(topDevices.rows.map((r: any) => [r.site_id, r.value]));

    const rows = baseResult.rows.map((r: any) => ({
      ...r,
      topPage: pageMap[r.id] ?? null,
      topCountry: countryMap[r.id] ?? null,
      topDevice: deviceMap[r.id] ?? null,
    }));

    summaryCache.set(cacheKey, { data: rows, expires: Date.now() + 5_000 });
    res.json(rows);
    } catch (err) {
      console.error('[sites-summary] db error:', err);
      res.status(500).json({ error: 'db error' });
    }
  });

  // Live visitor count — distinct visitors with events in the last 5 minutes.
  router.get('/stats/live', async (_req: Request, res: Response) => {
    try {
      const result = await db.execute(sql`
        SELECT
          site_id::text AS "siteId",
          COUNT(DISTINCT visitor_id)::int AS live
        FROM events
        WHERE received_at > now() - interval '5 minutes'
        GROUP BY site_id
      `);
      const perSite = Object.fromEntries(
        (result.rows as { siteId: string; live: number }[]).map(r => [r.siteId, r.live])
      );
      const total = Object.values(perSite).reduce((s, v) => s + v, 0);
      res.json({ total, perSite });
    } catch (err) {
      console.error('[live] db error:', err);
      res.status(500).json({ total: 0, perSite: {} });
    }
  });

  return router;
}
