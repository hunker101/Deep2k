import { Router, type Request, type Response } from 'express';
import type { Db } from '@deep2k/db';
import { sites } from '@deep2k/db';
import { eq, sql } from 'drizzle-orm';
import { runAggregation } from '../jobs/aggregate.js';
import { createPartitions } from '../jobs/createPartitions.js';
import { flush } from '../queues/index.js';
import { sendDiscordReport } from '../jobs/discordReport.js';
import { pushSiteToKV } from '../lib/cloudflare.js';
import { generateVariableSeed, pickBeaconMethod, pickInitDelayMs } from '@deep2k/tracker-generator';
import { ENDPOINT_PATH_POOL } from '@deep2k/shared';

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
      const availablePaths = (ENDPOINT_PATH_POOL as readonly string[]).filter(p => !usedPaths.has(p));

      const fixes: { domain: string; oldPath: string; newPath: string; status: string }[] = [];

      for (const [path, group] of pathToSites) {
        if (group.length <= 1) continue;
        // Keep first site on current path; re-assign the rest
        for (let i = 1; i < group.length; i++) {
          const site = group[i]!;
          const newPath = availablePaths.shift();
          if (!newPath) {
            fixes.push({ domain: site.domain, oldPath: path, newPath: '', status: 'error: pool exhausted' });
            continue;
          }
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

  return router;
}
