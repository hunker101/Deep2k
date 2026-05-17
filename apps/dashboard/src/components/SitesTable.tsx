'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SiteSummaryRow } from '@/lib/api';

type SortKey = 'visitors' | 'pageviews';
type FilterTab = 'all' | 'active' | 'inactive';

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

function countryName(code: string): string {
  return COUNTRY_NAMES[code.toUpperCase()] ?? code;
}

function DeviceIcon({ device }: { device: string | null }) {
  if (!device) return <span className="text-[#4a7060]">—</span>;
  if (device === 'mobile') return (
    <span className="flex items-center gap-1.5 text-[#6b8f7a] text-xs font-mono">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
      </svg>
      Mobile
    </span>
  );
  if (device === 'tablet') return (
    <span className="flex items-center gap-1.5 text-[#6b8f7a] text-xs font-mono">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
      </svg>
      Tablet
    </span>
  );
  return (
    <span className="flex items-center gap-1.5 text-[#6b8f7a] text-xs font-mono">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
        <line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
      Desktop
    </span>
  );
}

function CountryBadge({ country }: { country: string | null }) {
  if (!country) return <span className="text-[#4a7060]">—</span>;
  const code = country.slice(0, 2).toUpperCase();
  const name = countryName(code);
  return (
    <span className="flex items-center gap-1.5 text-white text-xs font-mono">
      <span className="text-[#4a7060] text-[10px] font-bold bg-[#0d1a14] border border-[#1a2e22] px-1.5 py-0.5 rounded flex-shrink-0">
        {code}
      </span>
      <span className="truncate max-w-[100px]" title={name}>{name}</span>
    </span>
  );
}

