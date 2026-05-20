import type { RequestHandler } from 'express';

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 120;
const windows = new Map<string, number[]>();

setInterval(() => {
  const cutoff = Date.now() - WINDOW_MS;
  for (const [key, times] of windows) {
    const fresh = times.filter(t => t > cutoff);
    if (fresh.length === 0) windows.delete(key);
    else windows.set(key, fresh);
  }
}, 5 * 60_000).unref();

export function rateLimit(): RequestHandler {
  return (req, res, next) => {
    const key = req.header('x-site-auth') ?? req.ip ?? 'unknown';
    const now = Date.now();
    const fresh = (windows.get(key) ?? []).filter(t => now - t < WINDOW_MS);
    if (fresh.length >= MAX_REQUESTS) {
      res.status(429).json({ error: 'rate limit exceeded' });
      return;
    }
    fresh.push(now);
    windows.set(key, fresh);
    next();
  };
}
