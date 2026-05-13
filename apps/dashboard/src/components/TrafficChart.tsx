'use client';

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
    <div className="bg-[#0a1a10] border border-[#1a2e22] rounded-xl px-4 py-3 shadow-xl">
      <p className="text-xs font-mono text-[#6b8f7a] mb-2">{typeof label === 'string' ? formatDate(label) : ''}</p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center gap-2 text-sm font-mono">
          <span className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-[#6b8f7a]">{entry.name === 'visitors' ? 'Visitors' : 'Pageviews'}</span>
          <span className="text-white font-semibold ml-auto pl-4">{Number(entry.value).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

export function TrafficChart({ data }: { data: Point[] }) {
  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));

  return (
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
        <CartesianGrid strokeDasharray="3 3" stroke="#1a2e22" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          tick={{ fill: '#4a7060', fontSize: 11, fontFamily: 'monospace' }}
          axisLine={false}
          tickLine={false}
          dy={6}
        />
        <YAxis
          tickFormatter={formatNum}
          tick={{ fill: '#4a7060', fontSize: 11, fontFamily: 'monospace' }}
          axisLine={false}
          tickLine={false}
          width={32}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#2a4a32', strokeWidth: 1 }} />
        <Area
          type="monotone"
          dataKey="pageviews"
          stroke="#38bdf8"
          strokeWidth={2}
          fill="url(#gradPageviews)"
          dot={false}
          activeDot={{ r: 4, fill: '#38bdf8', strokeWidth: 0 }}
        />
        <Area
          type="monotone"
          dataKey="visitors"
          stroke="#34d399"
          strokeWidth={2}
          fill="url(#gradVisitors)"
          dot={false}
          activeDot={{ r: 4, fill: '#34d399', strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
