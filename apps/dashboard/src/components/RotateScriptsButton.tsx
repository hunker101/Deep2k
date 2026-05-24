'use client';

import { useState } from 'react';

type State = 'idle' | 'loading' | 'done' | 'error';

export function RotateScriptsButton() {
  const [state, setState] = useState<State>('idle');
  const [open, setOpen] = useState(false);

  async function handleConfirm() {
    setState('loading');
    try {
      const res = await fetch('/api/admin/rotate-scripts', { method: 'POST' });
      if (res.ok) {
        setState('done');
        setTimeout(() => {
          setState('idle');
          setOpen(false);
        }, 3000);
      } else {
        setState('error');
      }
    } catch {
      setState('error');
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-lg border border-[var(--c-border)] text-[var(--c-text-2)] hover:text-amber-400 hover:border-amber-400/30 hover:bg-amber-400/5 transition-colors"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <polyline points="23 4 23 10 17 10"/>
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
        </svg>
        Rotate scripts
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-[var(--c-card)] border border-[var(--c-border)] rounded-2xl w-full max-w-md">
            {/* Header */}
            <div className="px-6 py-4 border-b border-[var(--c-border)] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round">
                    <polyline points="23 4 23 10 17 10"/>
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                  </svg>
                </span>
                <h3 className="text-sm font-semibold text-[var(--c-text)]">Rotate tracker scripts</h3>
              </div>
              <button onClick={() => { setOpen(false); setState('idle'); }} className="text-[var(--c-text-2)] hover:text-[var(--c-text)] transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-[var(--c-text-2)] font-mono leading-relaxed">
                This will randomize the obfuscation for all <span className="text-[var(--c-text)]">tracker scripts</span> — variable names, beacon method, and timing will all change.
              </p>
              <div className="bg-[var(--c-subtle)] border border-[var(--c-border)] rounded-xl p-4 space-y-2.5">
                <InfoRow icon="⚠" color="text-amber-400" text="Tracking continues uninterrupted — nothing breaks" />
                <InfoRow icon="→" color="text-sky-400" text="New script won't go live until you re-inject it on each Shopify store" />
                <InfoRow icon="→" color="text-sky-400" text="After rotating, go to each site → Get script → Copy → paste into Shopify → Mark as injected" />
                <InfoRow icon="✓" color="text-emerald-400" text="Recommended every 1–3 months to stay hidden from Google" />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[var(--c-border)] flex items-center justify-between gap-3">
              <button
                onClick={() => { setOpen(false); setState('idle'); }}
                disabled={state === 'loading'}
                className="text-xs font-mono px-4 py-2 rounded-lg border border-[var(--c-border)] text-[var(--c-text-2)] hover:text-[var(--c-text)] transition-colors disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={state === 'loading' || state === 'done'}
                className="flex items-center gap-2 text-xs font-mono px-4 py-2 rounded-lg bg-amber-400/10 text-amber-400 border border-amber-400/30 hover:bg-amber-400/20 transition-colors disabled:opacity-40"
              >
                {state === 'loading' ? (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-spin">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                    </svg>
                    Rotating…
                  </>
                ) : state === 'done' ? (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    <span className="text-emerald-400">Done — re-inject all sites</span>
                  </>
                ) : state === 'error' ? (
                  <span className="text-red-400">Failed — try again</span>
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <polyline points="23 4 23 10 17 10"/>
                      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                    </svg>
                    Yes, rotate all scripts
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

function InfoRow({ icon, color, text }: { icon: string; color: string; text: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className={`text-xs mt-0.5 flex-shrink-0 ${color}`}>{icon}</span>
      <span className="text-xs font-mono text-[var(--c-text-2)]">{text}</span>
    </div>
  );
}
