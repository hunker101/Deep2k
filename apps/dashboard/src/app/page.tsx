import Link from 'next/link';
import { fetchSitesSummary, fetchOverview } from '@/lib/api';
import { TrafficChart } from '@/components/TrafficChart';
import type { SiteSummaryRow } from '@/lib/api';

const PERIODS = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: 'Last 7 Days' },
  { key: '30d', label: 'Last 30 Days' },
  { key: 'month', label: 'This Month' },
];

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; q?: string }>;
}) {
  const { period = '7d', q = '' } = await searchParams;
  const [sites, overview] = await Promise.all([
    fetchSitesSummary(period).catch(() => []),
    fetchOverview(period).catch(() => ({ totalPageviews: 0, totalVisitors: 0, siteCount: 0, daily: [] })),
  ]);

  const filtered = q
    ? sites.filter(s => s.domain.toLowerCase().includes(q.toLowerCase()))
    : sites;

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="min-h-screen bg-[#080f0c]">
      {/* Top nav */}
      <header className="border-b border-[#1a2e22] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
          <span className="text-white font-semibold">Deep<span className="text-emerald-400">2K</span></span>
        </div>
        <span className="text-[#6b8f7a] text-sm font-mono hidden sm:block">{today}</span>
        <div className="flex items-center gap-2">
          <span className="bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 text-sm font-semibold px-4 py-1.5 rounded-lg cursor-not-allowed select-none">
            + Add site
          </span>
          <a href="/api/logout" className="text-[#6b8f7a] hover:text-white text-xs font-mono px-2 py-1.5 transition-colors">
            Sign out
          </a>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Page title + filters */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">All sites</h1>
            <p className="text-[#6b8f7a] text-sm font-mono mt-0.5">
              Combined traffic across <span className="text-white">{overview.siteCount}</span> properties.{' '}
              <span className="text-emerald-400">● Live</span>
            </p>
          </div>
          <PeriodTabs current={period} />
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total pageviews" value={overview.totalPageviews} />
          <StatCard label="Unique visitors" value={overview.totalVisitors} />
          <StatCard label="Sites monitored" value={overview.siteCount} note="Across all backends" />
          <StatCard label="Sites active" value={overview.siteCount} note="All tracked" accent />
        </div>

        {/* Combined chart */}
        <div className="bg-[#0d1a14] border border-[#1a2e22] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold">Traffic — all sites combined</h2>
              <p className="text-xs text-[#6b8f7a] font-mono mt-0.5">Daily totals · {period === '7d' ? '7 days' : period === '30d' ? '30 days' : period === 'month' ? 'this month' : 'today'}</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-emerald-400 inline-block rounded"/>Visitors</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-sky-400 inline-block rounded"/>Pageviews</span>
            </div>
          </div>
          {overview.daily.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-[#6b8f7a] text-sm font-mono">No data yet — run aggregation after events are ingested</div>
          ) : (
            <TrafficChart data={overview.daily} />
          )}
        </div>

        {/* Sites table */}
        <div className="bg-[#0d1a14] border border-[#1a2e22] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#1a2e22] flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="font-semibold text-sm">Sites</span>
              <span className="text-[#6b8f7a] font-mono text-xs ml-2">{filtered.length} of {sites.length} shown</span>
            </div>
            <SearchBar value={q} period={period} />
          </div>

          {filtered.length === 0 ? (
            <div className="p-12 text-center text-[#6b8f7a] text-sm font-mono">
              {q ? `No sites matching "${q}"` : 'No sites yet. Run pnpm seed:pilot or POST to /api/sites.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1a2e22] text-left">
                    <th className="px-5 py-3 text-xs font-mono text-[#6b8f7a] uppercase tracking-wide">Site domain</th>
                    <th className="px-5 py-3 text-xs font-mono text-[#6b8f7a] uppercase tracking-wide text-right">Visitors</th>
                    <th className="px-5 py-3 text-xs font-mono text-[#6b8f7a] uppercase tracking-wide text-right">Pageviews</th>
                    <th className="px-5 py-3 text-xs font-mono text-[#6b8f7a] uppercase tracking-wide">Endpoint</th>
                    <th className="px-5 py-3 text-xs font-mono text-[#6b8f7a] uppercase tracking-wide">Beacon</th>
                    <th className="px-5 py-3 text-xs font-mono text-[#6b8f7a] uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a2e22]">
                  {filtered.map(s => <SiteRow key={s.id} site={s} />)}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function SiteRow({ site }: { site: SiteSummaryRow }) {
  return (
    <tr className="hover:bg-[#0f2018] transition-colors group">
      <td className="px-5 py-3">
        <Link href={`/sites/${site.id}`} className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
          <span className="text-emerald-400 font-mono hover:underline">{site.domain}</span>
        </Link>
      </td>
      <td className="px-5 py-3 text-right font-mono tabular-nums text-white">{site.totalVisitors.toLocaleString()}</td>
      <td className="px-5 py-3 text-right font-mono tabular-nums text-white">{site.totalPageviews.toLocaleString()}</td>
      <td className="px-5 py-3 font-mono text-[#6b8f7a] text-xs">{site.endpointPath}</td>
      <td className="px-5 py-3 font-mono text-[#6b8f7a] text-xs">{site.beaconMethod}</td>
      <td className="px-5 py-3">
        <span className="inline-flex items-center gap-1.5 bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 text-xs font-mono px-2 py-0.5 rounded-full">
          <span className="w-1 h-1 rounded-full bg-emerald-400" />
          Active
        </span>
      </td>
    </tr>
  );
}

function StatCard({ label, value, note, accent }: { label: string; value: number; note?: string; accent?: boolean }) {
  return (
    <div className="bg-[#0d1a14] border border-[#1a2e22] rounded-xl p-5">
      <p className="text-xs font-mono text-[#6b8f7a] uppercase tracking-wide mb-2">{label}</p>
      <p className={`text-3xl font-bold tabular-nums ${accent ? 'text-white' : 'text-white'}`}>
        {value.toLocaleString()}
      </p>
      {note && <p className="text-xs font-mono text-[#6b8f7a] mt-1">{note}</p>}
    </div>
  );
}

function PeriodTabs({ current }: { current: string }) {
  return (
    <div className="flex items-center gap-1 bg-[#0d1a14] border border-[#1a2e22] rounded-lg p-1">
      {PERIODS.map(p => (
        <Link
          key={p.key}
          href={`/?period=${p.key}`}
          className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
            current === p.key
              ? 'bg-[#1a2e22] text-white'
              : 'text-[#6b8f7a] hover:text-white'
          }`}
        >
          {p.label}
        </Link>
      ))}
    </div>
  );
}

function SearchBar({ value, period }: { value: string; period: string }) {
  return (
    <form className="flex items-center gap-2">
      <input type="hidden" name="period" value={period} />
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b8f7a]" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          name="q"
          defaultValue={value}
          placeholder="Search domains…"
          className="bg-[#080f0c] border border-[#1a2e22] rounded-lg pl-8 pr-3 py-1.5 text-xs font-mono text-white placeholder-[#3a5244] focus:outline-none focus:border-emerald-500 w-48"
        />
      </div>
    </form>
  );
}
