import type { Db } from '@deep2k/db';
import { sql } from 'drizzle-orm';

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
        COUNT(DISTINCT e.visitor_id)::int   AS unique_visitors,

        -- Top 10 paths by hit count
        (
          SELECT jsonb_object_agg(path, cnt)
          FROM (
            SELECT COALESCE(e2.path, '/') AS path, COUNT(*)::int AS cnt
            FROM events e2
            WHERE e2.site_id = a.site_id
              AND date_trunc('day', e2.timestamp)::date = a.day
              AND e2.path IS NOT NULL
            GROUP BY e2.path
            ORDER BY cnt DESC
            LIMIT 10
          ) t
        ) AS top_paths,

        -- Country visitor counts
        (
          SELECT jsonb_object_agg(country, cnt)
          FROM (
            SELECT COALESCE(e2.country, 'unknown') AS country, COUNT(DISTINCT e2.visitor_id)::int AS cnt
            FROM events e2
            WHERE e2.site_id = a.site_id
              AND date_trunc('day', e2.timestamp)::date = a.day
              AND e2.country IS NOT NULL AND e2.country <> ''
            GROUP BY e2.country
            ORDER BY cnt DESC
            LIMIT 10
          ) t
        ) AS countries,

        -- Device visitor counts
        (
          SELECT jsonb_object_agg(device, cnt)
          FROM (
            SELECT COALESCE(e2.device, 'unknown') AS device, COUNT(DISTINCT e2.visitor_id)::int AS cnt
            FROM events e2
            WHERE e2.site_id = a.site_id
              AND date_trunc('day', e2.timestamp)::date = a.day
            GROUP BY e2.device
            ORDER BY cnt DESC
          ) t
        ) AS devices

      FROM affected a
      JOIN events e
        ON e.site_id = a.site_id
        AND date_trunc('day', e.timestamp)::date = a.day
      GROUP BY a.site_id, a.day
    )
    INSERT INTO daily_stats (site_id, date, pageviews, unique_visitors, top_paths, countries, devices)
    SELECT site_id, day, pageviews, unique_visitors,
      COALESCE(top_paths, '{}'),
      COALESCE(countries, '{}'),
      COALESCE(devices, '{}')
    FROM rollup
    ON CONFLICT (site_id, date) DO UPDATE SET
      pageviews       = EXCLUDED.pageviews,
      unique_visitors = EXCLUDED.unique_visitors,
      top_paths       = EXCLUDED.top_paths,
      countries       = EXCLUDED.countries,
      devices         = EXCLUDED.devices
    RETURNING site_id;
  `);
  return result.rowCount ?? 0;
}
