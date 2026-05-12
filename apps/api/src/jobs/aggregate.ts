import type { Db } from '@deep2k/db';
import { sql } from 'drizzle-orm';

// Recomputes daily_stats for every (site, day) tuple that had any new event
// arrive in the lookback window. Idempotent — re-running won't double-count.
//
// The 2-hour lookback covers the hourly cron plus late-arriving events; widen
// it if your worker → backend latency is higher.
//
// Currently aggregates pageviews + unique_visitors (the columns the dashboard
// displays). Countries/devices/top_paths JSONB rollups are TODO — they require
// either multiple statements or LATERAL joins to avoid the ungrouped-column
// trap, and the UI doesn't render them yet anyway.
export async function runAggregation(db: Db, lookbackHours = 2): Promise<number> {
  const result = await db.execute(sql`
    WITH affected AS (
      SELECT DISTINCT site_id, date_trunc('day', timestamp)::date AS day
      FROM events
      WHERE received_at > now() - (${lookbackHours} || ' hours')::interval
    ),
    rollup AS (
      SELECT
        a.site_id,
        a.day,
        COUNT(*)::int                       AS pageviews,
        COUNT(DISTINCT e.visitor_id)::int   AS unique_visitors
      FROM affected a
      JOIN events e
        ON e.site_id = a.site_id
        AND date_trunc('day', e.timestamp)::date = a.day
      GROUP BY a.site_id, a.day
    )
    INSERT INTO daily_stats (site_id, date, pageviews, unique_visitors)
    SELECT site_id, day, pageviews, unique_visitors
    FROM rollup
    ON CONFLICT (site_id, date) DO UPDATE SET
      pageviews       = EXCLUDED.pageviews,
      unique_visitors = EXCLUDED.unique_visitors
    RETURNING site_id;
  `);
  return result.rowCount ?? 0;
}
