import { Router, type Request, type Response } from 'express';
import type { Db } from '@deep2k/db';
import { sites, leads } from '@deep2k/db';
import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { runAggregation } from '../jobs/aggregate.js';
import { createPartitions } from '../jobs/createPartitions.js';
import { flush } from '../queues/index.js';
import { sendDiscordReport } from '../jobs/discordReport.js';
import { pushSiteToKV } from '../lib/cloudflare.js';
import { generateVariableSeed, pickBeaconMethod, pickInitDelayMs, generateEndpointPath } from '@deep2k/tracker-generator';

export function adminRouter(db: Db): Router {
  const router = Router();

  // Force-flush the in-memory event buffer to the DB. Use before aggregation
  // in tests/dev so freshly POSTed events land in `events` before the rollup.
  router.post('/admin/flush', async (_req: Request, res: Response) => {
    try {
      await flush();
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  router.post('/admin/create-partitions', async (_req: Request, res: Response) => {
    try {
      const results = await createPartitions(db, 3);
      res.json({ ok: true, results });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  // One-time migration: add top_referrers column to daily_stats
  router.post('/admin/migrate-referrers', async (_req: Request, res: Response) => {
    try {
      await db.execute(sql`ALTER TABLE daily_stats ADD COLUMN IF NOT EXISTS top_referrers jsonb NOT NULL DEFAULT '{}'`);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  // One-time migration: add leads table
  router.post('/admin/migrate-leads', async (_req: Request, res: Response) => {
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS leads (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
          type text NOT NULL,
          fields jsonb NOT NULL DEFAULT '{}',
          page_url text,
          created_at timestamptz NOT NULL DEFAULT now()
        )
      `);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS leads_site_idx ON leads(site_id)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS leads_created_at_idx ON leads(created_at)`);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  // One-time migration: add bounced_visitors column to daily_stats
  router.post('/admin/migrate-last-injected', async (_req: Request, res: Response) => {
    try {
      await db.execute(sql`ALTER TABLE sites ADD COLUMN IF NOT EXISTS last_injected_at timestamptz`);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  // One-time migration: add first_party_subdomain column to sites
  router.post('/admin/migrate-first-party-subdomain', async (_req: Request, res: Response) => {
    try {
      await db.execute(sql`ALTER TABLE sites ADD COLUMN IF NOT EXISTS first_party_subdomain text`);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  router.post('/admin/migrate-bounce', async (_req: Request, res: Response) => {
    try {
      await db.execute(sql`ALTER TABLE daily_stats ADD COLUMN IF NOT EXISTS bounced_visitors integer NOT NULL DEFAULT 0`);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  // Manually trigger the hourly aggregation. The real schedule runs every
  // hour at :05; this endpoint is for testing and ad-hoc recompute.
  router.post('/admin/aggregate', async (req: Request, res: Response) => {
    try {
      const hours = Number(req.query.hours) || 2;
      const rows = await runAggregation(db, hours);
      res.json({ ok: true, rows_upserted: rows });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  router.post('/admin/discord-report', async (_req: Request, res: Response) => {
    try {
      await sendDiscordReport(db);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  // Re-push every site from DB into Cloudflare SITES_KV.
  // Use this once after CF_WORKER_URL is corrected so all worker-host KV keys are written.
  router.post('/admin/resync-kv', async (_req: Request, res: Response) => {
    try {
      const rows = await db.select().from(sites);
      const workerUrl = process.env.CF_WORKER_URL;
      const results: { domain: string; status: string }[] = [];
      await Promise.all(rows.map(async (row) => {
        const endpointPath = workerUrl
          ? `${workerUrl.replace(/\/$/, '')}${row.endpointPath}`
          : row.endpointPath;
        try {
          await pushSiteToKV(row.domain, {
            id: row.id,
            secret: row.secret,
            endpoint_path: endpointPath,
            backend_url: row.backendUrl,
          }, row.firstPartySubdomain);
          results.push({ domain: row.domain, status: 'ok' });
        } catch (err) {
          results.push({ domain: row.domain, status: `error: ${String(err)}` });
        }
      }));
      res.json({ ok: true, synced: results.length, results });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  // Detect sites sharing the same endpointPath and assign unique paths to duplicates.
  // After running this, re-inject the tracker script on each affected Shopify store.
  router.post('/admin/fix-collisions', async (_req: Request, res: Response) => {
    try {
      const rows = await db.select().from(sites);

      // Group sites by endpointPath to find collisions
      const pathToSites = new Map<string, typeof rows>();
      for (const row of rows) {
        const arr = pathToSites.get(row.endpointPath) ?? [];
        arr.push(row);
        pathToSites.set(row.endpointPath, arr);
      }

      const usedPaths = new Set(rows.map(r => r.endpointPath));

      const fixes: { domain: string; oldPath: string; newPath: string; status: string }[] = [];

      for (const [path, group] of pathToSites) {
        if (group.length <= 1) continue;
        // Keep first site on current path; re-assign the rest
        for (let i = 1; i < group.length; i++) {
          const site = group[i]!;
          // Generate a unique path not already in use
          let newPath: string;
          let attempts = 0;
          do {
            newPath = generateEndpointPath();
            attempts++;
          } while (usedPaths.has(newPath) && attempts < 100);
          usedPaths.add(newPath);
          await db.update(sites).set({ endpointPath: newPath }).where(eq(sites.id, site.id));
          await pushSiteToKV(site.domain, {
            id: site.id,
            secret: site.secret,
            endpoint_path: newPath,
            backend_url: site.backendUrl,
          }).catch(err => console.error('[cf-kv] fix-collisions push failed:', err));
          fixes.push({ domain: site.domain, oldPath: path, newPath, status: 'fixed' });
        }
      }

      const collisions = fixes.filter(f => f.status === 'fixed' || f.status.startsWith('error'));
      res.json({ ok: true, collisions_found: collisions.length, fixes });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  router.get('/admin/rotation-status', async (_req: Request, res: Response) => {
    try {
      const result = await db.execute(sql`
        SELECT value FROM app_settings WHERE key = 'scripts_last_rotated_at'
      `);
      const row = result.rows[0] as { value: string } | undefined;
      if (!row) { res.json({ lastRotatedAt: null, daysSince: null }); return; }
      const daysSince = Math.floor((Date.now() - new Date(row.value).getTime()) / (1000 * 60 * 60 * 24));
      res.json({ lastRotatedAt: row.value, daysSince });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  // Rotate obfuscation fields (variable names, beacon method, timing) for all sites.
  // Endpoint paths stay the same so existing Shopify injections keep working.
  // After running this, re-inject the new script from the dashboard on each store.
  router.post('/admin/rotate-scripts', async (_req: Request, res: Response) => {
    try {
      const rows = await db.select().from(sites);
      const results: { domain: string; status: string }[] = [];
      await Promise.all(rows.map(async (row) => {
        try {
          await db.update(sites)
            .set({
              variableSeed: generateVariableSeed(),
              beaconMethod: pickBeaconMethod(),
              initDelayMs: pickInitDelayMs(),
            })
            .where(eq(sites.id, row.id));
          results.push({ domain: row.domain, status: 'rotated' });
        } catch (err) {
          results.push({ domain: row.domain, status: `error: ${String(err)}` });
        }
      }));
      await db.execute(sql`
        INSERT INTO app_settings (key, value, updated_at)
        VALUES ('scripts_last_rotated_at', now()::text, now())
        ON CONFLICT (key) DO UPDATE SET value = now()::text, updated_at = now()
      `);

      res.json({
        ok: true,
        rotated: results.length,
        results,
        note: 'Re-inject the tracker script from the dashboard on each store.',
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  router.get('/leads/by-email', async (req: Request, res: Response) => {
    const email = ((req.query.email as string) ?? '').trim().toLowerCase();
    if (!email) { res.status(400).json({ error: 'email required' }); return; }
    const result = await db.execute(sql`
      SELECT
        l.id,
        l.site_id      AS "siteId",
        s.domain,
        l.type,
        l.fields,
        l.page_url     AS "pageUrl",
        l.created_at   AS "createdAt"
      FROM leads l
      JOIN sites s ON s.id = l.site_id
      WHERE lower(l.fields->>'email') = ${email}
         OR lower(l.fields->>'contact[email]') = ${email}
      ORDER BY l.created_at DESC
    `);
    res.json(result.rows);
  });

  router.get('/leads', async (req: Request, res: Response) => {
    const { from, to, type, site_id } = req.query as Record<string, string>;
    const conditions = [];
    if (from) conditions.push(gte(leads.createdAt, new Date(from)));
    if (to) conditions.push(lte(leads.createdAt, new Date(`${to}T23:59:59Z`)));
    if (type) conditions.push(eq(leads.type, type));
    if (site_id) conditions.push(eq(leads.siteId, site_id));
    const rows = await db
      .select({
        id: leads.id,
        siteId: leads.siteId,
        domain: sites.domain,
        type: leads.type,
        fields: leads.fields,
        pageUrl: leads.pageUrl,
        createdAt: leads.createdAt,
      })
      .from(leads)
      .innerJoin(sites, eq(leads.siteId, sites.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(leads.createdAt);
    res.json(rows);
  });

  return router;
}
