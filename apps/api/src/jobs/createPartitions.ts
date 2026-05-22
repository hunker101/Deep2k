import type { Db } from '@deep2k/db';
import { sql } from 'drizzle-orm';

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

// Creates partitions for current month + next `ahead` months. Idempotent.
export async function createPartitions(db: Db, ahead = 3): Promise<{ name: string; status: string }[]> {
  const now = new Date();
  let year = now.getUTCFullYear();
  let month = now.getUTCMonth() + 1;

  const results: { name: string; status: string }[] = [];

  for (let i = 0; i <= ahead; i++) {
    const name = partitionName(year, month);
    const { start, end } = monthBounds(year, month);
    try {
      await db.execute(
        sql.raw(`CREATE TABLE IF NOT EXISTS ${name} PARTITION OF events FOR VALUES FROM ('${start}') TO ('${end}')`)
      );
      results.push({ name, status: 'ok' });
      console.log(`[partitions] ${name} [${start}, ${end}) — ok`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({ name, status: `skipped: ${msg}` });
      console.warn(`[partitions] ${name} — skipped: ${msg}`);
    }

    month += 1;
    if (month === 13) { month = 1; year += 1; }
  }

  return results;
}
