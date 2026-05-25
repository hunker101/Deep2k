'use client';

import React, { useState } from 'react';
import type { LeadRow } from '@/lib/api';

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function TypeBadge({ type }: { type: string }) {
  const isOrder = type === 'order';
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full border ${
      isOrder
        ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20'
        : 'bg-blue-400/10 text-blue-400 border-blue-400/20'
    }`}>
      {isOrder ? 'order' : 'form'}
    </span>
  );
}

function ExpandedFields({ fields }: { fields: Record<string, unknown> }) {
  return (
    <div className="px-4 py-3 bg-[var(--c-bg)] border-t border-[var(--c-border)]">
      <div className="grid grid-cols-2 gap-x-8 gap-y-1.5">
        {Object.entries(fields).map(([k, v]) => (
          <div key={k} className="flex gap-2 text-xs font-mono">
            <span className="text-[var(--c-text-3)] flex-shrink-0">{k}:</span>
            <span className="text-[var(--c-text)] truncate">{String(v)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LeadsTable({
  leads,
  showDomain = false,
}: {
  leads: LeadRow[];
  showDomain?: boolean;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<'all' | 'order' | 'form'>('all');

  const filtered = typeFilter === 'all' ? leads : leads.filter(l => l.type === typeFilter);
  const orders = leads.filter(l => l.type === 'order').length;
  const forms = leads.filter(l => l.type === 'form').length;

  return (
    <div className="bg-[var(--c-card)] border border-[var(--c-border)] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[var(--c-border)] flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="text-xs font-mono text-[var(--c-text-2)]">
            <span className="text-[var(--c-text)] font-semibold">{leads.length}</span> leads
            <span className="mx-2 text-[var(--c-border)]">·</span>
            <span className="text-emerald-400">{orders}</span> orders
            <span className="mx-2 text-[var(--c-border)]">·</span>
            <span className="text-blue-400">{forms}</span> forms
          </div>
        </div>
        <div className="flex items-center gap-1 bg-[var(--c-deep)] border border-[var(--c-border)] rounded-lg p-1">
          {(['all', 'order', 'form'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1 rounded-md text-xs font-mono transition-colors ${
                typeFilter === t ? 'bg-[var(--c-subtle)] text-[var(--c-text)]' : 'text-[var(--c-text-2)] hover:text-[var(--c-text)]'
              }`}
            >
              {t === 'all' ? 'All' : t === 'order' ? 'Orders' : 'Forms'}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-16 flex flex-col items-center gap-2 text-[var(--c-text-3)]">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          <span className="text-sm font-mono">No leads yet</span>
        </div>
      ) : (
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="border-b border-[var(--c-border)]">
              <th className="text-left px-4 py-2.5 text-[var(--c-text-3)] font-normal">Date</th>
              {showDomain && <th className="text-left px-4 py-2.5 text-[var(--c-text-3)] font-normal">Store</th>}
              <th className="text-left px-4 py-2.5 text-[var(--c-text-3)] font-normal">Type</th>
              <th className="text-left px-4 py-2.5 text-[var(--c-text-3)] font-normal">Name</th>
              <th className="text-left px-4 py-2.5 text-[var(--c-text-3)] font-normal">Email</th>
              <th className="text-left px-4 py-2.5 text-[var(--c-text-3)] font-normal">Phone</th>
              <th className="text-left px-4 py-2.5 text-[var(--c-text-3)] font-normal">Page</th>
              <th className="px-4 py-2.5"></th>
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
                    className="hover:bg-[var(--c-subtle)] transition-colors cursor-pointer"
                    onClick={() => setExpanded(isExpanded ? null : lead.id)}
                  >
                    <td className="px-4 py-3 text-[var(--c-text-2)]">{timeAgo(lead.createdAt)}</td>
                    {showDomain && (
                      <td className="px-4 py-3 text-emerald-400">{lead.domain ?? '—'}</td>
                    )}
                    <td className="px-4 py-3"><TypeBadge type={lead.type} /></td>
                    <td className="px-4 py-3 text-[var(--c-text)]">{name}</td>
                    <td className="px-4 py-3 text-[var(--c-text-2)]">{email}</td>
                    <td className="px-4 py-3 text-[var(--c-text-2)]">{phone}</td>
                    <td className="px-4 py-3 text-[var(--c-text-3)] max-w-[160px] truncate">{lead.pageUrl ?? '—'}</td>
                    <td className="px-4 py-3 text-[var(--c-text-3)]">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${lead.id}-expanded`}>
                      <td colSpan={showDomain ? 8 : 7} className="p-0">
                        <ExpandedFields fields={lead.fields} />
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
