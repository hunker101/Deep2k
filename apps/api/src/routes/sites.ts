import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { and, eq, gte, inArray, lte } from 'drizzle-orm';
import { sites, leads, type Db } from '@deep2k/db';
import { generateScript, generateSiteConfig, generateEndpointPath } from '@deep2k/tracker-generator';
import { SUBDOMAIN_PREFIX_POOL } from '@deep2k/shared';
import type { Env } from '../env.js';
import { pushSiteToKV, deleteSiteFromKV } from '../lib/cloudflare.js';

const CreateSiteBody = z.object({
  domain: z.string().min(1).max(253),
  categoryId: z.string().uuid().optional().nullable(),
});

function pickBackendUrl(backendUrls: string | undefined): string | null {
  if (!backendUrls) return null;
  const pool = backendUrls.split(',').map(u => u.trim()).filter(Boolean);
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)] ?? null;
}

function resolveEndpointPath(endpointPath: string, workerUrl: string | undefined): string {
  if (!workerUrl) return endpointPath;
  // If already absolute, keep as-is.
  if (endpointPath.startsWith('http')) return endpointPath;
  return `${workerUrl.replace(/\/$/, '')}${endpointPath}`;
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

    // Generate an endpoint path guaranteed not already used by another site.
    // ~16M combinations means collision probability is <0.01%; retry loop handles it.
    const usedPaths = new Set(
      (await db.select({ endpointPath: sites.endpointPath }).from(sites)).map(r => r.endpointPath)
    );
    let uniqueEndpointPath: string;
    let attempts = 0;
    do {
      uniqueEndpointPath = generateEndpointPath();
      attempts++;
      if (attempts > 100) {
        res.status(500).json({ error: 'could not generate unique endpoint path' });
        return;
      }
    } while (usedPaths.has(uniqueEndpointPath));

    const isMyshopify = parsed.data.domain.endsWith('.myshopify.com');
    const subdomainPool = SUBDOMAIN_PREFIX_POOL as readonly string[];
    const prefix = subdomainPool[Math.floor(Math.random() * subdomainPool.length)]!;
    const firstPartySubdomain = isMyshopify ? null : `${prefix}.${parsed.data.domain}`;
    try {
      const [row] = await db
        .insert(sites)
        .values({
          domain: cfg.domain,
          secret: cfg.secret,
          scriptPath: cfg.script_path,
          endpointPath: uniqueEndpointPath,
          beaconMethod: cfg.beacon_method,
          initDelayMs: cfg.init_delay_ms,
          variableSeed: cfg.variable_seed,
          backendUrl: pickBackendUrl(env.BACKEND_URLS),
          firstPartySubdomain,
          categoryId: parsed.data.categoryId ?? null,
        })
        .returning();

      // Push to Cloudflare KV so Worker picks it up without redeploy.
      const endpointForWorker = resolveEndpointPath(uniqueEndpointPath, env.CF_WORKER_URL);
      await pushSiteToKV(cfg.domain, {
        id: row!.id,
        secret: cfg.secret,
        endpoint_path: endpointForWorker,
        backend_url: row!.backendUrl,
      }, firstPartySubdomain).catch(err => console.error('[cf-kv] push failed:', err));

      res.status(201).json({ ...row, scriptEndpoint: endpointForWorker });
    } catch (err) {
      if (isUniqueViolation(err)) {
        res.status(409).json({ error: 'This domain is already being tracked.' });
        return;
      }
      throw err;
    }
  });

  router.delete('/sites/:id', async (req: Request, res: Response) => {
    const id = req.params.id ?? '';
    const [row] = await db.delete(sites).where(eq(sites.id, id)).returning();
    if (!row) { res.status(404).end(); return; }
    await deleteSiteFromKV(row.domain, row.endpointPath, row.firstPartySubdomain).catch((err: unknown) => console.error('[cf-kv] delete failed:', err));
    res.status(204).end();
  });

  router.patch('/sites/:id', async (req: Request, res: Response) => {
    const id = req.params.id ?? '';
    const body = req.body as { endpointPath?: string; categoryId?: string | null };

    const updates: Record<string, unknown> = {};
    if (body.endpointPath) updates.endpointPath = body.endpointPath;
    if ('categoryId' in body) updates.categoryId = body.categoryId ?? null;

    if (Object.keys(updates).length === 0) { res.status(400).json({ error: 'nothing to update' }); return; }

    const [row] = await db.update(sites).set(updates).where(eq(sites.id, id)).returning();
    if (!row) { res.status(404).end(); return; }

    if (body.endpointPath) {
      await pushSiteToKV(row.domain, {
        id: row.id,
        secret: row.secret,
        endpoint_path: body.endpointPath,
        backend_url: row.backendUrl,
      }).catch(err => console.error('[cf-kv] patch sync failed:', err));
    }

    res.json(row);
  });

  router.post('/sites/bulk-assign-category', async (req: Request, res: Response) => {
    const { siteIds, categoryId } = req.body as { siteIds?: string[]; categoryId?: string | null };
    if (!Array.isArray(siteIds) || siteIds.length === 0) { res.status(400).json({ error: 'siteIds required' }); return; }
    await db.update(sites).set({ categoryId: categoryId ?? null }).where(inArray(sites.id, siteIds));
    res.json({ updated: siteIds.length });
  });

  router.post('/sites/:id/enable-first-party', async (req: Request, res: Response) => {
    const id = req.params.id ?? '';
    const [site] = await db.select().from(sites).where(eq(sites.id, id));
    if (!site) { res.status(404).end(); return; }

    const pool = SUBDOMAIN_PREFIX_POOL as readonly string[];
    const prefix = pool[Math.floor(Math.random() * pool.length)]!;
    const firstPartySubdomain = `${prefix}.${site.domain}`;

    const [updated] = await db.update(sites).set({ firstPartySubdomain }).where(eq(sites.id, id)).returning();
    if (!updated) { res.status(404).end(); return; }

    await pushSiteToKV(site.domain, {
      id: site.id,
      secret: site.secret,
      endpoint_path: site.endpointPath,
      backend_url: site.backendUrl,
    }, firstPartySubdomain).catch(err => console.error('[cf-kv] enable-first-party push failed:', err));

    res.json({ firstPartySubdomain });
  });

  router.post('/sites/:id/mark-injected', async (req: Request, res: Response) => {
    const id = req.params.id ?? '';
    const [row] = await db.update(sites).set({ lastInjectedAt: new Date() }).where(eq(sites.id, id)).returning();
    if (!row) { res.status(404).end(); return; }
    const endpointPath = resolveEndpointPath(row.endpointPath, env.CF_WORKER_URL);
    pushSiteToKV(row.domain, {
      id: row.id,
      secret: row.secret,
      endpoint_path: endpointPath,
      backend_url: row.backendUrl,
    }, row.firstPartySubdomain).catch(err => console.error('[cf-kv] mark-injected push failed:', err));
    res.json({ lastInjectedAt: row.lastInjectedAt });
  });

  router.get('/sites/:id/leads', async (req: Request, res: Response) => {
    const id = req.params.id ?? '';
    const { from, to, type } = req.query as Record<string, string>;
    const conditions = [eq(leads.siteId, id)];
    if (from) conditions.push(gte(leads.createdAt, new Date(from)));
    if (to) conditions.push(lte(leads.createdAt, new Date(`${to}T23:59:59Z`)));
    if (type) conditions.push(eq(leads.type, type));
    const rows = await db.select().from(leads).where(and(...conditions)).orderBy(leads.createdAt);
    res.json(rows);
  });

  router.get('/sites/:id/script', async (req: Request, res: Response) => {
    const site = await db.query.sites.findFirst({
      where: eq(sites.id, req.params.id ?? ''),
    });
    if (!site) { res.status(404).end(); return; }

    const endpointPath = site.firstPartySubdomain
      ? `https://${site.firstPartySubdomain}${site.endpointPath}`
      : resolveEndpointPath(site.endpointPath, env.CF_WORKER_URL);
    const apiBase = env.PUBLIC_API_URL ?? 'https://deep2k.onrender.com';
    const script = generateScript({
      variable_seed: site.variableSeed,
      beacon_method: site.beaconMethod as 'sendBeacon' | 'fetch' | 'image' | 'xhr',
      endpoint_path: endpointPath,
      init_delay_ms: site.initDelayMs,
      lead_endpoint: `${apiBase}/api/sites/${site.id}/lead`,
    });
    res.type('application/javascript').send(script);
  });

  return router;
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === '23505';
}
