import 'server-only';

export interface SiteRow {
  id: string;
  domain: string;
  scriptPath: string;
  endpointPath: string;
  beaconMethod: string;
  lastInjectedAt: string | null;
  createdAt: string;
}

export interface SiteSummaryRow extends SiteRow {
  totalPageviews: number;
  totalVisitors: number;
  topPage: string | null;
  topCountry: string | null;
  topDevice: string | null;
  lastEvent: string | null;
}

export interface DailyStatRow {
  siteId: string;
  date: string;
  pageviews: number;
  uniqueVisitors: number;
  topPaths: Record<string, number>;
  countries: Record<string, number>;
  devices: Record<string, number>;
  topReferrers: Record<string, number>;
  bouncedVisitors: number;
}

export interface DailyPoint {
  date: string;
  pageviews: number;
  visitors: number;
}

export interface OverviewData {
  totalPageviews: number;
  totalVisitors: number;
  siteCount: number;
  daily: DailyPoint[];
}

function apiBase(): string {
  return process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3000';
}

function adminHeaders(): HeadersInit {
  const token = process.env.ADMIN_TOKEN;
  if (!token) throw new Error('ADMIN_TOKEN env var is required');
  return { Authorization: `Bearer ${token}` };
}

function range(days: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days + 1);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export function dateRangeParams(period: string): URLSearchParams {
  const p = new URLSearchParams();
  if (period === '7d') { const r = range(7); p.set('from', r.from); p.set('to', r.to); }
  else if (period === '30d') { const r = range(30); p.set('from', r.from); p.set('to', r.to); }
  else if (period === 'month') {
    const now = new Date();
    p.set('from', `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`);
    p.set('to', now.toISOString().slice(0, 10));
  } else if (period === 'today') {
    const t = new Date().toISOString().slice(0, 10);
    p.set('from', t); p.set('to', t);
  }
  return p;
}

export async function fetchSites(): Promise<SiteRow[]> {
  const res = await fetch(`${apiBase()}/api/sites`, { headers: adminHeaders(), cache: 'no-store' });
  if (!res.ok) throw new Error(`/api/sites failed: ${res.status}`);
  return res.json();
}

export async function fetchSitesSummary(period = '7d'): Promise<SiteSummaryRow[]> {
  const params = dateRangeParams(period);
  const res = await fetch(`${apiBase()}/api/sites-summary?${params}`, { headers: adminHeaders(), cache: 'no-store' });
  if (!res.ok) throw new Error(`/api/sites-summary failed: ${res.status}`);
  return res.json();
}

export async function fetchOverview(period = '7d'): Promise<OverviewData> {
  const params = dateRangeParams(period);
  const res = await fetch(`${apiBase()}/api/overview?${params}`, { headers: adminHeaders(), cache: 'no-store' });
  if (!res.ok) throw new Error(`/api/overview failed: ${res.status}`);
  return res.json();
}

export async function fetchSiteStats(id: string, period = '7d'): Promise<DailyStatRow[]> {
  const params = dateRangeParams(period);
  const res = await fetch(`${apiBase()}/api/sites/${id}/stats?${params}`, { headers: adminHeaders(), cache: 'no-store' });
  if (!res.ok) throw new Error(`/api/sites/${id}/stats failed: ${res.status}`);
  return res.json();
}

export async function fetchLastEvent(id: string): Promise<string | null> {
  const res = await fetch(`${apiBase()}/api/sites/${id}/last-event`, { headers: adminHeaders(), cache: 'no-store' });
  if (!res.ok) return null;
  const data = await res.json() as { lastEvent: string | null };
  return data.lastEvent;
}
