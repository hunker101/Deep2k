import Link from 'next/link';
import { fetchSitesSummary, fetchOverview } from '@/lib/api';
import { TrafficChart } from '@/components/TrafficChart';
import { SitesTable } from '@/components/SitesTable';
import { AddSiteButton } from '@/components/AddSiteButton';
import { BulkUploadButton } from '@/components/BulkUploadButton';

const PERIODS = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: 'Last 7 Days' },
  { key: '30d', label: 'Last 30 Days' },
  { key: 'month', label: 'This Month' },
];

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period = '7d' } = await searchParams;
  const [sites, overview] = await Promise.all([
    fetchSitesSummary(period).catch(() => []),
    fetchOverview(period).catch(() => ({ totalPageviews: 0, totalVisitors: 0, siteCount: 0, daily: [] })),
  ]);

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
          <BulkUploadButton />
          <AddSiteButton />
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
        <div className="bg-[#0d1a14] border border-[#1a2e22] rounded-xl overflow-hidden">
          {/* Chart header */}
          <div className="px-5 pt-5 pb-4 flex flex-wrap items-start justify-between gap-4 border-b border-[#1a2e22]">
            <div>
              <h2 className="text-sm font-semibold text-white">Traffic — all sites combined</h2>
              <p className="text-xs text-[#4a7060] font-mono mt-0.5">
                Daily totals · {period === '7d' ? '7 days' : period === '30d' ? '30 days' : period === 'month' ? 'this month' : 'today'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-[#0a1a10] border border-[#1a2e22] rounded-lg px-3 py-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                <span className="text-xs text-[#6b8f7a] font-mono">Visitors</span>
                <span className="text-sm font-bold text-white font-mono tabular-nums">{overview.totalVisitors.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2 bg-[#0a1a10] border border-[#1a2e22] rounded-lg px-3 py-2">
                <span className="w-2 h-2 rounded-full bg-sky-400 shadow-[0_0_6px_#38bdf8]" />
                <span className="text-xs text-[#6b8f7a] font-mono">Pageviews</span>
                <span className="text-sm font-bold text-white font-mono tabular-nums">{overview.totalPageviews.toLocaleString()}</span>
              </div>
            </div>
          </div>
          {/* Chart body */}
          <div className="px-3 pt-4 pb-2">
            {overview.daily.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center gap-2 text-[#4a7060]">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
                <span className="text-sm font-mono">No data yet — inject events then run aggregation</span>
              </div>
            ) : (
              <TrafficChart data={overview.daily} />
            )}
          </div>
        </div>

        {/* Sites table */}
        <SitesTable sites={sites} />
      </main>
    </div>
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

