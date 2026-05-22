'use client';

import { useState } from 'react';

interface RotationStatus {
  lastRotatedAt: string | null;
  daysSince: number | null;
}

export function GetScriptButton({ siteId }: { siteId: string }) {
  const [open, setOpen] = useState(false);
  const [script, setScript] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [rotation, setRotation] = useState<RotationStatus | null>(null);

  async function handleOpen() {
    setOpen(true);
    if (script) return;
    setLoading(true);
    try {
      const [scriptRes, rotationRes] = await Promise.all([
        fetch(`/api/sites/${siteId}/script`),
        fetch('/api/rotation-status'),
      ]);
      const text = await scriptRes.text();
      setScript(text);
      if (rotationRes.ok) setRotation(await rotationRes.json());
    } finally {
      setLoading(false);
    }
  }

  function RotationBadge() {
    if (!rotation) return null;
    const { lastRotatedAt, daysSince } = rotation;
    if (!lastRotatedAt || daysSince === null) {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-full bg-[var(--c-subtle)] text-[var(--c-text-3)] border border-[var(--c-border)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--c-text-3)]" />
          Never rotated
        </span>
      );
    }
    if (daysSince >= 180) {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-full bg-red-400/10 text-red-400 border border-red-400/20">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
          Overdue · {daysSince}d ago
        </span>
      );
    }
    if (daysSince >= 150) {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-full bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
          Due soon · {daysSince}d ago
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-full bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        Fresh · {daysSince}d ago
      </span>
    );
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(`<script>\n${script}\n</script>`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="flex items-center gap-2 bg-emerald-400 hover:bg-emerald-300 text-black text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
        </svg>
        Get script
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-[var(--c-card)] border border-[var(--c-border)] rounded-2xl w-full max-w-2xl flex flex-col max-h-[80vh]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-[var(--c-border)] flex items-center justify-between flex-shrink-0">
              <div>
                <div className="flex items-center gap-2.5 mb-1">
                  <h3 className="text-[var(--c-text)] font-semibold text-sm">Tracker script</h3>
                  <RotationBadge />
                </div>
                <p className="text-xs font-mono text-[var(--c-text-2)]">Copy and paste into <span className="text-[var(--c-text)]">snippets/deep2k-tracker.liquid</span></p>
              </div>
              <button onClick={() => setOpen(false)} className="text-[var(--c-text-2)] hover:text-[var(--c-text)] transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Script box */}
            <div className="px-6 py-4 flex-1 overflow-auto">
              {loading ? (
                <div className="h-32 flex items-center justify-center text-[var(--c-text-2)] text-sm font-mono">Loading script…</div>
              ) : (
                <pre className="bg-[var(--c-deep)] border border-[var(--c-border)] rounded-xl p-4 text-xs font-mono text-emerald-400 overflow-auto whitespace-pre-wrap break-all leading-relaxed">
                  {script}
                </pre>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[var(--c-border)] flex items-center justify-between flex-shrink-0">
              <p className="text-xs font-mono text-[var(--c-text-3)]">Replaces the content of <span className="text-[var(--c-text)]">snippets/deep2k-tracker.liquid</span></p>
              <button
                onClick={handleCopy}
                disabled={loading}
                className="flex items-center gap-2 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-40 text-black text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                {copied ? (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                    Copy script
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
