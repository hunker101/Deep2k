import 'server-only';

interface SiteRow {
  id: string;
  domain: string;
  scriptPath: string;
  endpointPath: string;
  beaconMethod: string;
  createdAt: string;
}

interface DailyStatRow {
  siteId: string;
  date: string;
  pageviews: number;
  uniqueVisitors: number;
}

function apiBase(): string {
  return process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3000';
}

function adminHeaders(): HeadersInit {
  const token = process.env.ADMIN_TOKEN;
  if (!token) throw new Error('ADMIN_TOKEN env var is required');
  return { Authorization: `Bearer ${token}` };
}

export async function fetchSites(): Promise<SiteRow[]> {
  const res = await fetch(`${apiBase()}/api/sites`, {
    headers: adminHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`api /api/sites failed: ${res.status}`);
  return res.json();
}

export async function fetchSiteStats(id: string): Promise<DailyStatRow[]> {
  const res = await fetch(`${apiBase()}/api/sites/${id}/stats`, {
    headers: adminHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`api /api/sites/${id}/stats failed: ${res.status}`);
  return res.json();
}
