'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const PERIODS = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: '7 Days' },
  { key: '30d', label: '30 Days' },
  { key: 'month', label: 'This Month' },
];

export function PeriodSelector({
  current,
  customFrom,
  customTo,
}: {
  current: string;
  customFrom?: string;
  customTo?: string;
}) {
  const router = useRouter();
  const isCustom = !!customFrom && !!customTo;
  const [showPicker, setShowPicker] = useState(false);
  const [fromDate, setFromDate] = useState(customFrom ?? '');
  const [toDate, setToDate] = useState(customTo ?? '');

  function applyCustom() {
    if (!fromDate || !toDate) return;
    router.push(`/?from=${fromDate}&to=${toDate}`);
    setShowPicker(false);
  }

  const customLabel = isCustom
    ? `${customFrom} → ${customTo}`
    : 'Custom';

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Preset tabs */}
        <div className="flex items-center gap-1 bg-[var(--c-card)] border border-[var(--c-border)] rounded-lg p-0.5">
          {PERIODS.map(p => (
            <Link
              key={p.key}
              href={`/?period=${p.key}`}
              onClick={() => setShowPicker(false)}
              className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
                !isCustom && current === p.key
                  ? 'bg-[var(--c-subtle)] text-[var(--c-text)]'
                  : 'text-[var(--c-text-2)] hover:text-[var(--c-text)]'
              }`}
            >
              {p.label}
            </Link>
          ))}
          <button
            onClick={() => setShowPicker(v => !v)}
            className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors flex items-center gap-1.5 ${
              isCustom || showPicker
                ? 'bg-[var(--c-subtle)] text-[var(--c-text)]'
                : 'text-[var(--c-text-2)] hover:text-[var(--c-text)]'
            }`}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            {customLabel}
          </button>
        </div>

        {/* Custom date picker — inline */}
        {showPicker && (
          <div className="flex items-center gap-2 bg-[var(--c-card)] border border-[var(--c-border)] rounded-lg px-3 py-1.5">
            <input
              type="date"
              value={fromDate}
              max={toDate || undefined}
              onChange={e => setFromDate(e.target.value)}
              className="bg-transparent text-xs font-mono text-[var(--c-text)] focus:outline-none cursor-pointer"
            />
            <span className="text-[var(--c-text-3)] text-xs font-mono">→</span>
            <input
              type="date"
              value={toDate}
              min={fromDate || undefined}
              onChange={e => setToDate(e.target.value)}
              className="bg-transparent text-xs font-mono text-[var(--c-text)] focus:outline-none cursor-pointer"
            />
            <button
              onClick={applyCustom}
              disabled={!fromDate || !toDate}
              className="text-xs font-mono font-semibold text-emerald-400 hover:text-emerald-300 disabled:opacity-40 transition-colors ml-1"
            >
              Apply
            </button>
            <button
              onClick={() => setShowPicker(false)}
              className="text-[var(--c-text-3)] hover:text-[var(--c-text)] transition-colors"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
