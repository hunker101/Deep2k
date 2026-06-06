'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface CategoryRow {
  id: string;
  name: string;
}

interface CreatedSite {
  id: string;
  domain: string;
  scriptPath: string;
  endpointPath: string;
  beaconMethod: string;
  firstPartySubdomain: string | null;
  script: string;
}

function isValidDomain(d: string): boolean {
  return /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/.test(d);
}

export function AddSiteModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [domain, setDomain] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<CreatedSite | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/categories')
      .then(r => r.ok ? r.json() : [])
      .then((rows: CategoryRow[]) => setCategories(rows))
      .catch(() => {});
  }, []);

  async function createAndSelectCategory(name: string) {
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const row = await res.json() as CategoryRow;
      setCategories(prev => [...prev, row]);
      setCategoryId(row.id);
    }
    setShowNewCategory(false);
    setNewCategoryName('');
  }

  const cleanDomain = domain.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
  const domainTouched = cleanDomain.length > 0;
  const domainInvalid = domainTouched && !isValidDomain(cleanDomain);

  async function handleDeploy(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidDomain(cleanDomain)) return;
    setError('');
    setLoading(true);
    setProgress(10);
    const interval = setInterval(() => {
      setProgress(p => p < 82 ? p + Math.random() * 12 : p);
    }, 280);
    try {
      const res = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: cleanDomain, categoryId: categoryId || null }),
      });
      clearInterval(interval);
      const data = await res.json() as CreatedSite & { error?: string };
      if (!res.ok) { setError(data.error ?? 'Failed to create site'); setLoading(false); return; }
      setProgress(100);
      setTimeout(() => { setCreated(data); setLoading(false); onCreated(); }, 350);
    } catch {
      clearInterval(interval);
      setError('Connection error');
      setLoading(false);
    }
  }

  function copy(text: string, field: string) {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }

  function reset() { setDomain(''); setCategoryId(''); setCreated(null); setError(''); setProgress(0); }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-[var(--c-card)] border border-[var(--c-border)] rounded-2xl w-full max-w-md">
        <div className="flex items-start justify-between px-6 pt-6 pb-4">
          <div>
            <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest mb-1.5">New Deployment</p>
            <h2 className="text-[var(--c-text)] font-semibold text-xl">{created ? 'Site connected' : 'Add Shopify site'}</h2>
          </div>
          <button onClick={onClose} className="text-[var(--c-text-2)] hover:text-[var(--c-text)] transition-colors mt-1 p-1">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="px-6 pb-6 space-y-5">
          {created && (
            <>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-emerald-400/15 border border-emerald-400/30 flex items-center justify-center flex-shrink-0">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <div>
                  <p className="text-[var(--c-text)] font-semibold text-sm">{created.domain} is now being tracked.</p>
                  <p className="text-[var(--c-text-2)] text-xs font-mono mt-1 leading-relaxed">
                    Inject the script below into your Shopify theme. First events arrive after the next page load.
                  </p>
                </div>
              </div>

              <div className="bg-[var(--c-deep)] border border-[var(--c-border)] rounded-xl divide-y divide-[var(--c-border)]">
                {created.firstPartySubdomain && <InfoRow label="First-party subdomain" value={created.firstPartySubdomain} field="subdomain" copiedField={copiedField} onCopy={() => copy(created.firstPartySubdomain!, 'subdomain')} />}
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-xs font-mono text-[var(--c-text-2)]">Tracker script</span>
                  <button
                    onClick={() => copy(`<script>\n${created.script}\n</script>`, 'tracker')}
                    className="flex items-center gap-1.5 text-xs font-mono bg-emerald-400/10 hover:bg-emerald-400/20 border border-emerald-400/20 text-emerald-400 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    {copiedField === 'tracker'
                      ? <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg> Copied!</>
                      : <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy script</>
                    }
                  </button>
                </div>
              </div>

              {created.firstPartySubdomain && (
                <div className="bg-[var(--c-deep)] border border-[var(--c-border)] rounded-xl p-4 space-y-1.5 text-xs font-mono text-[var(--c-text-2)]">
                  <p className="text-[var(--c-text)] font-semibold text-xs mb-2.5">Cloudflare setup</p>
                  <p>a.  DNS → Add CNAME: <span className="text-emerald-400">{created.firstPartySubdomain.split('.')[0]}</span> → <span className="text-emerald-400">deep2k-worker.vantatech.workers.dev</span> (Proxied)</p>
                  <p>b.  Workers Routes → Add route: <span className="text-emerald-400">{created.firstPartySubdomain}/*</span> → <span className="text-emerald-400">deep2k-proxy</span></p>
                </div>
              )}

              <div className="bg-[var(--c-deep)] border border-[var(--c-border)] rounded-xl p-4 space-y-1.5 text-xs font-mono text-[var(--c-text-2)]">
                <p className="text-[var(--c-text)] font-semibold text-xs mb-2.5">Inject into Shopify theme</p>
                <p>a.  Shopify admin → Online Store → Themes → Edit code</p>
                <p>b.  Snippets → Add new file → <span className="text-emerald-400">deep2k-tracker.liquid</span></p>
                <p>c.  Paste the copied script → Save</p>
                <p>d.  In <span className="text-emerald-400">layout/theme.liquid</span>, just before <span className="text-emerald-400">&lt;/body&gt;</span>:</p>
                <div className="bg-[var(--c-card)] border border-[var(--c-border)] rounded-lg px-3 py-2 mt-1">
                  <code className="text-emerald-400">{`{% render 'deep2k-tracker' %}`}</code>
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={reset} className="flex-1 bg-[var(--c-subtle)] hover:bg-[var(--c-subtle-hover)] border border-[var(--c-border-strong)] text-[var(--c-text)] font-semibold py-2.5 rounded-lg text-sm transition-colors">
                  Add another
                </button>
                <button onClick={() => { router.push(`/sites/${created.id}`); onClose(); }} className="flex-1 bg-emerald-400 hover:bg-emerald-300 text-black font-semibold py-2.5 rounded-lg text-sm transition-colors">
                  View site →
                </button>
              </div>
            </>
          )}

          {!created && (
            <form onSubmit={handleDeploy} className="space-y-5">
              <div>
                <label className="block text-xs font-mono text-[var(--c-text-2)] mb-2">Shopify store domain</label>
                <div className={`flex items-center bg-[var(--c-deep)] border rounded-lg overflow-hidden transition-colors ${
                  domainInvalid ? 'border-yellow-400/50' : 'border-[var(--c-border)] focus-within:border-emerald-500'
                }`}>
                  <span className="px-3 py-3 text-[var(--c-text-3)] font-mono text-sm border-r border-[var(--c-border)] bg-[var(--c-bg)] select-none flex-shrink-0">
                    https://
                  </span>
                  <input
                    value={domain}
                    onChange={e => setDomain(e.target.value)}
                    placeholder="mystore.com"
                    disabled={loading}
                    className="flex-1 bg-transparent px-3 py-3 text-[var(--c-text)] font-mono text-sm placeholder-[var(--c-placeholder)] focus:outline-none min-w-0"
                    autoFocus
                  />
                </div>
                {domainInvalid
                  ? <p className="text-yellow-400 text-xs font-mono mt-1.5">Doesn't look like a valid domain.</p>
                  : <p className="text-[var(--c-text-3)] text-xs font-mono mt-1.5">Use the primary apex domain, not myshopify.com</p>
                }
              </div>

              <div>
                <label className="block text-xs font-mono text-[var(--c-text-2)] mb-2">Category <span className="text-[var(--c-text-3)]">(optional)</span></label>
                {!showNewCategory ? (
                  <select
                    value={categoryId}
                    onChange={e => {
                      if (e.target.value === '__new__') { setShowNewCategory(true); }
                      else setCategoryId(e.target.value);
                    }}
                    disabled={loading}
                    className="w-full bg-[var(--c-deep)] border border-[var(--c-border)] focus:border-emerald-500 rounded-lg px-3 py-3 text-xs font-mono text-[var(--c-text)] focus:outline-none transition-colors"
                  >
                    <option value="">No category</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                    <option value="__new__">+ Add new category...</option>
                  </select>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      value={newCategoryName}
                      onChange={e => setNewCategoryName(e.target.value)}
                      placeholder="Category name"
                      autoFocus
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (newCategoryName.trim()) createAndSelectCategory(newCategoryName.trim()); } }}
                      className="flex-1 bg-[var(--c-deep)] border border-[var(--c-border)] focus:border-emerald-500 rounded-lg px-3 py-2.5 text-xs font-mono text-[var(--c-text)] placeholder-[var(--c-placeholder)] focus:outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => { if (newCategoryName.trim()) createAndSelectCategory(newCategoryName.trim()); }}
                      className="bg-emerald-400 hover:bg-emerald-300 text-black text-xs font-mono font-semibold px-3 py-2.5 rounded-lg transition-colors"
                    >Save</button>
                    <button
                      type="button"
                      onClick={() => { setShowNewCategory(false); setNewCategoryName(''); }}
                      className="text-[var(--c-text-3)] hover:text-[var(--c-text)] text-xs font-mono px-2 py-2.5 transition-colors"
                    >Cancel</button>
                  </div>
                )}
              </div>

              {error && (
                <div className="flex items-start gap-2.5 bg-red-400/8 border border-red-400/25 rounded-xl px-4 py-3">
                  <svg className="flex-shrink-0 mt-0.5" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <p className="text-red-400 text-xs font-mono leading-relaxed">{error}</p>
                </div>
              )}

              {loading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-[var(--c-text-2)]">
                    <span>Provisioning Cloudflare Worker route…</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full bg-[var(--c-bg)] border border-[var(--c-border)] rounded-full h-1.5 overflow-hidden">
                    <div className="bg-emerald-400 h-full rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={loading || !cleanDomain || domainInvalid}
                  className="flex-1 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <><svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Deploying…</>
                  ) : 'Generate & deploy →'}
                </button>
                <button type="button" onClick={onClose} disabled={loading} className="text-[var(--c-text-2)] hover:text-[var(--c-text)] text-sm font-mono transition-colors disabled:opacity-40">
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, field, copiedField, onCopy }: {
  label: string; value: string | null; field: string; copiedField: string | null; onCopy: () => void;
}) {
  const copied = copiedField === field;
  return (
    <div className="flex items-center justify-between px-4 py-3 gap-4">
      <span className="text-xs font-mono text-[var(--c-text-2)] flex-shrink-0">{label}</span>
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xs font-mono text-[var(--c-text)] truncate">{value}</span>
        <button onClick={onCopy} className="text-[var(--c-text-3)] hover:text-emerald-400 transition-colors flex-shrink-0">
          {copied
            ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
            : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          }
        </button>
      </div>
    </div>
  );
}