export function SitesTable({ sites }: { sites: SiteSummaryRow[] }) {
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('visitors');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const [filter, setFilter] = useState<FilterTab>('all');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const router = useRouter();

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortKey(key); setSortDir('desc'); }
  }

  const filtered = sites
    .filter(s => {
      if (filter === 'active') return s.totalPageviews > 0;
      if (filter === 'inactive') return s.totalPageviews === 0;
      return true;
    })
    .filter(s => !query.trim() || s.domain.toLowerCase().includes(query.toLowerCase().trim()))
    .sort((a, b) => {
      const val = sortKey === 'visitors'
        ? a.totalVisitors - b.totalVisitors
        : a.totalPageviews - b.totalPageviews;
      return sortDir === 'desc' ? -val : val;
    });

  async function confirmDelete(id: string) {
    setDeleting(id);
    setConfirmId(null);
    try {
      await fetch(`/api/sites/${id}`, { method: 'DELETE' });
      router.refresh();
    } finally {
      setDeleting(null);
    }
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <span className="text-[#2a4a32] ml-1">↕</span>;
    return <span className="text-emerald-400 ml-1">{sortDir === 'desc' ? '↓' : '↑'}</span>;
  }

  return (
    <div className="bg-[#0d1a14] border border-[#1a2e22] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#1a2e22] flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="font-semibold text-sm text-white">Sites</span>
          <span className="text-[#4a7060] font-mono text-xs ml-2">{filtered.length} of {sites.length} shown</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Filter tabs */}
          <div className="flex items-center bg-[#080f0c] border border-[#1a2e22] rounded-lg p-0.5">
            {(['all', 'active', 'inactive'] as FilterTab[]).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-md text-xs font-mono capitalize transition-colors ${
                  filter === f ? 'bg-[#1a2e22] text-white' : 'text-[#4a7060] hover:text-white'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4a7060]" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search domains…"
              className="bg-[#080f0c] border border-[#1a2e22] focus:border-emerald-500 rounded-lg pl-8 pr-4 py-1.5 text-xs font-mono text-white placeholder-[#3a5244] focus:outline-none transition-colors w-52"
            />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4a7060] hover:text-white">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Confirm delete overlay */}
      {confirmId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-[#0d1a14] border border-[#1a2e22] rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-white font-semibold mb-1">Delete site?</h3>
            <p className="text-xs font-mono text-[#6b8f7a] mb-5">
              This will remove <span className="text-white">{sites.find(s => s.id === confirmId)?.domain}</span> and all its data permanently.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => confirmDelete(confirmId)}
                disabled={!!deleting}
                className="bg-red-500 hover:bg-red-400 disabled:opacity-40 text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors"
              >
                {deleting ? 'Deleting…' : 'Yes, delete'}
              </button>
              <button
                onClick={() => setConfirmId(null)}
                className="text-[#6b8f7a] hover:text-white text-sm font-mono transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center text-[#4a7060] font-mono text-sm">
          {query ? `No domains matching "${query}"` : 'No sites yet.'}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1a2e22]">
                <th className="px-5 py-3 text-left text-xs font-mono text-[#4a7060] uppercase tracking-widest">Site domain</th>
                <th className="px-5 py-3 text-right text-xs font-mono text-[#4a7060] uppercase tracking-widest cursor-pointer hover:text-white transition-colors select-none" onClick={() => toggleSort('visitors')}>
                  Visitors <SortIcon k="visitors" />
                </th>
                <th className="px-5 py-3 text-right text-xs font-mono text-[#4a7060] uppercase tracking-widest cursor-pointer hover:text-white transition-colors select-none" onClick={() => toggleSort('pageviews')}>
                  Pageviews <SortIcon k="pageviews" />
                </th>
                <th className="px-5 py-3 text-left text-xs font-mono text-[#4a7060] uppercase tracking-widest">Top page</th>
                <th className="px-5 py-3 text-left text-xs font-mono text-[#4a7060] uppercase tracking-widest">Top country</th>
                <th className="px-5 py-3 text-left text-xs font-mono text-[#4a7060] uppercase tracking-widest">Device</th>
                <th className="px-5 py-3 text-left text-xs font-mono text-[#4a7060] uppercase tracking-widest">Status</th>
                <th className="px-2 py-3 sticky right-0 bg-[#0d1a14]" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#0f2018]">
              {filtered.map(s => (
                <tr
                  key={s.id}
                  onClick={() => router.push(`/sites/${s.id}`)}
                  className="hover:bg-[#0f2018] cursor-pointer transition-colors group select-none"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.totalPageviews > 0 ? '#34d399' : '#1a2e22', boxShadow: s.totalPageviews > 0 ? '0 0 6px #34d399' : 'none' }} />
                      <span className="text-emerald-400 font-mono text-sm group-hover:underline underline-offset-2" title={s.domain}>{s.domain}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono tabular-nums text-white text-sm font-semibold tracking-tight">{s.totalVisitors.toLocaleString()}</td>
                  <td className="px-5 py-3.5 text-right font-mono tabular-nums text-white text-sm font-semibold tracking-tight">{s.totalPageviews.toLocaleString()}</td>
                  <td className="px-5 py-3.5 font-mono text-[#6b8f7a] text-xs">
                    {s.topPage
                      ? <span>{`/${s.topPage.replace(/^\//, '')}`}</span>
                      : <span className="text-[#4a7060]">—</span>}
                  </td>
                  <td className="px-5 py-3.5"><CountryBadge country={s.topCountry} /></td>
                  <td className="px-5 py-3.5"><DeviceIcon device={s.topDevice} /></td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-full border ${
                      s.totalPageviews > 0
                        ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20'
                        : 'bg-[#1a2e22] text-[#4a7060] border-[#1a2e22]'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${s.totalPageviews > 0 ? 'bg-emerald-400' : 'bg-[#4a7060]'}`} />
                      {s.totalPageviews > 0 ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-3 py-3.5 sticky right-0 bg-[#0d1a14] group-hover:bg-[#0f2018] transition-colors" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={e => { e.stopPropagation(); setConfirmId(s.id); }}
                      className="text-[#4a7060] hover:text-red-400 transition-all duration-100 p-4 rounded-lg hover:bg-red-400/10 cursor-pointer"
                      title="Delete site"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                        <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
