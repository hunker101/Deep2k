'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SiteSummaryRow } from '@/lib/api';

export function SitesTable({ sites }: { sites: SiteSummaryRow[] }) {
  const [query, setQuery] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const router = useRouter();

  const filtered = query.trim()
    ? sites.filter(s => s.domain.toLowerCase().includes(query.toLowerCase().trim()))
    : sites;

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (confirmId !== id) { setConfirmId(id); return; }
    setDeleting(id);
    setConfirmId(null);
    try {
      await fetch(`/api/sites/${id}`, { method: 'DELETE' });
      router.refresh();
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="bg-[#0d1a14] border border-[#1a2e22] rounded-xl overflow-hidden">
      {/* Table header */}
      <div className="px-5 py-4 border-b border-[#1a2e22] flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="font-semibold text-sm text-white">Sites</span>
          <span className="text-[#4a7060] font-mono text-xs ml-2">
            {filtered.length} of {sites.length} shown
          </span>
        </div>

        {/* Live search */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4a7060]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search domains…"
            className="bg-[#080f0c] border border-[#1a2e22] focus:border-emerald-500 rounded-lg pl-9 pr-4 py-2 text-sm font-mono text-white placeholder-[#3a5244] focus:outline-none transition-colors w-72"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4a7060] hover:text-white transition-colors">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-[#4a7060] font-mono text-sm">
            {query ? `No domains matching "${query}"` : 'No sites yet.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1a2e22]">
                <th className="px-5 py-3 text-left text-xs font-mono text-[#4a7060] uppercase tracking-widest">Site domain</th>
                <th className="px-5 py-3 text-right text-xs font-mono text-[#4a7060] uppercase tracking-widest">Visitors</th>
                <th className="px-5 py-3 text-right text-xs font-mono text-[#4a7060] uppercase tracking-widest">Pageviews</th>
                <th className="px-5 py-3 text-left text-xs font-mono text-[#4a7060] uppercase tracking-widest">Endpoint</th>
                <th className="px-5 py-3 text-left text-xs font-mono text-[#4a7060] uppercase tracking-widest">Beacon</th>
                <th className="px-5 py-3 text-left text-xs font-mono text-[#4a7060] uppercase tracking-widest">Status</th>
                <th className="px-5 py-3 text-left text-xs font-mono text-[#4a7060] uppercase tracking-widest">Added</th>
                <th className="px-2 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#0f2018]">
              {filtered.map(s => (
                <tr
                  key={s.id}
                  onClick={() => router.push(`/sites/${s.id}`)}
                  className="hover:bg-[#0f2018] cursor-pointer transition-colors group"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399] flex-shrink-0" />
                      <span className="text-emerald-400 font-mono text-sm group-hover:underline underline-offset-2">
                        {s.domain}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right font-mono tabular-nums text-white text-sm font-semibold">
                    {s.totalVisitors.toLocaleString()}
                  </td>
                  <td className="px-5 py-4 text-right font-mono tabular-nums text-white text-sm font-semibold">
                    {s.totalPageviews.toLocaleString()}
                  </td>
                  <td className="px-5 py-4 font-mono text-[#6b8f7a] text-xs">{s.endpointPath}</td>
                  <td className="px-5 py-4 font-mono text-[#6b8f7a] text-xs">{s.beaconMethod}</td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-1.5 bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 text-xs font-mono px-2.5 py-1 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      Active
                    </span>
                  </td>
                  <td className="px-5 py-4 text-xs font-mono text-[#4a7060]">
                    {new Date(s.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-3 py-4" onClick={e => e.stopPropagation()}>
                    {confirmId === s.id ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={e => handleDelete(s.id, e)}
                          disabled={deleting === s.id}
                          className="text-xs font-mono text-red-400 hover:text-red-300 border border-red-400/30 px-2 py-1 rounded transition-colors"
                        >
                          {deleting === s.id ? '…' : 'Confirm'}
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); setConfirmId(null); }}
                          className="text-xs font-mono text-[#4a7060] hover:text-white transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={e => handleDelete(s.id, e)}
                        className="opacity-0 group-hover:opacity-100 text-[#4a7060] hover:text-red-400 transition-all p-1 rounded"
                        title="Delete site"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                        </svg>
                      </button>
                    )}
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
