'use client';

import { useState } from 'react';

export function EnableFirstPartyButton({
  siteId,
  initialSubdomain,
}: {
  siteId: string;
  initialSubdomain: string | null;
}) {
  const [subdomain, setSubdomain] = useState<string | null>(initialSubdomain);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleEnable() {
    setLoading(true);
    try {
      const res = await fetch(`/api/sites/${siteId}/enable-first-party`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json() as { firstPartySubdomain: string };
        setSubdomain(data.firstPartySubdomain);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!subdomain) {
    return (
      <button
        onClick={handleEnable}
        disabled={loading}
        className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-lg border border-[var(--c-border)] hover:border-emerald-400/40 hover:text-emerald-400 text-[var(--c-text-2)] disabled:opacity-40 transition-colors"
      >
        {loading ? (
          <>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-spin">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
            Enabling…
          </>
        ) : (
          <>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
            </svg>
            Enable first-party
          </>
        )}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-mono px-2 py-0.5 rounded-full bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 flex-shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          Active
        </span>
        <span className="text-xs font-mono text-[var(--c-text)] truncate">{subdomain}</span>
        <button
          onClick={() => handleCopy(subdomain)}
          className="flex-shrink-0 text-[var(--c-text-3)] hover:text-emerald-400 transition-colors"
          title="Copy subdomain"
        >
          {copied ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
          )}
        </button>
      </div>
      <p className="text-[10px] font-mono text-[var(--c-text-3)] leading-relaxed">
        Add a CNAME record: <span className="text-[var(--c-text-2)]">{subdomain}</span> → <span className="text-[var(--c-text-2)]">deep2k-worker.vantatech.workers.dev</span>
      </p>
    </div>
  );
}
