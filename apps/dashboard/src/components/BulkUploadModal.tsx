'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface Result {
  domain: string;
  status: 'created' | 'exists' | 'error';
  message?: string;
}

export function BulkUploadModal({ onClose }: { onClose: () => void }) {
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const domains = text
      .split(/[\n,]+/)
      .map(d => d.trim().replace(/^https?:\/\//, '').replace(/\/$/, ''))
      .filter(Boolean);

    if (domains.length === 0) return;

    setLoading(true);
    setTotal(domains.length);
    setProgress(0);
    setResults([]);

    const newResults: Result[] = [];

    for (const domain of domains) {
      try {
        const res = await fetch('/api/sites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ domain }),
        });

        if (res.status === 409) {
          newResults.push({ domain, status: 'exists' });
        } else if (res.ok) {
          newResults.push({ domain, status: 'created' });
        } else {
          const err = await res.json() as { error?: string };
          newResults.push({ domain, status: 'error', message: err.error });
        }
      } catch {
        newResults.push({ domain, status: 'error', message: 'Connection error' });
      }

      setProgress(prev => prev + 1);
      setResults([...newResults]);
    }

    setLoading(false);
    setDone(true);
    router.refresh();
  }

  const created = results.filter(r => r.status === 'created').length;
  const exists = results.filter(r => r.status === 'exists').length;
  const errors = results.filter(r => r.status === 'error').length;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-[var(--c-card)] border border-[var(--c-border)] rounded-2xl w-full max-w-xl max-h-[85vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--c-border)]">
          <div>
            <h2 className="text-[var(--c-text)] font-semibold text-lg">Bulk upload sites</h2>
            <p className="text-xs text-[var(--c-text-2)] font-mono mt-0.5">Upload a CSV or TXT file with one domain per line</p>
          </div>
          <button onClick={onClose} className="text-[var(--c-text-2)] hover:text-[var(--c-text)] transition-colors p-1">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {!loading && !done && (
            <>
              {/* File format info */}
              <div className="bg-[var(--c-deep)] border border-[var(--c-border)] rounded-lg p-4">
                <p className="text-xs font-mono text-[var(--c-text-2)] mb-2">File format — one domain per line:</p>
                <pre className="text-xs text-emerald-400 font-mono">
{`store1.com
store2.com
store3.ca
myshop.io`}
                </pre>
              </div>

              {/* Upload button */}
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-[var(--c-border)] hover:border-emerald-500 rounded-xl p-10 text-center cursor-pointer transition-colors group"
              >
                <svg className="mx-auto mb-3 text-[var(--c-text-3)] group-hover:text-emerald-400 transition-colors" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                <p className="text-sm font-mono text-[var(--c-text-2)] group-hover:text-[var(--c-text)] transition-colors">Click to upload CSV or TXT file</p>
                <p className="text-xs font-mono text-[var(--c-text-3)] mt-1">Supports comma-separated or one per line</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFile}
                  className="hidden"
                />
              </div>

              <button onClick={onClose} className="w-full text-[var(--c-text-2)] hover:text-[var(--c-text)] text-sm font-mono transition-colors py-2">
                Cancel
              </button>
            </>
          )}

          {/* Progress */}
          {loading && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-mono text-[var(--c-text-2)]">
                <span>Processing domains…</span>
                <span>{progress} / {total}</span>
              </div>
              <div className="w-full bg-[var(--c-deep)] border border-[var(--c-border)] rounded-full h-2">
                <div
                  className="bg-emerald-400 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(progress / total) * 100}%` }}
                />
              </div>
              <ResultsList results={results} />
            </div>
          )}

          {/* Done */}
          {done && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <SummaryCard label="Created" count={created} color="emerald" />
                <SummaryCard label="Already exists" count={exists} color="yellow" />
                <SummaryCard label="Errors" count={errors} color="red" />
              </div>
              <ResultsList results={results} />
              <p className="text-xs font-mono text-[var(--c-text-2)] text-center">
                Scripts are generated — inject each into their Shopify theme.
              </p>
              <button
                onClick={onClose}
                className="w-full bg-[var(--c-subtle)] hover:bg-[var(--c-subtle-hover)] border border-[var(--c-border-strong)] text-[var(--c-text)] font-semibold py-2.5 rounded-lg text-sm transition-colors"
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

function ResultsList({ results }: { results: Result[] }) {
  if (results.length === 0) return null;
  return (
    <div className="bg-[var(--c-deep)] border border-[var(--c-border)] rounded-lg max-h-48 overflow-y-auto divide-y divide-[var(--c-border)]">
      {results.map(r => (
        <div key={r.domain} className="flex items-center justify-between px-4 py-2">
          <span className="text-xs font-mono text-[var(--c-text)]">{r.domain}</span>
          <span className={`text-xs font-mono ${
            r.status === 'created' ? 'text-emerald-400' :
            r.status === 'exists' ? 'text-yellow-400' : 'text-red-400'
          }`}>
            {r.status === 'created' ? '✓ Created' :
             r.status === 'exists' ? '~ Exists' : `✗ ${r.message ?? 'Error'}`}
          </span>
        </div>
      ))}
    </div>
  );
}

function SummaryCard({ label, count, color }: { label: string; count: number; color: 'emerald' | 'yellow' | 'red' }) {
  const colors = {
    emerald: 'text-emerald-400 border-emerald-400/20 bg-emerald-400/10',
    yellow: 'text-yellow-400 border-yellow-400/20 bg-yellow-400/10',
    red: 'text-red-400 border-red-400/20 bg-red-400/10',
  };
  return (
    <div className={`border rounded-lg p-3 text-center ${colors[color]}`}>
      <div className="text-2xl font-bold tabular-nums">{count}</div>
      <div className="text-xs font-mono mt-0.5">{label}</div>
    </div>
  );
}
