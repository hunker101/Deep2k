import { Router, type Request, type Response } from 'express';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { sites, leads, type Db } from '@deep2k/db';

const LeadBody = z.object({
  type: z.enum(['form', 'order']),
  fields: z.record(z.unknown()).default({}),
  page_url: z.string().optional(),
});

function cors(res: Response) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export function leadsRouter(db: Db): Router {
  const router = Router();

  router.options('/sites/:id/lead', (_req, res) => {
    cors(res);
    res.status(204).end();
  });

  router.post('/sites/:id/lead', async (req: Request, res: Response) => {
    cors(res);
    const id = req.params.id ?? '';
    const [site] = await db.select({ id: sites.id }).from(sites).where(eq(sites.id, id));
    if (!site) { res.status(404).end(); return; }

    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { res.status(400).end(); return; }
    }

    const parsed = LeadBody.safeParse(body);
    if (!parsed.success) { res.status(400).end(); return; }

    await db.insert(leads).values({
      siteId: site.id,
      type: parsed.data.type,
      fields: parsed.data.fields,
      pageUrl: parsed.data.page_url ?? null,
    });

    res.status(204).end();
  });

  return router;
}
