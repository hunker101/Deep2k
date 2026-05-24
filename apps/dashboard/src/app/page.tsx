import Link from 'next/link';
import { fetchSitesSummary, fetchOverview } from '@/lib/api';
import { TrafficChart } from '@/components/TrafficChart';
import { SitesTable } from '@/components/SitesTable';
import { FloatingActions } from '@/components/FloatingActions';
import { ThemeToggle } from '@/components/ThemeToggle';
import { RotateScriptsButton } from '@/components/RotateScriptsButton';

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
  const now = Date.now();
  const activeSiteCount = sites.filter(s => s.totalPageviews > 0 && s.lastEvent && (now - new Date(s.lastEvent).getTime()) < 24 * 60 * 60 * 1000).length;

  return (
    <div className="min-h-screen bg-[var(--c-bg)]">
      {/* Top nav */}
      <header className="border-b border-[var(--c-border)] px-6 py-3 flex items-center justify-between sticky top-0 z-30" style={{ backgroundColor: 'var(--c-header-bg)', backdropFilter: 'blur(8px)' }}>
        <div className="flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
          <span className="text-[var(--c-text)] font-semibold">Deep<span className="text-emerald-400">2K</span></span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[var(--c-text-3)] text-xs font-mono hidden sm:block">{today}</span>
          <ThemeToggle />
          <a
            href="/api/logout"
            className="flex items-center gap-1.5 text-[var(--c-text-2)] hover:text-red-400 border border-transparent hover:border-red-400/20 hover:bg-red-400/5 text-xs font-mono px-3 py-1.5 rounded-lg transition-all"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign out
          </a>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 pb-28 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--c-text)]">All sites</h1>
            <p className="text-[var(--c-text-2)] text-sm font-mono mt-0.5">
              Combined traffic across <span className="text-[var(--c-text)]">{overview.siteCount}</span> properties.{' '}
              <span className="text-emerald-400">● Live</span>
            </p>
          </div>
          <PeriodTabs current={period} />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total pageviews" value={overview.totalPageviews} />
          <StatCard label="Unique visitors" value={overview.totalVisitors} />
          <StatCard label="Sites monitored" value={overview.siteCount} note="Across all backends" />
          <StatCard label="Sites active" value={activeSiteCount} note="Last 24 hours" accent />
        </div>

        <div className="bg-[var(--c-card)] border border-[var(--c-border)] rounded-xl overflow-hidden">
          <div className="px-5 pt-5 pb-4 border-b border-[var(--c-border)] flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[var(--c-text)]">Traffic — all sites combined</h2>
              <p className="text-xs text-[var(--c-text-3)] font-mono mt-0.5">
                Daily totals · {period === '7d' ? '7 days' : period === '30d' ? '30 days' : period === 'month' ? 'this month' : 'today'}
              </p>
            </div>
            <RotateScriptsButton />
          </div>
          <div className="px-5 pt-4 pb-3 space-y-3">
            {overview.daily.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center gap-2 text-[var(--c-text-3)]">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
                <span className="text-sm font-mono">No data yet — inject events then run aggregation</span>
              </div>
            ) : (
              <TrafficChart data={overview.daily} totalVisitors={overview.totalVisitors} totalPageviews={overview.totalPageviews} />
            )}
          </div>
        </div>

        <SitesTable sites={sites} />
      </main>

      <FloatingActions />
    </div>
  );
}

function StatCard({ label, value, note, accent }: { label: string; value: number; note?: string; accent?: boolean }) {
  return (
    <div className="bg-[var(--c-card)] border border-[var(--c-border)] rounded-xl p-5">
      <p className="text-xs font-mono text-[var(--c-text-2)] uppercase tracking-wide mb-2">{label}</p>
      <p className={`text-3xl font-bold tabular-nums ${accent ? 'text-emerald-400' : 'text-[var(--c-text)]'}`}>
        {value.toLocaleString()}
      </p>
      {note && <p className="text-xs font-mono text-[var(--c-text-2)] mt-1">{note}</p>}
    </div>
  );
}

function PeriodTabs({ current }: { current: string }) {
  return (
    <div className="flex items-center gap-1 bg-[var(--c-card)] border border-[var(--c-border)] rounded-lg p-1">
      {PERIODS.map(p => (
        <Link
          key={p.key}
          href={`/?period=${p.key}`}
          className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
            current === p.key
              ? 'bg-[var(--c-subtle)] text-[var(--c-text)]'
              : 'text-[var(--c-text-2)] hover:text-[var(--c-text)]'
          }`}
        >
          {p.label}
        </Link>
      ))}
    </div>
  );
}
