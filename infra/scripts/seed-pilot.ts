import { makeDb, sites } from '@deep2k/db';
import { generateSiteConfig } from '@deep2k/tracker-generator';

const DOMAINS = [
  'pilot-1.example.com',
  'pilot-2.example.com',
  'pilot-3.example.com',
  'pilot-4.example.com',
  'pilot-5.example.com',
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }

  const { db, pool } = makeDb(url);
  const workerSites: Record<string, { id: string; secret: string; endpoint_path: string }> = {};

  for (const domain of DOMAINS) {
    const cfg = generateSiteConfig(domain);
    const [row] = await db
      .insert(sites)
      .values({
        domain: cfg.domain,
        secret: cfg.secret,
        scriptPath: cfg.script_path,
        endpointPath: cfg.endpoint_path,
        beaconMethod: cfg.beacon_method,
        initDelayMs: cfg.init_delay_ms,
        variableSeed: cfg.variable_seed,
        backendUrl: null,
      })
      .onConflictDoNothing({ target: sites.domain })
      .returning();

    if (!row) {
      console.log(`exists ${domain}`);
      const { rows: [existing] } = await pool.query<{ id: string; secret: string; endpoint_path: string }>(
        'SELECT id, secret, endpoint_path FROM sites WHERE domain = $1',
        [domain],
      );
      if (existing) {
        workerSites[domain] = {
          id: existing.id,
          secret: existing.secret,
          endpoint_path: existing.endpoint_path,
        };
      }
      continue;
    }
    console.log(`created ${row.domain}  script=${row.scriptPath}  endpoint=${row.endpointPath}  beacon=${row.beaconMethod}`);
    workerSites[row.domain] = {
      id: row.id,
      secret: row.secret,
      endpoint_path: row.endpointPath,
    };
  }

  console.log('\nPaste into apps/worker/wrangler.toml [vars] SITES_JSON:');
  console.log(JSON.stringify(JSON.stringify(workerSites)));

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
