'use client';

import { useState, useEffect } from 'react';

export function LiveVisitorCard() {
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    async function fetchLive() {
      try {
        const res = await fetch('/api/stats/live');
        if (res.ok) {
          const data = await res.json() as { total: number };
          setTotal(data.total);
        }
      } catch {}
    }
    fetchLive();
    const interval = setInterval(fetchLive, 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-[var(--c-card)] border border-[var(--c-border)] rounded-xl p-5">
      <p className="text-xs font-mono text-[var(--c-text-2)] uppercase tracking-wide mb-2">Live Visitors</p>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
        <p className="text-3xl font-bold tabular-nums text-emerald-400">
          {total === null ? '—' : total.toLocaleString()}
        </p>
      </div>
      <p className="text-xs font-mono text-[var(--c-text-2)] mt-1">across all stores · now</p>
    </div>
  );
}
