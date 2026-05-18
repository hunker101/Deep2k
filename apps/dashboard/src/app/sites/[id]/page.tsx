import Link from 'next/link';
import { fetchSiteStats, fetchLastEvent, fetchSites } from '@/lib/api';
import { TrafficChart } from '@/components/TrafficChart';
import { CopyButton } from '@/components/CopyButton';
import { GetScriptButton } from '@/components/GetScriptModal';
import type { DailyStatRow, SiteRow } from '@/lib/api';

const PERIODS = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: 'Last 7 Days' },
  { key: '30d', label: 'Last 30 Days' },
  { key: 'month', label: 'This Month' },
];

export default async function SitePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const { id } = await params;
  const { period = '7d' } = await searchParams;

  const [stats, sites, lastEvent] = await Promise.all([
    fetchSiteStats(id, period).catch(() => [] as DailyStatRow[]),
    fetchSites().catch(() => [] as SiteRow[]),
    fetchLastEvent(id).catch(() => null),
  ]);

  const site = sites.find(s => s.id === id);
  const totalPageviews = stats.reduce((a, r) => a + r.pageviews, 0);
  const totalVisitors = stats.reduce((a, r) => a + r.uniqueVisitors, 0);

  // Derive top country / device from aggregated JSONB
  const countryCounts = stats.reduce<Record<string, number>>((acc, r) => {
    for (const [k, v] of Object.entries(r.countries ?? {})) acc[k] = (acc[k] ?? 0) + v;
    return acc;
  }, {});
  const deviceCounts = stats.reduce<Record<string, number>>((acc, r) => {
    for (const [k, v] of Object.entries(r.devices ?? {})) acc[k] = (acc[k] ?? 0) + v;
    return acc;
  }, {});
  const pathCounts = stats.reduce<Record<string, number>>((acc, r) => {
    for (const [k, v] of Object.entries(r.topPaths ?? {})) acc[k] = (acc[k] ?? 0) + v;
    return acc;
  }, {});

  const topCountry = Object.entries(countryCounts).sort((a, b) => b[1] - a[1])[0];
  const topDevice = Object.entries(deviceCounts).sort((a, b) => b[1] - a[1])[0];

  const topPages = Object.entries(pathCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const topCountries = Object.entries(countryCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const deviceList = Object.entries(deviceCounts).sort((a, b) => b[1] - a[1]);
  const totalDevices = deviceList.reduce((s, [, v]) => s + v, 0);

  const chartData = [...stats]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(r => ({ date: r.date, pageviews: r.pageviews, visitors: r.uniqueVisitors }));

  const lastEventLabel = lastEvent
    ? relativeTime(new Date(lastEvent))
    : 'no events yet';

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="min-h-screen bg-[#080f0c]">
      {/* Nav */}
      <header className="border-b border-[#1a2e22] px-6 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
          <span className="text-white font-semibold">Deep<span className="text-emerald-400">2K</span></span>
        </Link>
        <span className="text-[#6b8f7a] text-sm font-mono hidden sm:block">{today}</span>
        <a href="/api/logout" className="text-[#6b8f7a] hover:text-white text-xs font-mono px-2 py-1.5 transition-colors">Sign out</a>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Breadcrumb + title */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-base font-medium text-emerald-400 hover:text-white bg-[#1a2e22] hover:bg-[#213d2a] border border-[#2a4a32] px-4 py-2 rounded-lg transition-all mb-3"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 5l-7 7 7 7"/>
              </svg>
              Back to all sites
            </Link>
            <p className="text-xs font-mono text-[#6b8f7a] mb-1">SITES / {site?.domain.toUpperCase() ?? id.toUpperCase()}</p>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{site?.domain ?? id}</h1>
              {(() => {
                const stale = !lastEvent || Date.now() - new Date(lastEvent).getTime() > 24 * 60 * 60 * 1000;
                if (totalPageviews > 0 && !stale) return (
                  <span className="inline-flex items-center gap-1.5 bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 text-xs font-mono px-2 py-0.5 rounded-full">
                    <span className="w-1 h-1 rounded-full bg-emerald-400"/>Active
                  </span>
                );
                if (totalPageviews > 0 && stale) return (
                  <span className="inline-flex items-center gap-1.5 bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 text-xs font-mono px-2 py-0.5 rounded-full" title="No events received in the last 24h">
                    <span className="w-1 h-1 rounded-full bg-yellow-400"/>Stale
                  </span>
                );
                return (
                  <span className="inline-flex items-center gap-1.5 bg-[#1a2e22] text-[#4a7060] border border-[#1a2e22] text-xs font-mono px-2 py-0.5 rounded-full">
                    <span className="w-1 h-1 rounded-full bg-[#4a7060]"/>Inactive
                  </span>
                );
              })()}
            </div>
            <p className="text-xs font-mono text-[#6b8f7a] mt-1 flex items-center gap-2 flex-wrap">
              <span>Last event {lastEventLabel}</span>
              {site && <><span>·</span><span>beacon: {site.beaconMethod}</span></>}
              {site && (
                <>
                  <span>·</span>
                  <a
                    href={`https://${site.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
                  >
                    Open store
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                      <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                    </svg>
                  </a>
                </>
              )}
            </p>
          </div>
          <PeriodTabs current={period} id={id} />
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Pageviews" value={totalPageviews.toLocaleString()} />
          <StatCard label="Unique visitors" value={totalVisitors.toLocaleString()} />
          <StatCard
            label="Top country"
            value={topCountry ? topCountry[0].toUpperCase() : '—'}
            sub={topCountry ? `${topCountry[1].toLocaleString()} visitors` : 'no data yet'}
          />
          <StatCard
            label="Top device"
            value={topDevice ? cap(topDevice[0]) : '—'}
            sub={topDevice ? `${Math.round((topDevice[1] / (totalDevices || 1)) * 100)}% of sessions` : 'no data yet'}
          />
        </div>

        {/* Traffic chart */}
        <div className="bg-[#0d1a14] border border-[#1a2e22] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold">Visitors &amp; pageviews</h2>
              <p className="text-xs text-[#6b8f7a] font-mono mt-0.5">Daily totals · {period === '7d' ? '7 days' : period === '30d' ? '30 days' : period}</p>
            </div>
          </div>
          {chartData.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-[#6b8f7a] text-sm font-mono">No data for this period</div>
          ) : (
            <TrafficChart data={chartData} totalVisitors={totalVisitors} totalPageviews={totalPageviews} />
          )}
        </div>

        {/* Top pages / Top countries / Device breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Panel title="Top pages" count={topPages.length}>
            {topPages.length === 0 ? <EmptyPanel /> : topPages.map(([path, count]) => (
              <RankRow key={path} label={path} count={count} total={totalPageviews} />
            ))}
          </Panel>

          <Panel title="Top countries" count={topCountries.length}>
            {topCountries.length === 0 ? <EmptyPanel /> : topCountries.map(([country, count]) => (
              <CountryRankRow key={country} country={country} count={count} total={totalVisitors} />
            ))}
          </Panel>

          <div className="bg-[#0d1a14] border border-[#1a2e22] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#1a2e22]">
              <h3 className="text-sm font-semibold">Device breakdown</h3>
              <p className="text-xs text-[#6b8f7a] font-mono mt-0.5">Share of sessions over selected range</p>
            </div>
            <div className="p-5">
              {deviceList.length === 0 ? (
                <EmptyPanel />
              ) : (
                <>
                  <div className="flex rounded-full overflow-hidden h-3 mb-4 gap-px">
                    {deviceList.map(([d, v]) => (
                      <div
                        key={d}
                        style={{ width: `${(v / totalDevices) * 100}%` }}
                        className={deviceColor(d)}
                      />
                    ))}
                  </div>
                  <div className="space-y-2">
                    {deviceList.map(([d, v]) => (
                      <div key={d} className="flex items-center justify-between text-xs font-mono">
                        <span className={`flex items-center gap-2 ${deviceColor(d).replace('bg-', 'text-')}`}>
                          <DeviceIcon device={d} />
                          <span className="text-white">{cap(d)}</span>
                        </span>
                        <span className="text-[#6b8f7a]">{Math.round((v / totalDevices) * 100)}%</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Beacon & worker config */}
        <div className="bg-[#0d1a14] border border-[#1a2e22] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#1a2e22] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Beacon &amp; worker</h3>
              <p className="text-xs text-[#6b8f7a] font-mono mt-0.5">Deployed configuration for this property</p>
            </div>
            {site && <GetScriptButton siteId={site.id} />}
          </div>
          {site ? (
            <div className="divide-y divide-[#1a2e22]">
              <ConfigRow label="Script path" value={site.scriptPath} mono copy />
              <ConfigRow label="Endpoint path" value={site.endpointPath} mono copy />
              <ConfigRow label="Beacon method" value={`POST · navigator.${site.beaconMethod}`} mono />
              <ConfigRow label="Worker status">
                <span className="flex items-center gap-1.5 text-xs font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"/>
                  <span className="text-emerald-400">Operational</span>
                </span>
              </ConfigRow>
              <ConfigRow label="Last event received" value={lastEventLabel} mono />
            </div>
          ) : (
            <div className="p-6 text-xs font-mono text-[#6b8f7a]">Site not found</div>
          )}
        </div>
      </main>
    </div>
  );
}

// ── helpers ──────────────────────────────────────────────────────────────────

function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

function deviceColor(d: string) {
  if (d === 'mobile') return 'bg-emerald-400';
  if (d === 'desktop') return 'bg-sky-400';
  return 'bg-violet-400';
}

const COUNTRY_NAMES: Record<string, string> = {
  AF:'Afghanistan',AL:'Albania',DZ:'Algeria',AR:'Argentina',AU:'Australia',
  AT:'Austria',BE:'Belgium',BR:'Brazil',CA:'Canada',CL:'Chile',CN:'China',
  CO:'Colombia',HR:'Croatia',CZ:'Czech Republic',DK:'Denmark',EG:'Egypt',
  FI:'Finland',FR:'France',DE:'Germany',GH:'Ghana',GR:'Greece',HK:'Hong Kong',
  HU:'Hungary',IN:'India',ID:'Indonesia',IE:'Ireland',IL:'Israel',IT:'Italy',
  JP:'Japan',KE:'Kenya',KR:'South Korea',MY:'Malaysia',MX:'Mexico',NL:'Netherlands',
  NZ:'New Zealand',NG:'Nigeria',NO:'Norway',PK:'Pakistan',PH:'Philippines',
  PL:'Poland',PT:'Portugal',RO:'Romania',RU:'Russia',SA:'Saudi Arabia',
  ZA:'South Africa',ES:'Spain',SE:'Sweden',CH:'Switzerland',TW:'Taiwan',
  TH:'Thailand',TR:'Turkey',UA:'Ukraine',GB:'United Kingdom',US:'United States',
  VN:'Vietnam',AE:'United Arab Emirates',SG:'Singapore',
};

function countryFullName(code: string): string {
  return COUNTRY_NAMES[code.toUpperCase()] ?? code;
}

function DeviceIcon({ device }: { device: string }) {
  if (device === 'mobile') return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
    </svg>
  );
  if (device === 'tablet') return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
    </svg>
  );
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
      <line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
  );
}

function relativeTime(d: Date): string {
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function PeriodTabs({ current, id }: { current: string; id: string }) {
  return (
    <div className="flex items-center gap-1 bg-[#0d1a14] border border-[#1a2e22] rounded-lg p-1">
      {PERIODS.map(p => (
        <Link
          key={p.key}
          href={`/sites/${id}?period=${p.key}`}
          className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
            current === p.key ? 'bg-[#1a2e22] text-white' : 'text-[#6b8f7a] hover:text-white'
          }`}
        >
          {p.label}
        </Link>
      ))}
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-[#0d1a14] border border-[#1a2e22] rounded-xl p-5">
      <p className="text-xs font-mono text-[#6b8f7a] uppercase tracking-wide mb-2">{label}</p>
      <p className="text-3xl font-bold tabular-nums">{value}</p>
      {sub && <p className="text-xs font-mono text-[#6b8f7a] mt-1">{sub}</p>}
    </div>
  );
}

function Panel({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div className="bg-[#0d1a14] border border-[#1a2e22] rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-[#1a2e22]">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-xs text-[#6b8f7a] font-mono mt-0.5">{count} tracked</p>
      </div>
      <div className="divide-y divide-[#1a2e22]">{children}</div>
    </div>
  );
}

function RankRow({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="px-5 py-2.5 flex items-center justify-between gap-3 relative">
      <div className="absolute inset-0 bg-emerald-400/5" style={{ width: `${pct}%` }} />
      <span className="text-xs font-mono text-[#6b8f7a] relative z-10 break-all">/ {label.replace(/^\//, '')}</span>
      <span className="text-xs font-mono text-white relative z-10 tabular-nums flex-shrink-0">{count.toLocaleString()}</span>
    </div>
  );
}

function CountryRankRow({ country, count, total }: { country: string; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const code = country.slice(0, 2).toUpperCase();
  const name = countryFullName(code);
  return (
    <div className="px-5 py-2.5 flex items-center justify-between gap-3 relative">
      <div className="absolute inset-0 bg-emerald-400/5" style={{ width: `${pct}%` }} />
      <span className="flex items-center gap-2 relative z-10">
        <span className="text-[#4a7060] text-[10px] font-bold bg-[#0d1a14] border border-[#1a2e22] px-1.5 py-0.5 rounded flex-shrink-0">{code}</span>
        <span className="text-xs font-mono text-white">{name}</span>
      </span>
      <span className="text-xs font-mono text-white relative z-10 tabular-nums flex-shrink-0">{count.toLocaleString()}</span>
    </div>
  );
}

function ConfigRow({ label, value, mono, copy, children }: { label: string; value?: string; mono?: boolean; copy?: boolean; children?: React.ReactNode }) {
  return (
    <div className="px-5 py-3.5 flex items-center justify-between gap-4">
      <span className="text-xs font-mono text-[#6b8f7a] w-40 flex-shrink-0">{label}</span>
      {children ?? (
        <span className={`text-sm ${mono ? 'font-mono text-white' : 'text-white'} flex items-center gap-2`}>
          {value}
          {copy && value && (
            <CopyButton text={value} />
          )}
        </span>
      )}
    </div>
  );
}

function EmptyPanel() {
  return (
    <div className="px-5 py-6 text-center text-xs font-mono text-[#6b8f7a]">
      No data yet — runs after next aggregation
    </div>
  );
}
