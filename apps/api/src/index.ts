import express from 'express';
import { loadEnv } from './env.js';
import { getDb } from './db.js';
import { adminAuth } from './middleware/adminAuth.js';
import { ingestRouter } from './routes/ingest.js';
import { sitesRouter } from './routes/sites.js';
import { statsRouter } from './routes/stats.js';
import { MAX_PAYLOAD_BYTES } from '@deep2k/shared';

const env = loadEnv();
const db = getDb(env.DATABASE_URL);
const app = express();

app.use(express.json({ limit: MAX_PAYLOAD_BYTES }));

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

// Public ingest endpoint (worker → backend, X-Site-Auth header)
app.use('/', ingestRouter(db));

// Admin routes (bearer token)
app.use('/api', adminAuth(env.ADMIN_TOKEN), sitesRouter(db));
app.use('/api', adminAuth(env.ADMIN_TOKEN), statsRouter(db));

app.listen(env.API_PORT, () => {
  console.log(`[api] listening on http://localhost:${env.API_PORT}`);
});
