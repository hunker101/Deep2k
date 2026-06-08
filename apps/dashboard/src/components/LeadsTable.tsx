'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import type { LeadRow } from '@/lib/api';

function formatDate(date: string) {
  const d = new Date(date);
  const month = d.toLocaleString('en-US', { month: 'short' });
  const day = d.getDate();
  const year = d.getFullYear();
  const time = d.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${month} ${day}, ${year} · ${time}`;
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'today';
  if (days === 1) return '1d ago';
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? '1mo ago' : `${months}mo ago`;
}

function getPathname(url: string | null): string {
  if (!url) return '—';
  try { return new URL(url).pathname; } catch { return url; }
}

function extractEmail(fields: Record<string, unknown>): string {
  const v = fields['email'] ?? fields['contact[email]'];
  return typeof v === 'string' && v ? v : '—';
}

function extractPhone(fields: Record<string, unknown>): string {
  const v = fields['phone'] ?? fields['contact[phone]'];
  return typeof v === 'string' && v ? v : '—';
}

function extractName(fields: Record<string, unknown>): string {
  const f = fields as Record<string, string>;
  if (f['first_name'] && f['last_name']) return `${f['first_name']} ${f['last_name']}`;
  return f['name'] ?? f['first_name'] ?? '—';
}

function TypeBadge({ type }: { type: string }) {
  const isOrder = type === 'order';
  return (
    <span className={`inline-flex items-center text-[10px] font-mono px-2 py-0.5 rounded border ${
      isOrder
        ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20'
        : 'bg-blue-400/10 text-blue-400 border-blue-400/20'
    }`}>
      {type}
    </span>
  );
}

function ExpandedFields({ fields, type }: { fields: Record<string, unknown>; type: string }) {
  const SKIP_KEYS = new Set(['utf8', 'form_key', 'authenticity_token', '_method', 'commit']);
  const entries = Object.entries(fields).filter(([k, v]) =>
    !SKIP_KEYS.has(k.toLowerCase()) && v !== null && v !== undefined && v !== ''
  );
  return (
    <div className="px-6 py-5 bg-[var(--c-bg)] border-t border-[var(--c-border)]">
      <p className="text-[9px] font-mono text-[var(--c-text-3)] uppercase tracking-widest mb-4">
        {type === 'order' ? 'Order' : 'Submission'}
      </p>
      <div className="grid grid-cols-2 gap-x-12 gap-y-2.5">
        {entries.map(([k, v]) => (
          <div key={k} className="flex gap-3 text-xs font-mono">
            <span className="text-[var(--c-text-3)] flex-shrink-0 w-36 capitalize">{k.replace(/_/g, ' ')}</span>
            <span className="text-[var(--c-text)] break-all">{String(v)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function exportCSV(rows: LeadRow[], showDomain: boolean) {
  const headers = ['Date', ...(showDomain ? ['Store'] : []), 'Type', 'Name', 'Email', 'Phone', 'Page URL'];
  const csvRows = rows.map(l => {
    const f = l.fields as Record<string, unknown>;
    const name = extractName(f);
    const email = extractEmail(f);
    const phone = extractPhone(f);
    const row = [
      formatDate(l.createdAt),
      ...(showDomain ? [l.domain ?? ''] : []),
      l.type,
      name === '—' ? '' : name,
      email === '—' ? '' : email,
      phone === '—' ? '' : phone,
      l.pageUrl ?? '',
    ];
    return row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
  });
  const csv = [headers.join(','), ...csvRows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function CustomerHistoryDrawer({
  email,
  name,
  onClose,
}: {
  email: string | null;
  name: string | null;
  onClose: () => void;
}) {
  const [history, setHistory] = useState<LeadRow[] | null>(null);

  useEffect(() => {
    if (!email) return;
    setHistory(null);
    fetch(`/api/leads/by-email?email=${encodeURIComponent(email)}`)
      .then(r => r.json() as Promise<LeadRow[]>)
      .then(setHistory)
      .catch(() => setHistory([]));
  }, [email]);

  if (!email) return null;

  const orders = history?.filter(l => l.type === 'order') ?? [];
  const forms = history?.filter(l => l.type === 'form') ?? [];
  const totalSpent = orders.reduce((sum, l) => {
    const t = (l.fields as Record<string, string>)['total'];
    return sum + (t ? parseFloat(t) : 0);
  }, 0);
  const storesVisited = [...new Set(history?.map(l => l.domain).filter(Boolean) ?? [])] as string[];
  const firstSeen = history?.length ? history[history.length - 1]?.createdAt : null;
  const initials = name
    ? name.split(' ').map(n => n[0] ?? '').join('').slice(0, 2).toUpperCase()
    : email.slice(0, 2).toUpperCase();

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[420px] z-50 bg-[var(--c-card)] border-l border-[var(--c-border)] overflow-y-auto flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-[var(--c-border)] flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-400/20 flex items-center justify-center text-emerald-400 font-mono font-bold text-sm flex-shrink-0">
              {initials}
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--c-text)]">{name ?? email}</p>
              <p className="text-xs font-mono text-[var(--c-text-3)]">{email}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[var(--c-text-3)] hover:text-[var(--c-text)] transition-colors mt-1">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 divide-x divide-[var(--c-border)] border-b border-[var(--c-border)]">
          <div className="px-3 py-3 text-center">
            <p className="text-lg font-bold tabular-nums text-[var(--c-text)]">{history === null ? '…' : orders.length}</p>
            <p className="text-[9px] font-mono text-[var(--c-text-3)] uppercase tracking-wider mt-0.5">Orders</p>
          </div>
          <div className="px-3 py-3 text-center">
            <p className="text-sm font-bold tabular-nums text-emerald-400">
              {history === null ? '…' : totalSpent > 0 ? `$${totalSpent.toFixed(2)}` : '—'}
            </p>
            <p className="text-[9px] font-mono text-[var(--c-text-3)] uppercase tracking-wider mt-0.5">Spent</p>
          </div>
          <div className="px-3 py-3 text-center">
            <p className="text-lg font-bold tabular-nums text-[var(--c-text)]">{history === null ? '…' : forms.length}</p>
            <p className="text-[9px] font-mono text-[var(--c-text-3)] uppercase tracking-wider mt-0.5">Forms</p>
          </div>
          <div className="px-3 py-3 text-center">
            <p className="text-xs font-mono text-[var(--c-text)]">{firstSeen ? timeAgo(firstSeen) : '—'}</p>
            <p className="text-[9px] font-mono text-[var(--c-text-3)] uppercase tracking-wider mt-0.5">First seen</p>
          </div>
        </div>

        {/* Stores visited */}
        {storesVisited.length > 0 && (
          <div className="px-6 py-4 border-b border-[var(--c-border)]">
            <p className="text-[9px] font-mono text-[var(--c-text-3)] uppercase tracking-widest mb-2">Stores Visited</p>
            <div className="flex flex-wrap gap-1.5">
              {storesVisited.map(domain => (
                <span key={domain} className="text-xs font-mono px-2 py-0.5 bg-[var(--c-subtle)] border border-[var(--c-border)] rounded text-[var(--c-text-2)]">
                  {domain}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="px-6 py-4 flex-1">
          <p className="text-[9px] font-mono text-[var(--c-text-3)] uppercase tracking-widest mb-4">
            Full History · {history === null ? '…' : history.length} events
          </p>
          {history === null ? (
            <div className="flex items-center justify-center py-8 text-[var(--c-text-3)] text-xs font-mono">Loading…</div>
          ) : history.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-[var(--c-text-3)] text-xs font-mono">No history found</div>
          ) : (
            <div className="space-y-0">
              {history.map((lead, i) => {
                const f = lead.fields as Record<string, string>;
                const isOrder = lead.type === 'order';
                return (
                  <div key={lead.id} className="flex gap-3">
                    <div className="flex flex-col items-center mt-1">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isOrder ? 'bg-emerald-400' : 'bg-blue-400'}`} />
                      {i < history.length - 1 && <div className="w-px flex-1 bg-[var(--c-border)] min-h-[24px]" />}
                    </div>
                    <div className="pb-5 flex-1 min-w-0">
                      <p className="text-[10px] font-mono text-[var(--c-text-3)] mb-0.5">{formatDate(lead.createdAt)}</p>
                      <p className="text-xs font-mono text-[var(--c-text-2)] mb-1.5">{lead.domain}</p>
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <TypeBadge type={lead.type} />
                        {isOrder && f['order_id'] && (
                          <span className="text-xs font-mono text-[var(--c-text-3)]">{f['order_id']}</span>
                        )}
                        {isOrder && f['total'] && (
                          <span className="text-xs font-mono font-semibold text-emerald-400">${f['total']}</span>
                        )}
                      </div>
                      {isOrder && f['items'] && (
                        <p className="text-[10px] font-mono text-[var(--c-text-3)] leading-relaxed break-words">{f['items']}</p>
                      )}
                      {!isOrder && f['message'] && (
                        <p className="text-[10px] font-mono text-[var(--c-text-3)] italic">&ldquo;{f['message']}&rdquo;</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const DATE_TABS = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: '7d' },
  { key: '30d', label: '30d' },
];

