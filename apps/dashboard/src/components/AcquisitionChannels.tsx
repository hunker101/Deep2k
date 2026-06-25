'use client';

import { useState } from 'react';

interface Channel {
  name: string;
  description: string;
  visitors: number;
  sources: { domain: string; visitors: number }[];
  bar: string;
  badge: string;
  dot: string;
}

const CHANNEL_META: Record<string, { description: string; bar: string; badge: string; dot: string }> = {
  'Organic Search': {
    description: 'Visitors who found the store through Google or other search engines without clicking an ad.',
    bar: '#34d399',
    badge: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    dot: 'bg-emerald-400',
  },
  'Paid Search': {
    description: 'Visitors who clicked a paid ad on Google or Bing.',
    bar: '#facc15',
    badge: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
    dot: 'bg-yellow-400',
  },
  'Organic Social': {
    description: 'Visitors who came from Facebook, Instagram, TikTok or other social platforms without clicking an ad.',
    bar: '#38bdf8',
    badge: 'text-sky-400 bg-sky-400/10 border-sky-400/20',
    dot: 'bg-sky-400',
  },
  'Paid Social': {
    description: 'Visitors who clicked a paid ad on Facebook, Instagram, or TikTok.',
    bar: '#a78bfa',
    badge: 'text-violet-400 bg-violet-400/10 border-violet-400/20',
    dot: 'bg-violet-400',
  },
  'Direct': {
    description: 'Visitors who typed the URL directly into their browser or came from a bookmark.',
    bar: '#94a3b8',
    badge: 'text-slate-400 bg-slate-400/10 border-slate-400/20',
    dot: 'bg-slate-400',
  },
  'Referral': {
    description: 'Visitors who came from another website linking to the store.',
    bar: '#fb923c',
    badge: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
    dot: 'bg-orange-400',
  },
  'Email': {
    description: 'Visitors who came from an email link.',
    bar: '#f472b6',
    badge: 'text-pink-400 bg-pink-400/10 border-pink-400/20',
    dot: 'bg-pink-400',
  },
};

function classifyDomain(domain: string): string {
  const d = domain.toLowerCase();
  if (/google\.|bing\.com|duckduckgo\.com|yahoo\.com|baidu\.com|yandex\.|ecosia\.org|odiasearch\.com/.test(d)) return 'Organic Search';
  if (/facebook\.com|instagram\.com|tiktok\.com|pinterest\.com|twitter\.com|x\.com|snapchat\.com|linkedin\.com/.test(d)) return 'Organic Social';
  if (/mail\.|gmail\.|outlook\.|hotmail\./.test(d)) return 'Email';
  return 'Referral';
}

function buildChannels(referrerCounts: Record<string, number>, totalVisitors: number): Channel[] {
  const channelMap: Record<string, { visitors: number; sources: Record<string, number> }> = {};

  for (const [domain, count] of Object.entries(referrerCounts)) {
    const channel = classifyDomain(domain);
    if (!channelMap[channel]) channelMap[channel] = { visitors: 0, sources: {} };
    channelMap[channel]!.visitors += count;
    channelMap[channel]!.sources[domain] = (channelMap[channel]!.sources[domain] ?? 0) + count;
  }

  const referredTotal = Object.values(channelMap).reduce((s, c) => s + c.visitors, 0);
  const directCount = Math.max(0, totalVisitors - referredTotal);
  if (directCount > 0) {
    channelMap['Direct'] = { visitors: directCount, sources: {} };
  }

  return Object.entries(channelMap)
    .map(([name, data]) => ({
      name,
      description: CHANNEL_META[name]?.description ?? '',
      bar: CHANNEL_META[name]?.bar ?? '#94a3b8',
      badge: CHANNEL_META[name]?.badge ?? 'text-slate-400 bg-slate-400/10 border-slate-400/20',
      dot: CHANNEL_META[name]?.dot ?? 'bg-slate-400',
      visitors: data.visitors,
      sources: Object.entries(data.sources)
        .map(([domain, visitors]) => ({ domain, visitors }))
        .sort((a, b) => b.visitors - a.visitors),
    }))
    .sort((a, b) => b.visitors - a.visitors);
}

