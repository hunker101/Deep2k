import express from 'express';
import cron from 'node-cron';
import { loadEnv } from './env.js';
import { getDb } from './db.js';
import { adminAuth } from './middleware/adminAuth.js';
import { ingestRouter } from './routes/ingest.js';
import { sitesRouter } from './routes/sites.js';
import { statsRouter } from './routes/stats.js';
import { adminRouter } from './routes/admin.js';
import { initQueue, flush } from './queues/index.js';
import { runAggregation } from './jobs/aggregate.js';
import { rotateDailySalt } from './jobs/rotateSalt.js';
import { sendDiscordReport } from './jobs/discordReport.js';
import { MAX_PAYLOAD_BYTES } from '@deep2k/shared';

const env = loadEnv();
const db = getDb(env.DATABASE_URL);
initQueue(db);

const app = express();
app.use(express.json({ limit: MAX_PAYLOAD_BYTES }));

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

// Public ingest (X-Site-Auth header per site)
app.use('/', ingestRouter(db));

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
  await flush();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 5000).unref();
}
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