export function LeadsTable({
  leads,
  showDomain = false,
  period = '7d',
}: {
  leads: LeadRow[];
  showDomain?: boolean;
  period?: string;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<'all' | 'order' | 'form'>('all');
  const [search, setSearch] = useState('');
  const [showRepeatOnly, setShowRepeatOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [drawerEmail, setDrawerEmail] = useState<string | null>(null);
  const [drawerName, setDrawerName] = useState<string | null>(null);

  const PAGE_SIZE = 25;

  const emailCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of leads) {
      const email = extractEmail(l.fields as Record<string, unknown>);
      if (email !== '—') {
        const key = email.toLowerCase();
        map.set(key, (map.get(key) ?? 0) + 1);
      }
    }
    return map;
  }, [leads]);

  const filtered = leads.filter(l => {
    if (typeFilter !== 'all' && l.type !== typeFilter) return false;
    if (search && !(l.domain ?? '').toLowerCase().includes(search.toLowerCase())) return false;
    if (showRepeatOnly) {
      const email = extractEmail(l.fields as Record<string, unknown>);
      if (email === '—' || (emailCounts.get(email.toLowerCase()) ?? 0) <= 1) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const colSpan = showDomain ? 9 : 8;

  return (
    <>
      <CustomerHistoryDrawer
        email={drawerEmail}
        name={drawerName}
        onClose={() => setDrawerEmail(null)}
      />
      <div className="bg-[var(--c-card)] border border-[var(--c-border)] rounded-xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--c-border)] flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm font-semibold text-[var(--c-text)]">Leads</p>
            <p className="text-[11px] font-mono text-[var(--c-text-3)] mt-0.5">{filtered.length} records</p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Date range */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-[var(--c-text-3)] uppercase tracking-wider">Date Range</span>
              <div className="flex items-center gap-1 bg-[var(--c-deep)] border border-[var(--c-border)] rounded-lg p-1">
                {DATE_TABS.map(t => (
                  <Link
                    key={t.key}
                    href={`/leads?period=${t.key}`}
                    className={`px-2.5 py-1 rounded-md text-xs font-mono transition-colors ${
                      period === t.key
                        ? 'bg-[var(--c-subtle)] text-[var(--c-text)]'
                        : 'text-[var(--c-text-2)] hover:text-[var(--c-text)]'
                    }`}
                  >
                    {t.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Type filter */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-[var(--c-text-3)] uppercase tracking-wider">Type</span>
              <div className="flex items-center gap-1 bg-[var(--c-deep)] border border-[var(--c-border)] rounded-lg p-1">
                {(['all', 'order', 'form'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => { setTypeFilter(t); setPage(1); }}
                    className={`px-2.5 py-1 rounded-md text-xs font-mono transition-colors ${
                      typeFilter === t
                        ? 'bg-[var(--c-subtle)] text-[var(--c-text)]'
                        : 'text-[var(--c-text-2)] hover:text-[var(--c-text)]'
                    }`}
                  >
                    {t === 'all' ? 'All' : t === 'order' ? 'Orders' : 'Forms'}
                  </button>
                ))}
              </div>
            </div>

            {/* Repeat buyers toggle */}
            <button
              onClick={() => { setShowRepeatOnly(v => !v); setPage(1); }}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-mono border transition-colors flex items-center gap-1.5 ${
                showRepeatOnly
                  ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/30'
                  : 'bg-[var(--c-deep)] border-[var(--c-border)] text-[var(--c-text-2)] hover:text-[var(--c-text)]'
              }`}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/>
              </svg>
              Repeat
            </button>

            {/* Search */}
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--c-text-3)]" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                type="text"
                placeholder="Search store..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="pl-8 pr-7 py-1.5 bg-[var(--c-deep)] border border-[var(--c-border)] rounded-lg text-xs font-mono text-[var(--c-text)] placeholder-[var(--c-text-3)] focus:outline-none focus:border-emerald-400/40 w-40"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--c-text-3)] hover:text-[var(--c-text)]"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M18 6 6 18M6 6l12 12"/>
                  </svg>
                </button>
              )}
            </div>

            {/* Export CSV */}
            <button
              onClick={() => exportCSV(filtered, showDomain)}
              className="px-2.5 py-1.5 bg-[var(--c-deep)] border border-[var(--c-border)] rounded-lg text-xs font-mono text-[var(--c-text-2)] hover:text-[var(--c-text)] hover:border-emerald-400/30 transition-colors flex items-center gap-1.5"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Export CSV
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-2 text-[var(--c-text-3)]">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <span className="text-sm font-mono">No leads found</span>
          </div>
        ) : (
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-[var(--c-border)]">
                <th className="w-8 px-4 py-2.5"></th>
                <th className="text-left px-4 py-2.5 text-[var(--c-text-3)] font-normal">Date</th>
                {showDomain && <th className="text-left px-4 py-2.5 text-[var(--c-text-3)] font-normal">Store</th>}
                <th className="text-left px-4 py-2.5 text-[var(--c-text-3)] font-normal">Type</th>
                <th className="text-left px-4 py-2.5 text-[var(--c-text-3)] font-normal">Name</th>
                <th className="text-left px-4 py-2.5 text-[var(--c-text-3)] font-normal">Email</th>
                <th className="text-left px-4 py-2.5 text-[var(--c-text-3)] font-normal">Phone</th>
                <th className="text-left px-4 py-2.5 text-[var(--c-text-3)] font-normal">Page URL</th>
                <th className="text-left px-4 py-2.5 text-[var(--c-text-3)] font-normal">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--c-border)]">
              {paginated.map(lead => {
                const f = lead.fields as Record<string, unknown>;
                const name = extractName(f);
                const email = extractEmail(f);
                const phone = extractPhone(f);
                const isExpanded = expanded === lead.id;
                const emailCount = email !== '—' ? (emailCounts.get(email.toLowerCase()) ?? 1) : 1;
                const isRepeat = emailCount > 1;

                return (
                  <React.Fragment key={lead.id}>
                    <tr
                      className={`hover:bg-[var(--c-subtle)] transition-colors cursor-pointer ${isExpanded ? 'bg-[var(--c-subtle)]' : ''}`}
                      onClick={() => {
                        if (email !== '—') {
                          setDrawerEmail(email.toLowerCase());
                          setDrawerName(name !== '—' ? name : null);
                        }
                      }}
                    >
                      <td
                        className="px-4 py-3 text-[var(--c-text-3)] hover:text-[var(--c-text)]"
                        onClick={e => { e.stopPropagation(); setExpanded(isExpanded ? null : lead.id); }}
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`transition-transform duration-150 ${isExpanded ? 'rotate-180' : ''}`}>
                          <polyline points="6 9 12 15 18 9"/>
                        </svg>
                      </td>
                      <td className="px-4 py-3 text-[var(--c-text-2)] whitespace-nowrap">{formatDate(lead.createdAt)}</td>
                      {showDomain && (
                        <td className="px-4 py-3 font-semibold text-[var(--c-text)]">{lead.domain ?? '—'}</td>
                      )}
                      <td className="px-4 py-3"><TypeBadge type={lead.type} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[var(--c-text)]">{name}</span>
                          {isRepeat && (
                            <span className="inline-flex items-center text-[9px] font-mono px-1.5 py-0.5 rounded border bg-emerald-400/10 text-emerald-400 border-emerald-400/20 flex-shrink-0">
                              +{emailCount}x
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[var(--c-text-2)]">{email}</td>
                      <td className="px-4 py-3 text-[var(--c-text-2)]">{phone}</td>
                      <td className="px-4 py-3 text-[var(--c-text-3)] max-w-[160px] truncate">{getPathname(lead.pageUrl)}</td>
                      <td
                        className="px-4 py-3 text-[var(--c-text-3)] hover:text-[var(--c-text)] transition-colors select-none"
                        onClick={e => { e.stopPropagation(); setExpanded(isExpanded ? null : lead.id); }}
                      >
                        {isExpanded ? 'Hide' : 'View'}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={colSpan} className="p-0">
                          <ExpandedFields fields={lead.fields} type={lead.type} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}

        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-[var(--c-border)] flex items-center justify-between">
            <span className="text-xs font-mono text-[var(--c-text-3)]">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--c-text-3)] hover:text-[var(--c-text)] hover:bg-[var(--c-subtle)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              {(() => {
                const delta = 2;
                const range: (number | '…')[] = [];
                const left = Math.max(2, page - delta);
                const right = Math.min(totalPages - 1, page + delta);
                range.push(1);
                if (left > 2) range.push('…');
                for (let i = left; i <= right; i++) range.push(i);
                if (right < totalPages - 1) range.push('…');
                if (totalPages > 1) range.push(totalPages);
                return range.map((p, i) =>
                  p === '…' ? (
                    <span key={`e-${i}`} className="w-7 h-7 flex items-center justify-center text-xs font-mono text-[var(--c-text-3)]">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p as number)}
                      className={`w-7 h-7 flex items-center justify-center rounded-md text-xs font-mono transition-colors ${
                        page === p ? 'bg-emerald-400/20 text-emerald-400 border border-emerald-400/30' : 'text-[var(--c-text-2)] hover:text-[var(--c-text)] hover:bg-[var(--c-subtle)]'
                      }`}
                    >
                      {p}
                    </button>
                  )
                );
              })()}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--c-text-3)] hover:text-[var(--c-text)] hover:bg-[var(--c-subtle)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
