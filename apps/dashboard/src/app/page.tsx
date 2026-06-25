import Link from 'next/link';
import { fetchSitesSummary, fetchOverview, fetchCategories, fetchLeads } from '@/lib/api';
import { TrafficChart } from '@/components/TrafficChart';
import { SitesTable } from '@/components/SitesTable';
import { FloatingActions } from '@/components/FloatingActions';
import { ThemeToggle } from '@/components/ThemeToggle';
import { RotateScriptsButton } from '@/components/RotateScriptsButton';
import { LiveVisitorCard } from '@/components/LiveVisitorCard';
import { PeriodSelector } from '@/components/PeriodSelector';


const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States', GB: 'United Kingdom', CA: 'Canada', AU: 'Australia',
  PH: 'Philippines', DE: 'Germany', FR: 'France', NL: 'Netherlands',
  BR: 'Brazil', IN: 'India', MX: 'Mexico', SG: 'Singapore', JP: 'Japan',
  KR: 'South Korea', ID: 'Indonesia', TH: 'Thailand', NG: 'Nigeria',
  ZA: 'South Africa', AE: 'UAE', IT: 'Italy', ES: 'Spain', SE: 'Sweden',
  NO: 'Norway', DK: 'Denmark', FI: 'Finland', PL: 'Poland', UA: 'Ukraine',
  RU: 'Russia', TR: 'Turkey', SA: 'Saudi Arabia', MY: 'Malaysia', VN: 'Vietnam',
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  const { period = '7d', from, to } = await searchParams;
  const effectivePeriod = (from && to) ? `custom:${from}:${to}` : period;
  const [sites, overview, categories, leads] = await Promise.all([
    fetchSitesSummary(effectivePeriod).catch(() => []),
    fetchOverview(effectivePeriod).catch(() => ({ totalPageviews: 0, totalVisitors: 0, siteCount: 0, daily: [] })),
    fetchCategories().catch(() => []),
    fetchLeads(effectivePeriod).catch(() => []),
  ]);

  const totalOrders = leads.filter(l => l.type === 'order').length;
  const totalForms = leads.filter(l => l.type === 'form').length;
  const emailCounts: Record<string, number> = {};
  for (const l of leads) {
    const f = l.fields as Record<string, unknown>;
    const raw = f['email'] ?? f['contact[email]'];
    const email = typeof raw === 'string' && raw ? raw.toLowerCase().trim() : null;
    if (email) emailCounts[email] = (emailCounts[email] ?? 0) + 1;
  }
  const uniqueCustomers = Object.keys(emailCounts).length;
  const repeatBuyers = Object.values(emailCounts).filter(c => c > 1).length;
  const repeatPct = uniqueCustomers > 0 ? Math.round((repeatBuyers / uniqueCustomers) * 100) : 0;

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const now = Date.now();
  const activeSiteCount = sites.filter(
    s => s.totalPageviews > 0 && s.lastEvent && (now - new Date(s.lastEvent).getTime()) < 24 * 60 * 60 * 1000
  ).length;

  const topSites = [...sites].sort((a, b) => b.totalVisitors - a.totalVisitors).slice(0, 7);

  const countryCounts: Record<string, number> = {};
  for (const s of sites) {
    if (s.topCountry) {
      const code = s.topCountry.slice(0, 2).toUpperCase();
      countryCounts[code] = (countryCounts[code] ?? 0) + s.totalVisitors;
    }
  }
  const topCountries = Object.entries(countryCounts).sort((a, b) => b[1] - a[1]).slice(0, 7);
  const maxCountry = topCountries[0]?.[1] ?? 1;

  const deviceCounts: Record<string, number> = {};
  for (const s of sites) {
    if (s.topDevice) {
      deviceCounts[s.topDevice] = (deviceCounts[s.topDevice] ?? 0) + s.totalVisitors;
    }
  }
  const topDevices = Object.entries(deviceCounts).sort((a, b) => b[1] - a[1]);
  const totalDeviceVisitors = topDevices.reduce((sum, [, v]) => sum + v, 0);

  const periodLabel = from && to
    ? `${from} → ${to}`
    : effectivePeriod === '7d' ? '7 days'
    : effectivePeriod === '30d' ? '30 days'
    : effectivePeriod === 'month' ? 'this month'
    : 'today';

  return (
    <div className="min-h-screen bg-[var(--c-bg)]">

      {/* Nav */}
      <header
        className="border-b border-[var(--c-border)] px-6 py-3 grid grid-cols-3 items-center sticky top-0 z-30"
        style={{ backgroundColor: 'var(--c-header-bg)', backdropFilter: 'blur(8px)' }}
      >
        {/* Left: logo + nav */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            <span className="text-[var(--c-text)] font-semibold text-sm">
              Deep<span className="text-emerald-400">2K</span>
            </span>
          </div>
          <nav className="flex items-center gap-1 bg-[var(--c-card)] border border-[var(--c-border)] rounded-lg p-0.5">
            <Link href="/" className="px-3 py-1 rounded-md text-xs font-mono bg-[var(--c-subtle)] text-[var(--c-text)] transition-colors">Analytics</Link>
            <Link href="/leads" className="px-3 py-1 rounded-md text-xs font-mono text-[var(--c-text-2)] hover:text-[var(--c-text)] transition-colors">Leads</Link>
          </nav>
        </div>

        {/* Center: date */}
        <div className="flex justify-center">
          <span className="text-[var(--c-text-2)] text-xs font-mono">{today}</span>
        </div>

        {/* Right: period + actions */}
        <div className="flex items-center gap-3 justify-end">
          <PeriodSelector current={period} customFrom={from} customTo={to} />
          <RotateScriptsButton />
          <ThemeToggle />
          <a
            href="/api/logout"
            className="flex items-center gap-1.5 text-[var(--c-text-2)] hover:text-red-400 border border-transparent hover:border-red-400/20 hover:bg-red-400/5 text-xs font-mono px-3 py-1.5 rounded-lg transition-all"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign out
          </a>
        </div>
      </header>

      {/* Main content */}
      <div className="px-6 pt-8 space-y-6">

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            label="Total Pageviews"
            value={overview.totalPageviews.toLocaleString()}
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
          />
          <StatCard
            label="Unique Visitors"
            value={overview.totalVisitors.toLocaleString()}
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
          />
          <StatCard
            label="Sites Monitored"
            value={overview.siteCount.toLocaleString()}
            sub="total registered"
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>}
          />
          <StatCard
            label="Sites Active"
            value={activeSiteCount.toLocaleString()}
            sub="last 24 hours"
            accent
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}
          />
          <LiveVisitorCard />
        </div>

        {/* Traffic chart */}
        <div className="bg-[var(--c-card)] border border-[var(--c-border)] rounded-xl p-5">
          <p className="text-xs font-mono text-[var(--c-text-3)] mb-4 uppercase tracking-widest">
            Traffic — all sites combined · <span className="text-[var(--c-text-2)]">{periodLabel}</span>
          </p>
          {overview.daily.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-xs font-mono text-[var(--c-text-3)]">No data yet</div>
          ) : (
            <TrafficChart data={overview.daily} totalVisitors={overview.totalVisitors} totalPageviews={overview.totalPageviews} />
          )}
        </div>

        {/* Top Performing Sites + Top Countries + Top Devices + Leads */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

          {/* Top Performing Sites */}
          <div className="bg-[var(--c-card)] border border-[var(--c-border)] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--c-border)] flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[var(--c-text)]">Top Performing Sites</p>
                <p className="text-xs font-mono text-[var(--c-text-3)] mt-0.5">by unique visitors · {period}</p>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
              </svg>
            </div>
            <div className="divide-y divide-[var(--c-border)]">
              {topSites.length === 0 ? (
                <p className="px-5 py-6 text-xs font-mono text-[var(--c-text-3)]">No data for this period</p>
              ) : topSites.map((s, i) => {
                const maxV = topSites[0]?.totalVisitors ?? 1;
                const pct = maxV > 0 ? (s.totalVisitors / maxV) * 100 : 0;
                const medals = ['🥇', '🥈', '🥉'];
                return (
                  <Link key={s.id} href={`/sites/${s.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--c-hover)] transition-colors group">
                    <span className="w-5 text-center text-sm flex-shrink-0">
                      {medals[i] ?? <span className="text-xs font-mono text-[var(--c-text-3)]">{i + 1}</span>}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono text-emerald-400 truncate group-hover:underline underline-offset-2">{s.domain}</p>
                      <div className="w-full bg-[var(--c-bg)] rounded-full h-1 mt-1.5 overflow-hidden">
                        <div className="h-full bg-emerald-400/40 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-xs font-mono font-bold tabular-nums text-[var(--c-text)]">{s.totalVisitors.toLocaleString()}</p>
                      <p className="text-[10px] font-mono text-[var(--c-text-3)]">visitors</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Top Countries */}
          <div className="bg-[var(--c-card)] border border-[var(--c-border)] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--c-border)] flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[var(--c-text)]">Top Countries</p>
                <p className="text-xs font-mono text-[var(--c-text-3)] mt-0.5">by visitor origin · {period}</p>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
            </div>
            <div className="divide-y divide-[var(--c-border)]">
              {topCountries.length === 0 ? (
                <p className="px-5 py-6 text-xs font-mono text-[var(--c-text-3)]">No data for this period</p>
              ) : topCountries.map(([code, count]) => {
                const pct = maxCountry > 0 ? (count / maxCountry) * 100 : 0;
                const totalPct = overview.totalVisitors > 0 ? Math.round((count / overview.totalVisitors) * 100) : 0;
                return (
                  <div key={code} className="flex items-center gap-3 px-5 py-3">
                    <span className="text-[10px] font-bold font-mono text-[var(--c-text-2)] bg-[var(--c-bg)] border border-[var(--c-border)] px-1.5 py-0.5 rounded w-8 text-center flex-shrink-0">{code}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono text-[var(--c-text-2)] truncate">{COUNTRY_NAMES[code] ?? code}</p>
                      <div className="w-full bg-[var(--c-bg)] rounded-full h-1 mt-1.5 overflow-hidden">
                        <div className="h-full bg-sky-400/40 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-xs font-mono font-bold tabular-nums text-[var(--c-text)]">{count.toLocaleString()}</p>
                      <p className="text-[10px] font-mono text-[var(--c-text-3)]">{totalPct}%</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Devices */}
          <div className="bg-[var(--c-card)] border border-[var(--c-border)] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--c-border)] flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[var(--c-text)]">Top Devices</p>
                <p className="text-xs font-mono text-[var(--c-text-3)] mt-0.5">by session share · {period}</p>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round">
                <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
            </div>
            {topDevices.length === 0 ? (
              <p className="px-5 py-6 text-xs font-mono text-[var(--c-text-3)]">No data for this period</p>
            ) : (
              <>
                {/* Stacked bar */}
                <div className="px-5 pt-4 pb-3">
                  <div className="flex rounded-full overflow-hidden h-2 gap-px">
                    {topDevices.map(([device, count]) => (
                      <div
                        key={device}
                        style={{ width: `${totalDeviceVisitors > 0 ? (count / totalDeviceVisitors) * 100 : 0}%` }}
                        className={deviceBarColor(device)}
                      />
                    ))}
                  </div>
                </div>
                <div className="divide-y divide-[var(--c-border)]">
                  {topDevices.map(([device, count]) => {
                    const pct = totalDeviceVisitors > 0 ? Math.round((count / totalDeviceVisitors) * 100) : 0;
                    return (
                      <div key={device} className="flex items-center gap-3 px-5 py-3">
                        <span className={`flex-shrink-0 ${deviceTextColor(device)}`}>
                          <DeviceIcon device={device} />
                        </span>
                        <span className="text-xs font-mono text-[var(--c-text-2)] flex-1 capitalize">{device}</span>
                        <span className="text-[10px] font-mono text-[var(--c-text-3)]">{pct}%</span>
                        <span className="text-xs font-mono font-bold tabular-nums text-[var(--c-text)]">{count.toLocaleString()}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Leads */}
          <div className="bg-[var(--c-card)] border border-[var(--c-border)] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--c-border)] flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[var(--c-text)]">Leads</p>
                <p className="text-xs font-mono text-[var(--c-text-3)] mt-0.5">orders &amp; form submissions · {period}</p>
              </div>
              <Link href="/leads" className="text-[10px] font-mono text-[var(--c-text-3)] hover:text-emerald-400 transition-colors">
                View all →
              </Link>
            </div>
            <div className="divide-y divide-[var(--c-border)]">
              <div className="px-5 py-3 flex items-center justify-between">
                <span className="text-xs font-mono text-[var(--c-text-2)]">Total leads</span>
                <span className="text-sm font-bold tabular-nums text-[var(--c-text)]">{leads.length.toLocaleString()}</span>
              </div>
              <div className="px-5 py-3 flex items-center justify-between">
                <span className="text-xs font-mono text-[var(--c-text-2)]">Orders</span>
                <span className="text-sm font-bold tabular-nums text-emerald-400">{totalOrders.toLocaleString()}</span>
              </div>
              <div className="px-5 py-3 flex items-center justify-between">
                <span className="text-xs font-mono text-[var(--c-text-2)]">Form submissions</span>
                <span className="text-sm font-bold tabular-nums text-sky-400">{totalForms.toLocaleString()}</span>
              </div>
              <div className="px-5 py-3 flex items-center justify-between">
                <span className="text-xs font-mono text-[var(--c-text-2)]">Unique customers</span>
                <span className="text-sm font-bold tabular-nums text-[var(--c-text)]">{uniqueCustomers.toLocaleString()}</span>
              </div>
              <div className="px-5 py-3 flex items-center justify-between">
                <span className="text-xs font-mono text-[var(--c-text-2)]">Repeat buyers</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold tabular-nums text-violet-400">{repeatBuyers.toLocaleString()}</span>
                  {repeatPct > 0 && (
                    <span className="text-[10px] font-mono text-[var(--c-text-3)]">{repeatPct}%</span>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Network health strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <MiniStat label="Active rate" value={`${overview.siteCount > 0 ? Math.round((activeSiteCount / overview.siteCount) * 100) : 0}%`} color="text-emerald-400" />
          <MiniStat label="Avg visitors / active site" value={activeSiteCount > 0 ? Math.round(overview.totalVisitors / activeSiteCount).toLocaleString() : '—'} />
          <MiniStat label="Pages per visitor" value={overview.totalVisitors > 0 ? (overview.totalPageviews / overview.totalVisitors).toFixed(1) : '—'} />
          <MiniStat label="Silent sites" value={(overview.siteCount - activeSiteCount).toLocaleString()} color="text-yellow-400" />
        </div>

      </div>

      {/* Sites table — full width below max-w container */}
      <div className="px-6 pb-28 mt-6">
        <SitesTable sites={sites} categories={categories} />
      </div>

      <FloatingActions />
    </div>
  );
}

function StatCard({ label, value, sub, accent, icon }: {
  label: string; value: string; sub?: string; accent?: boolean; icon?: React.ReactNode;
}) {
  return (
    <div className="bg-[var(--c-card)] border border-[var(--c-border)] rounded-xl p-5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-mono text-[var(--c-text-2)] uppercase tracking-wide">{label}</p>
        {icon && <span className={accent ? 'text-emerald-400' : 'text-[var(--c-text-3)]'}>{icon}</span>}
      </div>
      <p className={`text-3xl font-bold tabular-nums ${accent ? 'text-emerald-400' : 'text-[var(--c-text)]'}`}>{value}</p>
      {sub && <p className="text-xs font-mono text-[var(--c-text-2)] mt-1">{sub}</p>}
    </div>
  );
}

function deviceBarColor(device: string) {
  if (device === 'mobile') return 'bg-emerald-400';
  if (device === 'tablet') return 'bg-sky-400';
  return 'bg-violet-400';
}

function deviceTextColor(device: string) {
  if (device === 'mobile') return 'text-emerald-400';
  if (device === 'tablet') return 'text-sky-400';
  return 'text-violet-400';
}

function DeviceIcon({ device }: { device: string }) {
  if (device === 'mobile') return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
    </svg>
  );
  if (device === 'tablet') return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="4" y="2" width="16" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
    </svg>
  );
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-[var(--c-card)] border border-[var(--c-border)] rounded-xl px-4 py-3 flex items-center justify-between gap-3">
      <p className="text-xs font-mono text-[var(--c-text-3)] leading-tight">{label}</p>
      <p className={`text-sm font-bold tabular-nums flex-shrink-0 ${color ?? 'text-[var(--c-text)]'}`}>{value}</p>
    </div>
  );
}
