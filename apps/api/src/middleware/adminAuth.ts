import type { RequestHandler } from 'express';

export function adminAuth(token: string): RequestHandler {
  return (req, res, next) => {
    const header = req.header('authorization') ?? '';
    const expected = `Bearer ${token}`;
    if (header !== expected) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }
    next();
  };
}
