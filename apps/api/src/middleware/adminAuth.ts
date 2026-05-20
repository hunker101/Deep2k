import { timingSafeEqual } from 'crypto';
import type { RequestHandler } from 'express';

export function adminAuth(token: string): RequestHandler {
  return (req, res, next) => {
    const header = req.header('authorization') ?? '';
    const expected = `Bearer ${token}`;
    try {
      const a = Buffer.from(header);
      const b = Buffer.from(expected);
      if (a.length !== b.length || !timingSafeEqual(a, b)) {
        res.status(401).json({ error: 'unauthorized' });
        return;
      }
    } catch {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }
    next();
  };
}
