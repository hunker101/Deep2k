'use client';

import { useState } from 'react';

interface CreatedSite {
  id: string;
  domain: string;
  scriptPath: string;
  endpointPath: string;
  beaconMethod: string;
  script: string;
}

export function AddSiteModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [domain, setDomain] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<CreatedSite | null>(null);
  const [copied, setCopied] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setConfirming(true);
  }

  async function handleConfirm() {
    setError('');
    setLoading(true);
    setConfirming(false);
    try {
      const res = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: domain.trim().replace(/^https?:\/\//, '') }),
      });
      const data = await res.json() as CreatedSite & { error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Failed to create site');
        return;
      }
      setCreated(data);
      onCreated();
    } catch {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  }

  function copyScript() {
    if (!created) return;
    navigator.clipboard.writeText(`<script>\n${created.script}\n</script>`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-[#0d1a14] border border-[#1a2e22] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#1a2e22]">
          <div>
            <h2 className="text-white font-semibold text-lg">Add new site</h2>
            <p className="text-xs text-[#6b8f7a] font-mono mt-0.5">Create a tracker for a new Shopify store</p>
          </div>
          <button onClick={onClose} className="text-[#6b8f7a] hover:text-white transition-colors p-1">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="px-6 py-5">
          {!created && !confirming && (
            /* Step 1 — Enter domain */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-[#6b8f7a] mb-2">Store domain</label>
                <input
                  value={domain}
                  onChange={e => setDomain(e.target.value)}
                  placeholder="mystore.com"
                  className="w-full bg-[#080f0c] border border-[#1a2e22] focus:border-emerald-500 rounded-lg px-4 py-3 text-white font-mono text-sm placeholder-[#3a5244] focus:outline-none transition-colors"
                  required
                  autoFocus
                />
                <p className="text-xs text-[#4a7060] font-mono mt-1.5">Use the public domain, not myshopify.com</p>
              </div>

              {error && <p className="text-red-400 text-xs font-mono">{error}</p>}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loading || !domain.trim()}
                  className="bg-emerald-400 hover:bg-emerald-300 disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors"
                >
                  {loading ? 'Creating…' : 'Create site'}
                </button>
                <button type="button" onClick={onClose} className="text-[#6b8f7a] hover:text-white text-sm font-mono transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Confirmation step */}
          {confirming && !created && (
            <div className="space-y-5">
              <div className="bg-[#080f0c] border border-[#1a2e22] rounded-xl p-5">
                <p className="text-xs font-mono text-[#6b8f7a] mb-1">You are about to create a tracker for:</p>
                <p className="text-emerald-400 font-mono text-lg font-semibold">{domain.trim().replace(/^https?:\/\//, '')}</p>
              </div>

              <div className="bg-yellow-400/5 border border-yellow-400/20 rounded-xl px-4 py-3">
                <p className="text-yellow-400 text-xs font-mono">
                  Make sure this is the correct public domain. A unique obfuscated tracker script will be generated and pushed to Cloudflare KV.
                </p>
              </div>

              {error && <p className="text-red-400 text-xs font-mono">{error}</p>}

              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={handleConfirm}
                  disabled={loading}
                  className="bg-emerald-400 hover:bg-emerald-300 disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors"
                >
                  {loading ? 'Creating…' : 'Yes, create site'}
                </button>
                <button
                  onClick={() => setConfirming(false)}
                  className="text-[#6b8f7a] hover:text-white text-sm font-mono transition-colors"
                >
                  Go back
                </button>
              </div>
            </div>
          )}

          {/* Result — Show script + instructions */}
          {created && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 bg-emerald-400/10 border border-emerald-400/20 rounded-lg px-4 py-3">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-emerald-400 text-sm font-mono">Site created — <strong>{created.domain}</strong></span>
              </div>

              <div>
                <h3 className="text-white text-sm font-semibold mb-2 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-400/20 text-emerald-400 text-xs flex items-center justify-center font-bold">1</span>
                  Copy the tracker script
                </h3>
                <div className="bg-[#080f0c] border border-[#1a2e22] rounded-lg p-4 relative">
                  <pre className="text-xs text-[#6b8f7a] font-mono overflow-x-auto max-h-32 overflow-y-auto">
                    {`<script>\n${created.script.slice(0, 200)}…\n</script>`}
                  </pre>
                  <button
                    onClick={copyScript}
                    className="absolute top-3 right-3 bg-[#1a2e22] hover:bg-[#213d2a] border border-[#2a4a32] text-emerald-400 text-xs font-mono px-3 py-1.5 rounded-lg transition-colors"
                  >
                    {copied ? '✓ Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-white text-sm font-semibold mb-3 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-400/20 text-emerald-400 text-xs flex items-center justify-center font-bold">2</span>
                  Inject into Shopify theme
                </h3>
                <div className="space-y-2 text-xs font-mono text-[#6b8f7a]">
                  <Step n="a" text='Shopify admin → Online Store → Themes → Edit code' />
                  <Step n="b" text='Snippets folder → Add new file → name it "deep2k-tracker.liquid"' />
                  <Step n="c" text="Paste the copied script into the new file → Save" />
                  <Step n="d" text='Open layout/theme.liquid → find </body> → add this line just before it:' />
                  <div className="bg-[#080f0c] border border-[#1a2e22] rounded-lg px-4 py-2.5 mt-1">
                    <code className="text-emerald-400">{`{% render 'deep2k-tracker' %}`}</code>
                  </div>
                </div>
              </div>

              <div className="bg-[#0a1a10] border border-[#1a2e22] rounded-lg px-4 py-3">
                <h3 className="text-white text-sm font-semibold mb-1 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-400/20 text-emerald-400 text-xs flex items-center justify-center font-bold">3</span>
                  Visit the store + check dashboard
                </h3>
                <p className="text-xs font-mono text-[#6b8f7a]">
                  After injecting, visit the store in your browser. Events appear after the next aggregation (runs hourly, or trigger manually).
                </p>
              </div>

              <button
                onClick={onClose}
                className="w-full bg-[#1a2e22] hover:bg-[#213d2a] border border-[#2a4a32] text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Step({ n, text }: { n: string; text: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-emerald-400 flex-shrink-0">{n}.</span>
      <span>{text}</span>
    </div>
  );
}
