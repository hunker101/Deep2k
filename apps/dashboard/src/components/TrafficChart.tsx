'use client';

import { useState } from 'react';
import { useTheme } from 'next-themes';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface Point { date: string; pageviews: number; visitors: number; }

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--c-deep)] border border-[var(--c-border)] rounded-xl px-4 py-3 shadow-xl">
      <p className="text-xs font-mono text-[var(--c-text-2)] mb-2">{typeof label === 'string' ? formatDate(label) : ''}</p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center gap-2 text-sm font-mono">
          <span className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-[var(--c-text-2)]">{entry.name === 'visitors' ? 'Visitors' : 'Pageviews'}</span>
          <span className="text-[var(--c-text)] font-semibold ml-auto pl-4">{Number(entry.value).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

export function TrafficChart({
  data,
  totalVisitors,
  totalPageviews,
}: {
  data: Point[];
  totalVisitors: number;
  totalPageviews: number;
}) {
  const [showVisitors, setShowVisitors] = useState(true);
  const [showPageviews, setShowPageviews] = useState(true);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== 'light';

  const gridColor = isDark ? '#1a2e22' : '#cce5d8';
  const tickColor = isDark ? '#4a7060' : '#5a8870';
  const cursorColor = isDark ? '#2a4a32' : '#a8d4bf';

  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <>
      {/* Legend toggles */}
      <div className="flex items-center gap-2 flex-wrap justify-end">
        <button
          onClick={() => setShowVisitors(v => !v)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono transition-all ${
            showVisitors
              ? 'bg-emerald-400/10 border-emerald-400/30 text-[var(--c-text)]'
              : 'bg-transparent border-[var(--c-border)] text-[var(--c-text-3)]'
          }`}
        >
          <span className={`w-2 h-2 rounded-full transition-all ${showVisitors ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-[var(--c-border)]'}`} />
          Visitors
          <span className="font-bold">{totalVisitors.toLocaleString()}</span>
        </button>

        <button
          onClick={() => setShowPageviews(v => !v)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono transition-all ${
            showPageviews
              ? 'bg-sky-400/10 border-sky-400/30 text-[var(--c-text)]'
              : 'bg-transparent border-[var(--c-border)] text-[var(--c-text-3)]'
          }`}
        >
          <span className={`w-2 h-2 rounded-full transition-all ${showPageviews ? 'bg-sky-400 shadow-[0_0_6px_#38bdf8]' : 'bg-[var(--c-border)]'}`} />
          Pageviews
          <span className="font-bold">{totalPageviews.toLocaleString()}</span>
        </button>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={sorted} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gradVisitors" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradPageviews" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fill: tickColor, fontSize: 11, fontFamily: 'monospace' }}
            axisLine={false}
            tickLine={false}
            dy={6}
          />
          <YAxis
            tickFormatter={formatNum}
            tick={{ fill: tickColor, fontSize: 11, fontFamily: 'monospace' }}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: cursorColor, strokeWidth: 1 }} />
          {showPageviews && (
            <Area
              type="monotone"
              dataKey="pageviews"
              stroke="#38bdf8"
              strokeWidth={2}
              fill="url(#gradPageviews)"
              dot={false}
              activeDot={{ r: 4, fill: '#38bdf8', strokeWidth: 0 }}
            />
          )}
          {showVisitors && (
            <Area
              type="monotone"
              dataKey="visitors"
              stroke="#34d399"
              strokeWidth={2}
              fill="url(#gradVisitors)"
              dot={false}
              activeDot={{ r: 4, fill: '#34d399', strokeWidth: 0 }}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </>
  );
}
