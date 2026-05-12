import type { Db } from '@deep2k/db';

// Phase 2: hourly cron rolls raw events → daily_stats.
// SQL sketch:
//   INSERT INTO daily_stats (site_id, date, pageviews, unique_visitors, countries, devices, top_paths)
//   SELECT
//     site_id,
//     date_trunc('day', timestamp)::date AS date,
//     count(*),
//     count(DISTINCT visitor_id),
//     jsonb_object_agg(country, c) FILTER (WHERE country <> '') OVER (PARTITION BY site_id, date_trunc('day', timestamp)),
//     ...
//   FROM events
//   WHERE received_at > now() - interval '1 hour'
//   GROUP BY site_id, date
//   ON CONFLICT (site_id, date) DO UPDATE SET ...;
export async function runAggregation(_db: Db): Promise<void> {
  // TODO Phase 2
}
