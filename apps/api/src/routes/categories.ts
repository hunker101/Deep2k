import { Router, type Request, type Response } from 'express';
import { eq } from 'drizzle-orm';
import { categories, type Db } from '@deep2k/db';

export function categoriesRouter(db: Db): Router {
  const router = Router();

  router.get('/categories', async (_req: Request, res: Response) => {
    const rows = await db.select().from(categories).orderBy(categories.createdAt);
    res.json(rows);
  });

  router.post('/categories', async (req: Request, res: Response) => {
    const { name } = req.body as { name?: string };
    if (!name?.trim()) { res.status(400).json({ error: 'name required' }); return; }
    try {
      const [row] = await db.insert(categories).values({ name: name.trim() }).returning();
      res.status(201).json(row);
    } catch (err) {
      if (isUniqueViolation(err)) { res.status(409).json({ error: 'Category name already exists.' }); return; }
      throw err;
    }
  });

  router.patch('/categories/:id', async (req: Request, res: Response) => {
    const id = req.params.id ?? '';
    const { name } = req.body as { name?: string };
    if (!name?.trim()) { res.status(400).json({ error: 'name required' }); return; }
    try {
      const [row] = await db.update(categories).set({ name: name.trim() }).where(eq(categories.id, id)).returning();
      if (!row) { res.status(404).end(); return; }
      res.json(row);
    } catch (err) {
      if (isUniqueViolation(err)) { res.status(409).json({ error: 'Category name already exists.' }); return; }
      throw err;
    }
  });

  router.delete('/categories/:id', async (req: Request, res: Response) => {
    const id = req.params.id ?? '';
    const [row] = await db.delete(categories).where(eq(categories.id, id)).returning();
    if (!row) { res.status(404).end(); return; }
    res.status(204).end();
  });

  return router;
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === '23505';
}
