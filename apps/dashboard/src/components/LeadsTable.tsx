'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import type { LeadRow } from '@/lib/api';

function formatDate(date: string) {
  const d = new Date(date);
  const month = d.toLocaleString('en-US', { month: 'short' });
  const day = d.getDate();
  const year = String(d.getFullYear()).slice(2);
  const time = d.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${month} ${day}, '${year} · ${time}`;
}

function getPathname(url: string | null): string {
  if (!url) return '—';
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
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
    !SKIP_KEYS.has(k.toLowerCase()) &&
    v !== null && v !== undefined && v !== ''
  );
  const isOrder = type === 'order';

  return (
    <div className="px-6 py-5 bg-[var(--c-bg)] border-t border-[var(--c-border)]">
      <p className="text-[9px] font-mono text-[var(--c-text-3)] uppercase tracking-widest mb-4">
        {isOrder ? 'Order' : 'Submission'}
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

  const filtered = leads.filter(l => {
    if (typeFilter !== 'all' && l.type !== typeFilter) return false;
    if (search && !(l.domain ?? '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const colSpan = showDomain ? 9 : 8;

  return (
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
                  onClick={() => setTypeFilter(t)}
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

          {/* Search */}
          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--c-text-3)]" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Search store..."
              value={search}
              onChange={e => setSearch(e.target.value)}
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
            {filtered.map(lead => {
              const f = lead.fields as Record<string, string>;
              const name = f['first_name'] && f['last_name']
                ? `${f['first_name']} ${f['last_name']}`
                : f['name'] ?? f['first_name'] ?? '—';
              const email = f['email'] ?? f['contact[email]'] ?? '—';
              const phone = f['phone'] ?? f['contact[phone]'] ?? '—';
              const isExpanded = expanded === lead.id;

              return (
                <React.Fragment key={lead.id}>
                  <tr
                    className={`hover:bg-[var(--c-subtle)] transition-colors cursor-pointer ${isExpanded ? 'bg-[var(--c-subtle)]' : ''}`}
                    onClick={() => setExpanded(isExpanded ? null : lead.id)}
                  >
                    <td className="px-4 py-3 text-[var(--c-text-3)]">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`transition-transform duration-150 ${isExpanded ? 'rotate-180' : ''}`}>
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </td>
                    <td className="px-4 py-3 text-[var(--c-text-2)] whitespace-nowrap">{formatDate(lead.createdAt)}</td>
                    {showDomain && (
                      <td className="px-4 py-3 font-semibold text-[var(--c-text)]">{lead.domain ?? '—'}</td>
                    )}
                    <td className="px-4 py-3"><TypeBadge type={lead.type} /></td>
                    <td className="px-4 py-3 font-semibold text-[var(--c-text)]">{name}</td>
                    <td className="px-4 py-3 text-[var(--c-text-2)]">{email}</td>
                    <td className="px-4 py-3 text-[var(--c-text-2)]">{phone}</td>
                    <td className="px-4 py-3 text-[var(--c-text-3)] max-w-[160px] truncate">{getPathname(lead.pageUrl)}</td>
                    <td className="px-4 py-3 text-[var(--c-text-3)] hover:text-[var(--c-text)] transition-colors select-none">
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
    </div>
  );
}
