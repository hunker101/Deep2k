import Link from 'next/link';
import { fetchLeads } from '@/lib/api';
import { LeadsTable } from '@/components/LeadsTable';
import { ThemeToggle } from '@/components/ThemeToggle';

const PERIODS = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: 'Last 7 Days' },
  { key: '30d', label: 'Last 30 Days' },
  { key: 'month', label: 'This Month' },
];

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period = '7d' } = await searchParams;
  const leads = await fetchLeads(period).catch(() => []);

  const orders = leads.filter(l => l.type === 'order').length;
  const forms = leads.filter(l => l.type === 'form').length;
  const activeSites = new Set(leads.map(l => l.siteId)).size;

  return (
    <div className="min-h-screen bg-[var(--c-bg)]">
      <header className="border-b border-[var(--c-border)] px-6 py-3 flex items-center justify-between sticky top-0 z-30" style={{ backgroundColor: 'var(--c-header-bg)', backdropFilter: 'blur(8px)' }}>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
            <span className="text-[var(--c-text)] font-semibold">Deep<span className="text-emerald-400">2K</span></span>
          </div>
          <nav className="flex items-center gap-1 bg-[var(--c-card)] border border-[var(--c-border)] rounded-lg p-1">
            <Link href="/" className="px-3 py-1.5 rounded-md text-xs font-mono text-[var(--c-text-2)] hover:text-[var(--c-text)] transition-colors">
              Analytics
            </Link>
            <Link href="/leads" className="px-3 py-1.5 rounded-md text-xs font-mono bg-[var(--c-subtle)] text-[var(--c-text)] transition-colors">
              Leads
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <a href="/api/logout" className="flex items-center gap-1.5 text-[var(--c-text-2)] hover:text-red-400 border border-transparent hover:border-red-400/20 hover:bg-red-400/5 text-xs font-mono px-3 py-1.5 rounded-lg transition-all">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign out
          </a>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--c-text)]">Leads</h1>
            <p className="text-[var(--c-text-2)] text-sm font-mono mt-0.5">
              Customer actions across all stores
            </p>
          </div>
          <div className="flex items-center gap-1 bg-[var(--c-card)] border border-[var(--c-border)] rounded-lg p-1">
            {PERIODS.map(p => (
              <Link
                key={p.key}
                href={`/leads?period=${p.key}`}
                className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
                  period === p.key
                    ? 'bg-[var(--c-subtle)] text-[var(--c-text)]'
                    : 'text-[var(--c-text-2)] hover:text-[var(--c-text)]'
                }`}
              >
                {p.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total leads" value={leads.length} />
          <StatCard label="Orders" value={orders} accent />
          <StatCard label="Form submissions" value={forms} />
          <StatCard label="Active sites" value={activeSites} />
        </div>

        <LeadsTable leads={leads} showDomain />
      </main>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="bg-[var(--c-card)] border border-[var(--c-border)] rounded-xl p-5">
      <p className="text-xs font-mono text-[var(--c-text-2)] uppercase tracking-wide mb-2">{label}</p>
      <p className={`text-3xl font-bold tabular-nums ${accent ? 'text-emerald-400' : 'text-[var(--c-text)]'}`}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}
