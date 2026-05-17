import { sql } from 'drizzle-orm';
import type { Db } from '@deep2k/db';

interface SiteReport {
  domain: string;
  visitors: number;
  pageviews: number;
}

interface CountryRow { country: string; cnt: number; }
interface DeviceRow { device: string; cnt: number; }

export async function sendDiscordReport(db: Db): Promise<void> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.log('[discord] DISCORD_WEBHOOK_URL not set — skipping report');
    return;
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const date = yesterday.toISOString().slice(0, 10);

  // Totals
  const totalsResult = await db.execute(sql`
    SELECT
      COALESCE(SUM(pageviews), 0)::int       AS total_pageviews,
      COALESCE(SUM(unique_visitors), 0)::int AS total_visitors,
      COUNT(DISTINCT site_id)::int           AS active_sites
    FROM daily_stats
    WHERE date = ${date}
  `);
  const totals = totalsResult.rows[0] as { total_pageviews: number; total_visitors: number; active_sites: number };

  // Sites ranked by visitors
  const sitesResult = await db.execute(sql`
    SELECT s.domain, ds.unique_visitors AS visitors, ds.pageviews
    FROM daily_stats ds
    JOIN sites s ON s.id = ds.site_id
    WHERE ds.date = ${date}
    ORDER BY ds.unique_visitors DESC
  `);
  const sites = sitesResult.rows as unknown as SiteReport[];

  // Top countries across all sites
  const countriesResult = await db.execute(sql`
    SELECT key AS country, SUM(value::int) AS cnt
    FROM daily_stats, jsonb_each_text(countries)
    WHERE date = ${date} AND countries != '{}'
    GROUP BY key
    ORDER BY cnt DESC
    LIMIT 5
  `);
  const countries = countriesResult.rows as unknown as CountryRow[];

  // Device breakdown
  const devicesResult = await db.execute(sql`
    SELECT key AS device, SUM(value::int) AS cnt
    FROM daily_stats, jsonb_each_text(devices)
    WHERE date = ${date} AND devices != '{}'
    GROUP BY key
    ORDER BY cnt DESC
  `);
  const devices = devicesResult.rows as unknown as DeviceRow[];
  const totalDevices = devices.reduce((s, d) => s + Number(d.cnt), 0);

  // Format date nicely
  const label = yesterday.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Build fields
  const topSites = sites.slice(0, 5).map((s, i) =>
    `\`${i + 1}.\` **${s.domain}** — ${s.visitors} visitors · ${s.pageviews} pageviews`
  ).join('\n') || '_No data_';

  const bottomSites = [...sites].reverse().slice(0, 3).map((s, i) =>
    `\`${i + 1}.\` **${s.domain}** — ${s.visitors} visitors`
  ).join('\n') || '_No data_';

  const topCountries = countries.map(c =>
    `**${c.country}** — ${c.cnt} visitors`
  ).join('\n') || '_No data_';

  const deviceBreakdown = devices.map(d =>
    `**${d.device.charAt(0).toUpperCase() + d.device.slice(1)}** — ${totalDevices > 0 ? Math.round((Number(d.cnt) / totalDevices) * 100) : 0}%`
  ).join('\n') || '_No data_';

  const payload = {
    embeds: [{
      title: `📊 Deep2K Daily Report`,
      description: `**${label}**`,
      color: 0x34d399,
      fields: [
        {
          name: '📈 Overview',
          value: `**${totals.total_visitors.toLocaleString()}** visitors · **${totals.total_pageviews.toLocaleString()}** pageviews · **${totals.active_sites}** active sites`,
          inline: false,
        },
        {
          name: '🏆 Top Sites',
          value: topSites,
          inline: false,
        },
        {
          name: '📉 Lowest Sites',
          value: bottomSites,
          inline: true,
        },
        {
          name: '🌍 Top Countries',
          value: topCountries,
          inline: true,
        },
        {
          name: '📱 Devices',
          value: deviceBreakdown,
          inline: false,
        },
      ],
      footer: { text: 'Deep2K Analytics · daily report' },
      timestamp: new Date().toISOString(),
    }],
  };

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Discord webhook failed (${res.status}): ${text}`);
  }

  console.log(`[discord] daily report sent for ${date}`);
}
