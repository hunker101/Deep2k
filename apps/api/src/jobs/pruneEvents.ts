import type { Db } from '@deep2k/db';
import { sql } from 'drizzle-orm';

export async function pruneOldEvents(db: Db, retentionDays = 90): Promise<number> {
  const result = await db.execute(
    sql`DELETE FROM events WHERE received_at < now() - (${retentionDays} || ' days')::interval`
  );
  return result.rowCount ?? 0;
}
