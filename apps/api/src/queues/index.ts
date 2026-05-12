import type { IngestEvent } from '@deep2k/shared';

// Phase 2: replace with Cloudflare Queues / BullMQ. See ./README.md.
// For now this just logs so worker→api forwarding is visible during dev.
export async function enqueue(event: IngestEvent): Promise<void> {
  // TODO Phase 2: insert into events table here, batched.
  console.log('[queue] enqueue', {
    site_id: event.site_id,
    path: event.path,
    visitor_id: event.visitor_id,
  });
}
