'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { SiteSummaryRow, CategoryRow } from '@/lib/api';

type SortKey = 'visitors' | 'pageviews';
type FilterTab = 'all' | 'active' | 'inactive';
type InjectionFilter = 'all' | 'injected' | 'never';

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
  if (!device) return <span className="text-[var(--c-text-3)]">—</span>;
  if (device === 'mobile') return (
    <span className="flex items-center gap-1.5 text-[var(--c-text-2)] text-xs font-mono">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
      </svg>
      Mobile
    </span>
  );
  if (device === 'tablet') return (
    <span className="flex items-center gap-1.5 text-[var(--c-text-2)] text-xs font-mono">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
      </svg>
      Tablet
    </span>
  );
  return (
    <span className="flex items-center gap-1.5 text-[var(--c-text-2)] text-xs font-mono">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
        <line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
      Desktop
    </span>
  );
}

function isStale(lastEvent: string | null): boolean {
  if (!lastEvent) return true;
  return Date.now() - new Date(lastEvent).getTime() > 24 * 60 * 60 * 1000;
}

function getStatus(s: SiteSummaryRow): string {
  if (!s.lastEvent) return 'Inactive';
  if (!isStale(s.lastEvent)) return 'Active';
  return 'Stale';
}

function exportCSV(sites: SiteSummaryRow[]) {
  const today = new Date().toISOString().slice(0, 10);
  const headers = ['Domain', 'Status', 'Pageviews', 'Unique Visitors', 'Top Country', 'Top Device'];
  const rows = sites.map(s => [
    s.domain,
    getStatus(s),
    s.totalPageviews,
    s.totalVisitors,
    s.topCountry ? countryName(s.topCountry.slice(0, 2).toUpperCase()) : '—',
    s.topDevice ? s.topDevice.charAt(0).toUpperCase() + s.topDevice.slice(1) : '—',
  ]);
  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `deep2k-report-${today}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function InjectionIndicator({ lastInjectedAt }: { lastInjectedAt: string | null }) {
  if (!lastInjectedAt) {
    return (
      <span className="text-[10px] font-mono text-[var(--c-text-3)] border border-[var(--c-border)] px-1.5 py-0.5 rounded" title="Never injected">
        ?
      </span>
    );
  }
  const days = Math.floor((Date.now() - new Date(lastInjectedAt).getTime()) / (1000 * 60 * 60 * 24));
  if (days >= 90) {
    return (
      <span className="text-[10px] font-mono text-red-400 border border-red-400/30 px-1.5 py-0.5 rounded" title={`Overdue · ${days}d ago`}>
        {days}d
      </span>
    );
  }
  if (days >= 60) {
    return (
      <span className="text-[10px] font-mono text-yellow-400 border border-yellow-400/30 px-1.5 py-0.5 rounded" title={`Due soon · ${days}d ago`}>
        {days}d
      </span>
    );
  }
  return null;
}

function StatusBadge({ lastEvent }: { lastEvent: string | null }) {
  if (!lastEvent) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-full border bg-[var(--c-subtle)] text-[var(--c-text-3)] border-[var(--c-border)]">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--c-text-3)]" />
        Inactive
      </span>
    );
  }
  if (!isStale(lastEvent)) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-full border bg-emerald-400/10 text-emerald-400 border-emerald-400/20">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        Active
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-full border bg-yellow-400/10 text-yellow-400 border-yellow-400/20" title="No events received in the last 24h">
      <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
      Stale
    </span>
  );
}

function CountryBadge({ country }: { country: string | null }) {
  if (!country) return <span className="text-[var(--c-text-3)]">—</span>;
  const code = country.slice(0, 2).toUpperCase();
  const name = countryName(code);
  return (
    <span className="flex items-center gap-1.5 text-[var(--c-text)] text-xs font-mono">
      <span className="text-[var(--c-text-3)] text-[10px] font-bold bg-[var(--c-card)] border border-[var(--c-border)] px-1.5 py-0.5 rounded flex-shrink-0">
        {code}
      </span>
      <span className="truncate max-w-[100px]" title={name}>{name}</span>
    </span>
  );
}

export function SitesTable({ sites, categories: initialCategories = [] }: { sites: SiteSummaryRow[]; categories?: CategoryRow[] }) {
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('visitors');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const [filter, setFilter] = useState<FilterTab>('all');
  const [injectionFilter, setInjectionFilter] = useState<InjectionFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [categories, setCategories] = useState<CategoryRow[]>(initialCategories);
  const [catDropdownOpen, setCatDropdownOpen] = useState(false);
  const [catNewName, setCatNewName] = useState('');
  const [catAdding, setCatAdding] = useState(false);
  const [showCatInput, setShowCatInput] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState('');
  const [deletingCatId, setDeletingCatId] = useState<string | null>(null);
  const catDropdownRef = useRef<HTMLDivElement>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [exportConfirm, setExportConfirm] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAssigning, setBulkAssigning] = useState(false);
  const router = useRouter();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (catDropdownRef.current && !catDropdownRef.current.contains(e.target as Node)) {
        setCatDropdownOpen(false);
        setShowCatInput(false);
        setCatNewName('');
        setEditingCatId(null);
        setEditingCatName('');
        setDeletingCatId(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function addCategory() {
    if (!catNewName.trim()) return;
    setCatAdding(true);
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: catNewName.trim() }),
    });
    if (res.ok) {
      const row = await res.json() as CategoryRow;
      setCategories(prev => [...prev, row]);
      setCategoryFilter(row.id);
      setPage(1);
    }
    setCatAdding(false);
    setShowCatInput(false);
    setCatNewName('');
    setCatDropdownOpen(false);
  }

  async function renameCategory(id: string) {
    if (!editingCatName.trim()) return;
    const res = await fetch(`/api/categories/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editingCatName.trim() }),
    });
    if (res.ok) {
      const row = await res.json() as CategoryRow;
      setCategories(prev => prev.map(c => c.id === id ? row : c));
    }
    setEditingCatId(null);
    setEditingCatName('');
  }

  async function deleteCategory(id: string) {
    const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
    if (res.ok || res.status === 204) {
      setCategories(prev => prev.filter(c => c.id !== id));
      if (categoryFilter === id) { setCategoryFilter(''); setPage(1); }
    }
    setDeletingCatId(null);
  }

  const PAGE_SIZE = 50;

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortKey(key); setSortDir('desc'); }
    setPage(1);
  }

  const filtered = sites
    .filter(s => {
      if (filter === 'active') return !!s.lastEvent && !isStale(s.lastEvent);
      if (filter === 'inactive') return !s.lastEvent || isStale(s.lastEvent);
      return true;
    })
    .filter(s => {
      if (injectionFilter === 'injected') return !!s.lastInjectedAt;
      if (injectionFilter === 'never') return !s.lastInjectedAt;
      return true;
    })
    .filter(s => !categoryFilter || s.categoryId === categoryFilter)
    .filter(s => !query.trim() || s.domain.toLowerCase().includes(query.toLowerCase().trim()))
    .sort((a, b) => {
      const val = sortKey === 'visitors'
        ? a.totalVisitors - b.totalVisitors
        : a.totalPageviews - b.totalPageviews;
      return sortDir === 'desc' ? -val : val;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleRow(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (paginated.every(s => selected.has(s.id))) {
      setSelected(prev => { const next = new Set(prev); paginated.forEach(s => next.delete(s.id)); return next; });
    } else {
      setSelected(prev => { const next = new Set(prev); paginated.forEach(s => next.add(s.id)); return next; });
    }
  }

  async function bulkAssign(categoryId: string | null) {
    setBulkAssigning(true);
    await fetch('/api/sites/bulk-assign-category', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteIds: Array.from(selected), categoryId }),
    });
    setBulkAssigning(false);
    setSelected(new Set());
    router.refresh();
  }

  async function confirmDelete(id: string) {
    setDeleting(id);
    setConfirmId(null);
    try {
      await fetch(`/api/sites/${id}`, { method: 'DELETE' });
      router.refresh();
      setDeleting(null);
    } catch {
      setDeleting(null);
    }
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <span className="text-[var(--c-border-strong)] ml-1">↕</span>;
    return <span className="text-emerald-400 ml-1">{sortDir === 'desc' ? '↓' : '↑'}</span>;
  }

  return (
    <div className="bg-[var(--c-card)] border border-[var(--c-border)] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[var(--c-border)] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div>
            <span className="font-semibold text-sm text-[var(--c-text)]">Sites</span>
            <span className="text-[var(--c-text-3)] font-mono text-xs ml-2">
              {filtered.length === sites.length ? `${sites.length} sites` : `${filtered.length} of ${sites.length} shown`}
            </span>
          </div>
          <button
            onClick={() => setExportConfirm(true)}
            className="flex items-center gap-1.5 text-xs font-mono font-semibold text-black bg-emerald-400 hover:bg-emerald-300 px-3 py-1.5 rounded-lg transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export CSV
          </button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status filter */}
          <div className="flex items-center bg-[var(--c-bg)] border border-[var(--c-border)] rounded-lg p-0.5">
            {(['all', 'active', 'inactive'] as FilterTab[]).map(f => (
              <button
                key={f}
                onClick={() => { setFilter(f); setPage(1); }}
                className={`px-3 py-1 rounded-md text-xs font-mono capitalize transition-colors ${
                  filter === f ? 'bg-[var(--c-subtle)] text-[var(--c-text)]' : 'text-[var(--c-text-3)] hover:text-[var(--c-text)]'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Injection filter */}
          <div className="flex items-center bg-[var(--c-bg)] border border-[var(--c-border)] rounded-lg p-0.5">
            {([
              { key: 'all', label: 'All' },
              { key: 'injected', label: 'Injected' },
              { key: 'never', label: 'Never injected' },
            ] as { key: InjectionFilter; label: string }[]).map(f => (
              <button
                key={f.key}
                onClick={() => { setInjectionFilter(f.key); setPage(1); }}
                className={`px-3 py-1 rounded-md text-xs font-mono transition-colors ${
                  injectionFilter === f.key ? 'bg-[var(--c-subtle)] text-[var(--c-text)]' : 'text-[var(--c-text-3)] hover:text-[var(--c-text)]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Category filter */}
          <div className="relative" ref={catDropdownRef}>
            <button
              onClick={() => { setCatDropdownOpen(o => !o); setShowCatInput(false); setCatNewName(''); }}
              className={`flex items-center gap-1.5 bg-[var(--c-bg)] border rounded-lg px-3 py-1.5 text-xs font-mono transition-colors ${
                categoryFilter ? 'border-emerald-500 text-emerald-400' : 'border-[var(--c-border)] text-[var(--c-text)]'
              }`}
            >
              {categoryFilter ? categories.find(c => c.id === categoryFilter)?.name ?? 'Category' : 'All categories'}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            {catDropdownOpen && (
              <div className="absolute top-full mt-1 right-0 z-20 bg-[var(--c-card)] border border-[var(--c-border)] rounded-xl shadow-xl min-w-[180px] overflow-hidden">
                <button
                  onClick={() => { setCategoryFilter(''); setPage(1); setCatDropdownOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-xs font-mono transition-colors hover:bg-[var(--c-hover)] ${!categoryFilter ? 'text-emerald-400' : 'text-[var(--c-text-2)]'}`}
                >All categories</button>
                {categories.map(c => (
                  <div key={c.id} className="group flex items-center hover:bg-[var(--c-hover)] transition-colors">
                    {editingCatId === c.id ? (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 w-full">
                        <input
                          value={editingCatName}
                          onChange={e => setEditingCatName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') renameCategory(c.id); if (e.key === 'Escape') { setEditingCatId(null); setEditingCatName(''); } }}
                          autoFocus
                          className="flex-1 bg-[var(--c-deep)] border border-[var(--c-border)] focus:border-emerald-500 rounded px-2 py-1 text-xs font-mono text-[var(--c-text)] focus:outline-none min-w-0"
                        />
                        <button onClick={() => renameCategory(c.id)} className="text-xs font-mono text-emerald-400 hover:text-emerald-300 flex-shrink-0">Save</button>
                        <button onClick={() => { setEditingCatId(null); setEditingCatName(''); }} className="text-xs font-mono text-[var(--c-text-3)] hover:text-[var(--c-text)] flex-shrink-0">✕</button>
                      </div>
                    ) : deletingCatId === c.id ? (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 w-full">
                        <span className="flex-1 text-xs font-mono text-red-400 truncate">Delete "{c.name}"?</span>
                        <button onClick={() => deleteCategory(c.id)} className="text-xs font-mono text-red-400 hover:text-red-300 flex-shrink-0">Yes</button>
                        <button onClick={() => setDeletingCatId(null)} className="text-xs font-mono text-[var(--c-text-3)] hover:text-[var(--c-text)] flex-shrink-0">No</button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => { setCategoryFilter(c.id); setPage(1); setCatDropdownOpen(false); }}
                          className={`flex-1 text-left px-4 py-2.5 text-xs font-mono ${categoryFilter === c.id ? 'text-emerald-400' : 'text-[var(--c-text-2)]'}`}
                        >{c.name}</button>
                        <div className="flex items-center gap-0.5 pr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={e => { e.stopPropagation(); setEditingCatId(c.id); setEditingCatName(c.name); setDeletingCatId(null); }}
                            className="p-1 text-[var(--c-text-3)] hover:text-[var(--c-text)] transition-colors rounded"
                            title="Rename"
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); setDeletingCatId(c.id); setEditingCatId(null); }}
                            className="p-1 text-[var(--c-text-3)] hover:text-red-400 transition-colors rounded"
                            title="Delete"
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
                <div className="border-t border-[var(--c-border)]">
                  {!showCatInput ? (
                    <button
                      onClick={() => setShowCatInput(true)}
                      className="w-full text-left px-4 py-2.5 text-xs font-mono text-sky-400 hover:bg-[var(--c-hover)] transition-colors flex items-center gap-1.5"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      Add category
                    </button>
                  ) : (
                    <div className="px-3 py-2 flex items-center gap-1.5">
                      <input
                        value={catNewName}
                        onChange={e => setCatNewName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') addCategory(); if (e.key === 'Escape') { setShowCatInput(false); setCatNewName(''); } }}
                        placeholder="Category name"
                        autoFocus
                        className="flex-1 bg-[var(--c-deep)] border border-[var(--c-border)] focus:border-emerald-500 rounded px-2 py-1 text-xs font-mono text-[var(--c-text)] placeholder-[var(--c-placeholder)] focus:outline-none min-w-0"
                      />
                      <button
                        onClick={addCategory}
                        disabled={catAdding || !catNewName.trim()}
                        className="text-xs font-mono text-emerald-400 hover:text-emerald-300 disabled:opacity-40 transition-colors flex-shrink-0"
                      >{catAdding ? '…' : 'Save'}</button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-text-3)]" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              value={query}
              onChange={e => { setQuery(e.target.value); setPage(1); }}
              placeholder="Search domains…"
              className="bg-[var(--c-bg)] border border-[var(--c-border)] focus:border-emerald-500 rounded-lg pl-8 pr-4 py-1.5 text-xs font-mono text-[var(--c-text)] placeholder-[var(--c-placeholder)] focus:outline-none transition-colors w-52"
            />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--c-text-3)] hover:text-[var(--c-text)]">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Export confirm modal */}
      {exportConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-[var(--c-card)] border border-[var(--c-border)] rounded-2xl w-full max-w-sm">
            <div className="flex items-start justify-between px-6 pt-6 pb-4">
              <div>
                <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest mb-1.5">Export</p>
                <h3 className="text-[var(--c-text)] font-semibold text-xl">Download report?</h3>
              </div>
              <button onClick={() => setExportConfirm(false)} className="text-[var(--c-text-2)] hover:text-[var(--c-text)] transition-colors mt-1 p-1">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="px-6 pb-6 space-y-5">
              <div className="bg-emerald-400/5 border border-emerald-400/20 rounded-xl px-4 py-3">
                <p className="text-xs font-mono text-[var(--c-text-2)]">
                  This will download a CSV of all{' '}
                  <span className="text-[var(--c-text)] font-semibold">{sites.length} sites</span>{' '}
                  including their status, pageviews, visitors, top country, and device.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { exportCSV(sites); setExportConfirm(false); }}
                  className="flex-1 bg-emerald-400 hover:bg-emerald-300 text-black font-semibold py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Download CSV
                </button>
                <button
                  onClick={() => setExportConfirm(false)}
                  className="flex-1 bg-[var(--c-subtle)] hover:bg-[var(--c-subtle-hover)] border border-[var(--c-border-strong)] text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete overlay */}
      {(confirmId || deleting) && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-[var(--c-card)] border border-[var(--c-border)] rounded-2xl w-full max-w-sm">
            {/* Header */}
            <div className="flex items-start justify-between px-6 pt-6 pb-4">
              <div>
                <p className="text-red-400 text-[10px] font-bold uppercase tracking-widest mb-1.5">Danger Zone</p>
                <h3 className="text-[var(--c-text)] font-semibold text-xl">{deleting ? 'Removing site…' : 'Delete site?'}</h3>
              </div>
              {!deleting && (
                <button onClick={() => setConfirmId(null)} className="text-[var(--c-text-2)] hover:text-[var(--c-text)] transition-colors mt-1 p-1">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              )}
            </div>

            <div className="px-6 pb-6 space-y-5">
              {deleting ? (
                /* Loading state */
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-xs font-mono text-[var(--c-text-2)]">
                    <svg className="animate-spin flex-shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                    </svg>
                    Removing site and all associated data…
                  </div>
                  <div className="w-full bg-[var(--c-deep)] border border-[var(--c-border)] rounded-full h-1.5 overflow-hidden">
                    <div className="bg-red-400 h-full rounded-full animate-pulse w-3/4" />
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-red-400/5 border border-red-400/20 rounded-xl px-4 py-3">
                    <p className="text-xs font-mono text-[var(--c-text-2)]">
                      This will permanently remove{' '}
                      <span className="text-[var(--c-text)] font-semibold">{sites.find(s => s.id === confirmId)?.domain}</span>{' '}
                      and all its tracked events and stats.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => confirmDelete(confirmId!)}
                      className="flex-1 bg-red-500 hover:bg-red-400 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                        <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                      </svg>
                      Yes, delete
                    </button>
                    <button
                      onClick={() => setConfirmId(null)}
                      className="flex-1 bg-[var(--c-subtle)] hover:bg-[var(--c-subtle-hover)] border border-[var(--c-border-strong)] text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center text-[var(--c-text-3)] font-mono text-sm">
          {query ? `No domains matching "${query}"` : 'No sites yet.'}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--c-border)]">
                <th className="pl-4 pr-2 py-3 w-8">
                  <input
                    type="checkbox"
                    checked={paginated.length > 0 && paginated.every(s => selected.has(s.id))}
                    onChange={toggleAll}
                    className="accent-emerald-400 cursor-pointer"
                  />
                </th>
                <th className="px-5 py-3 text-left text-xs font-mono text-[var(--c-text-3)] uppercase tracking-widest">Site domain</th>
                <th className="px-5 py-3 text-right text-xs font-mono text-[var(--c-text-3)] uppercase tracking-widest cursor-pointer hover:text-[var(--c-text)] transition-colors select-none" onClick={() => toggleSort('visitors')}>
                  Visitors <SortIcon k="visitors" />
                </th>
                <th className="px-5 py-3 text-right text-xs font-mono text-[var(--c-text-3)] uppercase tracking-widest cursor-pointer hover:text-[var(--c-text)] transition-colors select-none" onClick={() => toggleSort('pageviews')}>
                  Pageviews <SortIcon k="pageviews" />
                </th>
                <th className="px-5 py-3 text-left text-xs font-mono text-[var(--c-text-3)] uppercase tracking-widest">Top page</th>
                <th className="px-5 py-3 text-left text-xs font-mono text-[var(--c-text-3)] uppercase tracking-widest">Top country</th>
                <th className="px-5 py-3 text-left text-xs font-mono text-[var(--c-text-3)] uppercase tracking-widest">Device</th>
                <th className="px-5 py-3 text-left text-xs font-mono text-[var(--c-text-3)] uppercase tracking-widest">Status</th>
                <th className="px-2 py-3 sticky right-0 bg-[var(--c-card)]" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--c-divider)]">
              {paginated.map(s => (
                <tr
                  key={s.id}
                  onClick={() => router.push(`/sites/${s.id}`)}
                  className={`hover:bg-[var(--c-hover)] cursor-pointer transition-colors group select-none ${selected.has(s.id) ? 'bg-emerald-400/5' : ''}`}
                >
                  <td className="pl-4 pr-2 py-3.5" onClick={e => { e.stopPropagation(); toggleRow(s.id); }}>
                    <input
                      type="checkbox"
                      checked={selected.has(s.id)}
                      onChange={() => toggleRow(s.id)}
                      className="accent-emerald-400 cursor-pointer"
                    />
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.totalPageviews > 0 ? '#34d399' : 'var(--c-border)', boxShadow: s.totalPageviews > 0 ? '0 0 6px #34d399' : 'none' }} />
                      <span className="text-emerald-400 font-mono text-sm group-hover:underline underline-offset-2" title={s.domain}>{s.domain}</span>
                      <InjectionIndicator lastInjectedAt={s.lastInjectedAt ?? null} />
                      {s.categoryId && (() => {
                        const cat = categories.find(c => c.id === s.categoryId);
                        return cat ? (
                          <span className="text-[10px] font-mono text-sky-400 border border-sky-400/30 bg-sky-400/10 px-1.5 py-0.5 rounded">{cat.name}</span>
                        ) : null;
                      })()}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono tabular-nums text-[var(--c-text)] text-sm font-semibold tracking-tight">{s.totalVisitors.toLocaleString()}</td>
                  <td className="px-5 py-3.5 text-right font-mono tabular-nums text-[var(--c-text)] text-sm font-semibold tracking-tight">{s.totalPageviews.toLocaleString()}</td>
                  <td className="px-5 py-3.5 font-mono text-[var(--c-text-2)] text-xs max-w-[180px]">
                    {s.topPage
                      ? <span className="block truncate" title={`/${s.topPage.replace(/^\//, '')}`}>{`/${s.topPage.replace(/^\//, '')}`}</span>
                      : <span className="text-[var(--c-text-3)]">—</span>}
                  </td>
                  <td className="px-5 py-3.5"><CountryBadge country={s.topCountry} /></td>
                  <td className="px-5 py-3.5"><DeviceIcon device={s.topDevice} /></td>
                  <td className="px-5 py-3.5">
                    <StatusBadge lastEvent={s.lastEvent} />
                  </td>
                  <td className="px-3 py-3.5 sticky right-0 bg-[var(--c-card)] group-hover:bg-[var(--c-hover)] transition-colors" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={e => { e.stopPropagation(); setConfirmId(s.id); }}
                      className="text-[var(--c-text-3)] hover:text-red-400 transition-all duration-100 p-4 rounded-lg hover:bg-red-400/10 cursor-pointer"
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

      {/* Bulk assign bar */}
      {selected.size > 0 && (
        <div className="px-5 py-3 border-t border-emerald-400/20 bg-emerald-400/5 flex items-center justify-between gap-3">
          <span className="text-xs font-mono text-emerald-400">{selected.size} selected</span>
          <div className="flex items-center gap-2">
            <select
              disabled={bulkAssigning}
              defaultValue=""
              onChange={e => { if (e.target.value !== '') bulkAssign(e.target.value === '__none__' ? null : e.target.value); e.target.value = ''; }}
              className="bg-[var(--c-deep)] border border-[var(--c-border)] focus:border-emerald-500 rounded-lg px-3 py-1.5 text-xs font-mono text-[var(--c-text)] focus:outline-none transition-colors disabled:opacity-50"
            >
              <option value="" disabled>{bulkAssigning ? 'Assigning…' : 'Assign category…'}</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
              <option value="__none__">Remove category</option>
            </select>
            <button
              onClick={() => setSelected(new Set())}
              className="text-xs font-mono text-[var(--c-text-3)] hover:text-[var(--c-text)] transition-colors px-2 py-1.5"
            >Clear</button>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-5 py-3 border-t border-[var(--c-border)] flex items-center justify-between">
          <span className="text-xs font-mono text-[var(--c-text-3)]">
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            {/* Prev */}
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--c-text-3)] hover:text-[var(--c-text)] hover:bg-[var(--c-subtle)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>

            {/* Page pills */}
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
                  <span key={`ellipsis-${i}`} className="w-7 h-7 flex items-center justify-center text-xs font-mono text-[var(--c-text-3)]">…</span>
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

            {/* Next */}
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
  );
}
