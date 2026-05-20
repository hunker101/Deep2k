import { events, type Db } from '@deep2k/db';
import type { IngestEvent } from '@deep2k/shared';

const MAX_BATCH = 100;
const MAX_DELAY_MS = 1000;

let buffer: IngestEvent[] = [];
let timer: NodeJS.Timeout | null = null;
let dbRef: Db | null = null;

export function initQueue(db: Db): void {
  dbRef = db;
}

export function enqueue(event: IngestEvent): void {
  buffer.push(event);
  if (buffer.length >= MAX_BATCH) {
    void flush();
  } else if (!timer) {
    timer = setTimeout(() => {
      void flush();
    }, MAX_DELAY_MS);
  }
}

export async function flush(isRetry = false): Promise<void> {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (!dbRef || buffer.length === 0) return;
  const batch = buffer;
  buffer = [];
  try {
    await dbRef.insert(events).values(
      batch.map((e) => ({
        siteId: e.site_id,
        visitorId: e.visitor_id,
        path: e.path,
        referrer: e.referrer,
        country: e.country,
        device: e.device,
        timestamp: new Date(e.timestamp),
      })),
    );
    console.log(`[queue] flushed ${batch.length} events`);
  } catch (err) {
    if (!isRetry) {
      console.error('[queue] flush failed, retrying in 5s:', err);
      buffer = [...batch, ...buffer];
      setTimeout(() => void flush(true), 5_000);
    } else {
      console.error('[queue] flush retry failed, dropping', batch.length, 'events:', err);
    }
  }
}
