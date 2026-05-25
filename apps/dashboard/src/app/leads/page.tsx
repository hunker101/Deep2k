import Link from 'next/link';
import { fetchLeads } from '@/lib/api';
import { LeadsTable } from '@/components/LeadsTable';
import { ThemeToggle } from '@/components/ThemeToggle';

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

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

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
          <span className="text-[var(--c-text-3)] text-xs font-mono hidden sm:block">{today}</span>
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
        <div>
          <h1 className="text-2xl font-bold text-[var(--c-text)]">All leads</h1>
          <p className="text-[var(--c-text-2)] text-sm font-mono mt-0.5">
            Orders and form submissions captured across{' '}
            <span className="text-[var(--c-text)]">{activeSites}</span> sites.{' '}
            <span className="text-emerald-400">● Live</span>
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Leads" value={leads.length} />
          <StatCard label="Total Orders" value={orders} badge="order" />
          <StatCard label="Form Submissions" value={forms} badge="form" />
          <StatCard label="Sites with Leads" value={activeSites} note="active in last day" />
        </div>

        <LeadsTable leads={leads} showDomain period={period} />
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  badge,
  note,
}: {
  label: string;
  value: number;
  badge?: 'order' | 'form';
  note?: string;
}) {
  return (
    <div className="bg-[var(--c-card)] border border-[var(--c-border)] rounded-xl p-5">
      <p className="text-[10px] font-mono text-[var(--c-text-3)] uppercase tracking-widest mb-3">{label}</p>
      <div className="flex items-center gap-2">
        <p className="text-3xl font-bold tabular-nums text-[var(--c-text)]">{value.toLocaleString()}</p>
        {badge && (
          <span className={`inline-flex items-center text-[10px] font-mono px-2 py-0.5 rounded border ${
            badge === 'order'
              ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20'
              : 'bg-blue-400/10 text-blue-400 border-blue-400/20'
          }`}>
            {badge}
          </span>
        )}
      </div>
      {note && <p className="text-xs font-mono text-[var(--c-text-3)] mt-1">{note}</p>}
    </div>
  );
}