function DomainAvatar({ domain }: { domain: string }) {
  const letter = domain.charAt(0).toUpperCase();
  const colors = ['bg-emerald-400/20 text-emerald-400', 'bg-sky-400/20 text-sky-400', 'bg-violet-400/20 text-violet-400', 'bg-orange-400/20 text-orange-400', 'bg-pink-400/20 text-pink-400'];
  const color = colors[domain.charCodeAt(0) % colors.length];
  return (
    <span className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold font-mono flex-shrink-0 ${color}`}>
      {letter}
    </span>
  );
}

function Tooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex flex-shrink-0" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-[var(--c-text-3)] cursor-help">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      {show && (
        <span className="absolute left-5 top-0 z-50 w-60 bg-[var(--c-card)] border border-[var(--c-border)] rounded-xl px-3 py-2.5 text-xs font-mono text-[var(--c-text-2)] shadow-xl leading-relaxed">
          {text}
        </span>
      )}
    </span>
  );
}

export function AcquisitionChannels({
  referrerCounts,
  totalVisitors,
}: {
  referrerCounts: Record<string, number>;
  totalVisitors: number;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const channels = buildChannels(referrerCounts, totalVisitors);

  if (channels.length === 0) return null;

  const maxVisitors = channels[0]?.visitors ?? 1;

  return (
    <div className="bg-[var(--c-card)] border border-[var(--c-border)] rounded-xl overflow-hidden">

      {/* Header */}
      <div className="px-5 py-4 border-b border-[var(--c-border)] flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-[var(--c-text)]">Acquisition Channels</h3>
          </div>
          <p className="text-xs text-[var(--c-text-2)] font-mono mt-0.5">{channels.length} channels · {totalVisitors.toLocaleString()} total visitors</p>
        </div>
      </div>

      {/* Stacked bar */}
      <div className="px-5 pt-4 pb-3">
        <div className="flex rounded-full overflow-hidden h-2 gap-px">
          {channels.map(ch => {
            const pct = totalVisitors > 0 ? (ch.visitors / totalVisitors) * 100 : 0;
            return (
              <div
                key={ch.name}
                style={{ width: `${pct}%`, backgroundColor: ch.bar }}
                title={`${ch.name} — ${Math.round(pct)}%`}
                className="transition-all"
              />
            );
          })}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
          {channels.map(ch => (
            <div key={ch.name} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${ch.dot}`} />
              <span className="text-[10px] font-mono text-[var(--c-text-2)]">{ch.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Channel rows */}
      <div className="divide-y divide-[var(--c-border)] border-t border-[var(--c-border)] mt-1">
        {channels.map(ch => {
          const pct = totalVisitors > 0 ? Math.round((ch.visitors / totalVisitors) * 100) : 0;
          const barWidth = maxVisitors > 0 ? (ch.visitors / maxVisitors) * 100 : 0;
          const isOpen = expanded === ch.name;
          return (
            <div key={ch.name}>
              <button
                onClick={() => setExpanded(isOpen ? null : ch.name)}
                className="w-full px-5 py-4 flex items-center gap-4 hover:bg-[var(--c-hover)] transition-colors text-left group"
              >
                {/* Channel badge */}
                <span className={`text-[10px] font-mono font-semibold px-2.5 py-1 rounded-lg border ${ch.badge} w-[120px] flex-shrink-0 text-center`}>
                  {ch.name}
                </span>

                <Tooltip text={ch.description} />

                {/* Bar */}
                <div className="flex-1">
                  <div className="w-full bg-[var(--c-bg)] rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${barWidth}%`, backgroundColor: ch.bar }}
                    />
                  </div>
                </div>

                {/* Numbers */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-sm font-mono font-bold tabular-nums text-[var(--c-text)] w-12 text-right">{ch.visitors.toLocaleString()}</span>
                  <span className="text-xs font-mono text-[var(--c-text-3)] w-8 text-right">{pct}%</span>
                </div>

                {/* Chevron */}
                <svg
                  width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  strokeLinecap="round"
                  className={`text-[var(--c-text-3)] transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
                >
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>

              {/* Expanded sources */}
              {isOpen && (
                <div className="bg-[var(--c-deep)] border-t border-[var(--c-border)]">
                  {ch.sources.length === 0 ? (
                    <div className="px-7 py-3 flex items-center gap-2">
                      <span className="text-xs font-mono text-[var(--c-text-3)]">No referrer — direct visit or bookmark</span>
                    </div>
                  ) : (
                    ch.sources.map(src => {
                      const srcPct = ch.visitors > 0 ? Math.round((src.visitors / ch.visitors) * 100) : 0;
                      return (
                        <div key={src.domain} className="px-7 py-2.5 flex items-center gap-3 hover:bg-[var(--c-hover)] transition-colors">
                          <DomainAvatar domain={src.domain} />
                          <span className="text-xs font-mono text-[var(--c-text-2)] flex-1">{src.domain}</span>
                          <span className="text-xs font-mono text-[var(--c-text-3)]">{srcPct}%</span>
                          <span className="text-xs font-mono font-semibold tabular-nums text-[var(--c-text)] w-8 text-right">{src.visitors.toLocaleString()}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
