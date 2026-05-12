import type { RequestHandler } from 'express';

// Placeholder for Phase 2. Per-site token bucket in dev (in-memory),
// Redis/Upstash in prod. For now: no-op so the call site is stable.
export function rateLimit(): RequestHandler {
  return (_req, _res, next) => next();
}
