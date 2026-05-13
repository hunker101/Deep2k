import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { sites, type Db } from '@deep2k/db';
import { generateScript, generateSiteConfig } from '@deep2k/tracker-generator';
import type { Env } from '../env.js';

const CreateSiteBody = z.object({
  domain: z.string().min(1).max(253),
});

function pickBackendUrl(backendUrls: string | undefined): string | null {
  if (!backendUrls) return null;
  const pool = backendUrls.split(',').map(u => u.trim()).filter(Boolean);
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)] ?? null;
}

export function sitesRouter(db: Db, env: Env): Router {
  const router = Router();

  router.get('/sites', async (_req: Request, res: Response) => {
    const rows = await db.select().from(sites).orderBy(sites.createdAt);
    res.json(rows);
  });

  router.post('/sites', async (req: Request, res: Response) => {
    const parsed = CreateSiteBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid body', issues: parsed.error.issues });
      return;
    }

    const cfg = generateSiteConfig(parsed.data.domain);
    try {
      const [row] = await db
        .insert(sites)
        .values({
          domain: cfg.domain,
          secret: cfg.secret,
          scriptPath: cfg.script_path,
          endpointPath: cfg.endpoint_path,
          beaconMethod: cfg.beacon_method,
          initDelayMs: cfg.init_delay_ms,
          variableSeed: cfg.variable_seed,
          backendUrl: pickBackendUrl(env.BACKEND_URLS),
        })
        .returning();
      res.status(201).json(row);
    } catch (err) {
      if (isUniqueViolation(err)) {
        res.status(409).json({ error: 'domain or diversification tuple already exists' });
        return;
      }
      throw err;
    }
  });

  router.get('/sites/:id/script', async (req: Request, res: Response) => {
    const site = await db.query.sites.findFirst({
      where: eq(sites.id, req.params.id ?? ''),
    });
    if (!site) {
      res.status(404).end();
      return;
    }
    const script = generateScript({
      variable_seed: site.variableSeed,
      beacon_method: site.beaconMethod as 'sendBeacon' | 'fetch' | 'image' | 'xhr',
      endpoint_path: site.endpointPath,
      init_delay_ms: site.initDelayMs,
    });
    res.type('application/javascript').send(script);
  });

  return router;
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === '23505';
}
