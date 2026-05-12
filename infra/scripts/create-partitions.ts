// Creates monthly partitions for the `events` table from (current month - 1)
// through (current month + N). Idempotent: safe to re-run.
//
// Usage:
//   pnpm --filter @deep2k/infra run partitions:create -- --months=6
//
// Production: schedule monthly (cron) so partitions exist before events land.
// New events for an unpartitioned date fall into events_default, which works
// but defeats partition pruning. Keep events_default as a safety net.

import pg from 'pg';

interface Args {
  months: number;
}

function parseArgs(): Args {
  const args = process.argv.slice(2);
  let months = 6;
  for (const a of args) {
    const m = a.match(/^--months=(\d+)$/);
    if (m && m[1]) months = parseInt(m[1], 10);
  }
  return { months };
}

function partitionName(year: number, month: number): string {
  return `events_${year}_${String(month).padStart(2, '0')}`;
}

function monthBounds(year: number, month: number): { start: string; end: string } {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const end = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
  return { start, end };
}

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }
  const { months } = parseArgs();
  const client = new pg.Client({ connectionString: url });
  await client.connect();

  try {
    const now = new Date();
    let year = now.getUTCFullYear();
    let month = now.getUTCMonth() + 1;  // JS months are 0-indexed
    // Start one month back to cover any late-arriving events near the boundary.
    month -= 1;
    if (month === 0) {
      month = 12;
      year -= 1;
    }

    for (let i = 0; i <= months; i++) {
      const name = partitionName(year, month);
      const { start, end } = monthBounds(year, month);
      const sql = `
        CREATE TABLE IF NOT EXISTS ${name}
        PARTITION OF events
        FOR VALUES FROM ('${start}') TO ('${end}');
      `;
      try {
        await client.query(sql);
        console.log(`ok    ${name}  [${start}, ${end})`);
      } catch (err) {
        // Most common cause: overlap with events_default that already has data
        // in this range. Postgres won't let you attach a partition over rows
        // that would belong to it. Fix: move those rows or recreate the default.
        console.error(`fail  ${name}: ${(err as Error).message}`);
      }

      month += 1;
      if (month === 13) {
        month = 1;
        year += 1;
      }
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
