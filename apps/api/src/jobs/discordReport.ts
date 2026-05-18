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

  const COUNTRY_NAMES: Record<string, string> = {
    US:'United States',GB:'United Kingdom',CA:'Canada',AU:'Australia',PH:'Philippines',
    DE:'Germany',FR:'France',NL:'Netherlands',BR:'Brazil',IN:'India',MX:'Mexico',
    SG:'Singapore',JP:'Japan',KR:'South Korea',ID:'Indonesia',TH:'Thailand',
    NG:'Nigeria',ZA:'South Africa',AE:'United Arab Emirates',IT:'Italy',ES:'Spain',
    SE:'Sweden',NO:'Norway',DK:'Denmark',FI:'Finland',PL:'Poland',UA:'Ukraine',
    RU:'Russia',TR:'Turkey',SA:'Saudi Arabia',MY:'Malaysia',VN:'Vietnam',
  };

  const countryLabel = (code: string) => COUNTRY_NAMES[code.toUpperCase()] ?? code;

  // Build fields
  const topSites = sites.slice(0, 5).map((s, i) => {
    const medals = ['🥇','🥈','🥉','4️⃣','5️⃣'];
    return `${medals[i]} **${s.domain}**\n┗ ${s.visitors} visitors · ${s.pageviews} pageviews`;
  }).join('\n') || '_No data_';

  const bottomSites = [...sites].filter(s => s.visitors > 0).reverse().slice(0, 3).map((s, i) =>
    `\`${i + 1}.\` **${s.domain}** — ${s.visitors} visitors`
  ).join('\n') || '_No data_';

  const topCountries = countries.map((c, i) =>
    `\`${i + 1}.\` **${countryLabel(c.country)}** — ${c.cnt} visitors`
  ).join('\n') || '_No data_';

  const deviceBreakdown = devices.map(d => {
    const pct = totalDevices > 0 ? Math.round((Number(d.cnt) / totalDevices) * 100) : 0;
    const bar = '█'.repeat(Math.round(pct / 10)) + '░'.repeat(10 - Math.round(pct / 10));
    return `**${d.device.charAt(0).toUpperCase() + d.device.slice(1)}** ${bar} ${pct}%`;
  }).join('\n') || '_No data_';

  const payload = {
    embeds: [{
      title: '📊 Deep2K Daily Report',
      description: `🗓️ **${label}**\n\n> **${totals.total_visitors.toLocaleString()}** visitors  ·  **${totals.total_pageviews.toLocaleString()}** pageviews  ·  **${totals.active_sites}** active sites`,
      color: 0x34d399,
      fields: [
        {
          name: '🏆 Top Performing Sites',
          value: topSites,
          inline: false,
        },
        {
          name: '📉 Lowest Performing Sites',
          value: bottomSites,
          inline: false,
        },
        {
          name: '🌍 Top Countries',
          value: topCountries,
          inline: true,
        },
        {
          name: '📱 Device Breakdown',
          value: deviceBreakdown,
          inline: true,
        },
      ],
      footer: { text: 'Deep2K Analytics · automatic daily report · 8:00 AM UTC' },
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
