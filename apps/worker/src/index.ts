import {
  BrowserEventPayloadSchema,
  MAX_PAYLOAD_BYTES,
  type IngestEvent,
} from '@deep2k/shared';
import { hashVisitor } from './hash.js';
import { detectDevice } from './device.js';

interface KVNamespace {
  get(key: string): Promise<string | null>;
}

interface Env {
  BACKEND_URL: string;
  DAILY_SALT: string;
  SITES_JSON: string;
  SALT_KV?: KVNamespace;
  SITES_KV?: KVNamespace;
}

interface WorkerSite {
  id: string;
  secret: string;
  endpoint_path: string;
  backend_url?: string;
}

// Transparent 1x1 GIF.
const GIF_BYTES = new Uint8Array([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00, 0xff, 0xff, 0xff,
  0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00,
  0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3b,
]);

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);
    const hostHeader = req.headers.get('host') ?? '';
    const host = hostHeader.toLowerCase().split(':')[0] ?? '';

    // Look up site config: KV first (live), fall back to SITES_JSON (static).
    // KV key format: "hostname:pathname" — allows multiple stores on same workers.dev host.
    let site: WorkerSite | null = null;
    if (env.SITES_KV) {
      const kvVal = await env.SITES_KV.get(`${host}:${url.pathname}`);
      if (kvVal) {
        try { site = JSON.parse(kvVal) as WorkerSite; } catch { /* ignore */ }
      }
    }
    if (!site) {
      try {
        const sites = JSON.parse(env.SITES_JSON) as Record<string, WorkerSite>;
        const s = sites[host];
        if (s && url.pathname === s.endpoint_path) site = s;
      } catch {
        return new Response('config error', { status: 500 });
      }
    }
    if (!site) {
      return new Response('not found', { status: 404 });
    }

    // Path already matched during KV lookup (hostname:pathname key).
    // For SITES_JSON fallback, path was also validated above.

    if (req.method !== 'POST' && req.method !== 'GET') {
      return new Response('method not allowed', { status: 405 });
    }

    let payload: unknown;
    try {
      if (req.method === 'POST') {
        const len = req.headers.get('content-length');
        if (len && Number(len) > MAX_PAYLOAD_BYTES) {
          return new Response('payload too large', { status: 413 });
        }
        payload = await req.json();
      } else {
        const d = url.searchParams.get('d');
        if (!d) return new Response('bad request', { status: 400 });
        payload = JSON.parse(decodeURIComponent(d));
      }
    } catch {
      return new Response('bad request', { status: 400 });
    }

    const parsed = BrowserEventPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return new Response('invalid payload', { status: 400 });
    }
    const data = parsed.data;

    const ip = req.headers.get('cf-connecting-ip') ?? '';
    const ua = req.headers.get('user-agent') ?? '';
    const country =
      (req as Request & { cf?: { country?: string } }).cf?.country ?? '';

    const dailySalt = (env.SALT_KV ? await env.SALT_KV.get('current_salt') : null) ?? env.DAILY_SALT;
    const visitor_id = await hashVisitor(ip, ua, dailySalt, site.id);
    const event: IngestEvent = {
      site_id: site.id,
      visitor_id,
      path: data.p,
      referrer: data.r,
      country,
      device: detectDevice(ua),
      timestamp: data.t,
    };

    const jitterMs = Math.random() * 500;
    ctx.waitUntil(
      new Promise<void>(resolve => setTimeout(resolve, jitterMs)).then(() =>
        fetch(site.backend_url ?? env.BACKEND_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Site-Auth': site.secret,
          },
          body: JSON.stringify(event),
        }).catch(() => {
          /* swallow — Phase 2: retry with backoff + dead-letter */
        }),
      ),
    );

    if (req.method === 'GET') {
      return new Response(GIF_BYTES, {
        headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-store' },
      });
    }
    return new Response(null, { status: 204 });
  },
};
