'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface CreatedSite {
  id: string;
  domain: string;
  scriptPath: string;
  endpointPath: string;
  beaconMethod: string;
  script: string;
}

function isValidDomain(d: string): boolean {
  return /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/.test(d);
}

export function AddSiteModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<CreatedSite | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const router = useRouter();

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
        body: JSON.stringify({ domain: cleanDomain }),
      });
      clearInterval(interval);
      const data = await res.json() as CreatedSite & { error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Failed to create site');
        setLoading(false);
        return;
      }
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

  function reset() {
    setDomain('');
    setCreated(null);
    setError('');
    setProgress(0);
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-[#0d1a14] border border-[#1a2e22] rounded-2xl w-full max-w-md">

        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4">
          <div>
            <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest mb-1.5">New Deployment</p>
            <h2 className="text-white font-semibold text-xl">{created ? 'Site connected' : 'Add Shopify site'}</h2>
          </div>
          <button onClick={onClose} className="text-[#6b8f7a] hover:text-white transition-colors mt-1 p-1">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="px-6 pb-6 space-y-5">

          {/* ── Success ── */}
          {created && (
            <>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-emerald-400/15 border border-emerald-400/30 flex items-center justify-center flex-shrink-0">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{created.domain} is now being tracked.</p>
                  <p className="text-[#6b8f7a] text-xs font-mono mt-1 leading-relaxed">
                    Inject the script below into your Shopify theme. First events arrive after the next page load.
                  </p>
                </div>
              </div>

              {/* Path rows */}
              <div className="bg-[#080f0c] border border-[#1a2e22] rounded-xl divide-y divide-[#1a2e22]">
                <InfoRow label="Script path"   value={created.scriptPath}   field="script"   copiedField={copiedField} onCopy={() => copy(created.scriptPath, 'script')} />
                <InfoRow label="Endpoint path" value={created.endpointPath} field="endpoint" copiedField={copiedField} onCopy={() => copy(created.endpointPath, 'endpoint')} />
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-xs font-mono text-[#6b8f7a]">Tracker script</span>
                  <button
                    onClick={() => copy(`<script>\n${created.script}\n</script>`, 'tracker')}
                    className="flex items-center gap-1.5 text-xs font-mono bg-emerald-400/10 hover:bg-emerald-400/20 border border-emerald-400/20 text-emerald-400 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    {copiedField === 'tracker' ? (
                      <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg> Copied!</>
                    ) : (
                      <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy script</>
                    )}
                  </button>
                </div>
              </div>

              {/* Injection steps */}
              <div className="bg-[#080f0c] border border-[#1a2e22] rounded-xl p-4 space-y-1.5 text-xs font-mono text-[#6b8f7a]">
                <p className="text-white font-semibold text-xs mb-2.5">Inject into Shopify theme</p>
                <p>a.  Shopify admin → Online Store → Themes → Edit code</p>
                <p>b.  Snippets → Add new file → <span className="text-emerald-400">deep2k-tracker.liquid</span></p>
                <p>c.  Paste the copied script → Save</p>
                <p>d.  In <span className="text-emerald-400">layout/theme.liquid</span>, just before <span className="text-emerald-400">&lt;/body&gt;</span>:</p>
                <div className="bg-[#0d1a14] border border-[#1a2e22] rounded-lg px-3 py-2 mt-1">
                  <code className="text-emerald-400">{`{% render 'deep2k-tracker' %}`}</code>
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={reset}
                  className="flex-1 bg-[#1a2e22] hover:bg-[#213d2a] border border-[#2a4a32] text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
                >
                  Add another
                </button>
                <button
                  onClick={() => { router.push(`/sites/${created.id}`); onClose(); }}
                  className="flex-1 bg-emerald-400 hover:bg-emerald-300 text-black font-semibold py-2.5 rounded-lg text-sm transition-colors"
                >
                  View site →
                </button>
              </div>
            </>
          )}

          {/* ── Form / deploying ── */}
          {!created && (
            <form onSubmit={handleDeploy} className="space-y-5">
              <div>
                <label className="block text-xs font-mono text-[#6b8f7a] mb-2">Shopify store domain</label>
                <div className={`flex items-center bg-[#080f0c] border rounded-lg overflow-hidden transition-colors ${
                  domainInvalid ? 'border-yellow-400/50' : 'border-[#1a2e22] focus-within:border-emerald-500'
                }`}>
                  <span className="px-3 py-3 text-[#4a7060] font-mono text-sm border-r border-[#1a2e22] bg-[#060c09] select-none flex-shrink-0">
                    https://
                  </span>
                  <input
                    value={domain}
                    onChange={e => setDomain(e.target.value)}
                    placeholder="mystore.com"
                    disabled={loading}
                    className="flex-1 bg-transparent px-3 py-3 text-white font-mono text-sm placeholder-[#3a5244] focus:outline-none min-w-0"
                    autoFocus
                  />
                </div>
                {domainInvalid
                  ? <p className="text-yellow-400 text-xs font-mono mt-1.5">Doesn't look like a valid domain.</p>
                  : <p className="text-[#4a7060] text-xs font-mono mt-1.5">Use the primary apex domain, not myshopify.com</p>
                }
              </div>

              {error && <p className="text-red-400 text-xs font-mono">{error}</p>}

              {loading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-[#6b8f7a]">
                    <span>Provisioning Cloudflare Worker route…</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full bg-[#060c09] border border-[#1a2e22] rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-emerald-400 h-full rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
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
                    <>
                      <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                      </svg>
                      Deploying…
                    </>
                  ) : 'Generate & deploy →'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="text-[#6b8f7a] hover:text-white text-sm font-mono transition-colors disabled:opacity-40"
                >
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
  label: string; value: string; field: string; copiedField: string | null; onCopy: () => void;
}) {
  const copied = copiedField === field;
  return (
    <div className="flex items-center justify-between px-4 py-3 gap-4">
      <span className="text-xs font-mono text-[#6b8f7a] flex-shrink-0">{label}</span>
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xs font-mono text-white truncate">{value}</span>
        <button onClick={onCopy} className="text-[#4a7060] hover:text-emerald-400 transition-colors flex-shrink-0">
          {copied ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
