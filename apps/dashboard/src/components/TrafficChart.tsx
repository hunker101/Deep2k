'use client';

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface Point { date: string; pageviews: number; visitors: number; }

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
}

export function TrafficChart({ data }: { data: Point[] }) {
  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={sorted} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1a2e22" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          tick={{ fill: '#6b8f7a', fontSize: 11, fontFamily: 'monospace' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatNum}
          tick={{ fill: '#6b8f7a', fontSize: 11, fontFamily: 'monospace' }}
          axisLine={false}
          tickLine={false}
          width={36}
        />
        <Tooltip
          contentStyle={{ background: '#0d1a14', border: '1px solid #1a2e22', borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: '#6b8f7a', fontFamily: 'monospace' }}
          itemStyle={{ fontFamily: 'monospace' }}
          labelFormatter={(label: unknown) => typeof label === 'string' ? formatDate(label) : ''}
          formatter={(val: unknown, name: unknown) => [
            typeof val === 'number' ? val.toLocaleString() : String(val ?? ''),
            name === 'visitors' ? 'Visitors' : 'Pageviews',
          ]}
        />
        <Line type="monotone" dataKey="visitors" stroke="#34d399" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="pageviews" stroke="#0ea5e9" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
