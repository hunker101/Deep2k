# Queues — Phase 2 placeholder

`enqueue(event)` currently calls the insert path synchronously. When ingestion
volume warrants real backpressure, swap the implementation without changing the
call site in `routes/ingest.ts`.

Decision matrix:

| Environment | Choice | Why |
|---|---|---|
| Cloudflare-native (prod) | **Cloudflare Queues** | Already on Cloudflare edge; same auth boundary; cheap. |
| Self-hosted backend | **BullMQ** on Redis | Standard Node ecosystem; observable via bull-board. |
| Local dev / tiny scale | **In-process** (current stub) | No infra to run. Good enough up to ~hundreds of events/sec. |

When swapping in a real queue: keep the same `enqueue(event: IngestEvent)`
signature and add a worker process that drains and inserts in batches.
