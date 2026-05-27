import express from 'express';
import cron from 'node-cron';
import { loadEnv } from './env.js';
import { getDb } from './db.js';
import { adminAuth } from './middleware/adminAuth.js';
import { ingestRouter } from './routes/ingest.js';
import { sitesRouter } from './routes/sites.js';
import { statsRouter } from './routes/stats.js';
import { adminRouter } from './routes/admin.js';
import { leadsRouter } from './routes/leads.js';
import { initQueue, flush } from './queues/index.js';
import { runAggregation } from './jobs/aggregate.js';
import { rotateDailySalt } from './jobs/rotateSalt.js';
import { sendDiscordReport } from './jobs/discordReport.js';
import { createPartitions } from './jobs/createPartitions.js';
import { pruneOldEvents } from './jobs/pruneEvents.js';
import { resyncKv } from './jobs/resyncKv.js';
import { MAX_PAYLOAD_BYTES } from '@deep2k/shared';

const env = loadEnv();
const db = getDb(env.DATABASE_URL);
initQueue(db);

const app = express();
app.use(express.json({ limit: MAX_PAYLOAD_BYTES }));
app.use(express.text({ type: 'text/plain', limit: MAX_PAYLOAD_BYTES }));

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

// Public ingest (X-Site-Auth header per site)
app.use('/', ingestRouter(db));

// Public leads ingest (no auth — accessed from browser scripts)
app.use('/api', leadsRouter(db));

// Admin routes (bearer token)
app.use('/api', adminAuth(env.ADMIN_TOKEN), sitesRouter(db, env));
app.use('/api', adminAuth(env.ADMIN_TOKEN), statsRouter(db));
app.use('/api', adminAuth(env.ADMIN_TOKEN), adminRouter(db));

// Hourly aggregation at :05 with 3h lookback for overlap safety.
const aggregationTask = cron.schedule('5 * * * *', async () => {
  console.log('[cron] aggregation starting');
  try {
    const rows = await runAggregation(db, 3);
    console.log(`[cron] aggregation done, ${rows} rows upserted`);
  } catch (err) {
    console.error('[cron] aggregation failed:', err);
  }
});

// Daily Discord report at 8am UTC.
const discordReportTask = cron.schedule('0 8 * * *', async () => {
  console.log('[cron] discord report starting');
  try {
    await sendDiscordReport(db);
  } catch (err) {
    console.error('[cron] discord report failed:', err);
  }
});

// Monthly partition creation on the 25th at noon UTC — creates current + next 3 months.
const partitionTask = cron.schedule('0 12 25 * *', async () => {
  console.log('[cron] partition creation starting');
  try {
    const results = await createPartitions(db, 3);
    console.log('[cron] partition creation done:', results);
  } catch (err) {
    console.error('[cron] partition creation failed:', err);
  }
});

// Also create partitions on startup so a fresh deploy is always ahead.
createPartitions(db, 3).catch(err => console.error('[startup] partition creation failed:', err));

// Hourly KV resync at :15 — keeps Cloudflare SITES_KV in sync with DB.
const resyncKvTask = cron.schedule('15 * * * *', async () => {
  console.log('[cron] resync-kv starting');
  try {
    const { synced, errors } = await resyncKv(db, env.CF_WORKER_URL);
    console.log(`[cron] resync-kv done, ${synced} synced, ${errors} errors`);
  } catch (err) {
    console.error('[cron] resync-kv failed:', err);
  }
});

// Also resync KV on startup so a fresh deploy immediately fixes any drift.
resyncKv(db, env.CF_WORKER_URL)
  .then(({ synced, errors }) => console.log(`[startup] resync-kv done, ${synced} synced, ${errors} errors`))
  .catch(err => console.error('[startup] resync-kv failed:', err));

// Nightly event pruning at 2am UTC — deletes raw events older than 90 days.
const pruneTask = cron.schedule('0 2 * * *', async () => {
  console.log('[cron] event pruning starting');
  try {
    const deleted = await pruneOldEvents(db, 90);
    console.log(`[cron] event pruning done, ${deleted} rows deleted`);
  } catch (err) {
    console.error('[cron] event pruning failed:', err);
  }
});

// Daily salt rotation at midnight.
const saltRotationTask = cron.schedule('0 0 * * *', async () => {
  console.log('[cron] salt rotation starting');
  try {
    await rotateDailySalt(db);
    console.log('[cron] salt rotation done');
  } catch (err) {
    console.error('[cron] salt rotation failed:', err);
  }
});

const server = app.listen(env.API_PORT, () => {
  console.log(`[api] listening on http://localhost:${env.API_PORT}`);
});

let shuttingDown = false;
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[api] ${signal} received, draining`);
  aggregationTask.stop();
  saltRotationTask.stop();
  discordReportTask.stop();
  partitionTask.stop();
  pruneTask.stop();
  resyncKvTask.stop();
  await flush();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 5000).unref();
}
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
