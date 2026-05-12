import { makeDb, type Db } from '@deep2k/db';

let cached: Db | null = null;

export function getDb(connectionString: string): Db {
  if (!cached) {
    cached = makeDb(connectionString).db;
  }
  return cached;
}
