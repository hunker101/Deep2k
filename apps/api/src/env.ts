import { z } from 'zod';

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  API_PORT: z.coerce.number().int().positive().default(3000),
  ADMIN_TOKEN: z.string().min(16),
  // Comma-separated list of backend collector URLs for pool assignment.
  // Optional — omit in dev to leave backend_url null (Worker falls back to BACKEND_URL env var).
  BACKEND_URLS: z.string().optional(),
  // Cloudflare credentials for KV sync (optional — skipped in dev if not set).
  CF_ACCOUNT_ID: z.string().optional(),
  CF_API_TOKEN: z.string().optional(),
  CF_SITES_KV_NAMESPACE_ID: z.string().optional(),
  // Base URL of the deployed Worker (e.g. https://deep2k-worker.xxx.workers.dev).
  // When set, tracker scripts use an absolute endpoint URL instead of relative.
  CF_WORKER_URL: z.string().optional(),
  DISCORD_WEBHOOK_URL: z.string().optional(),
  // Public-facing API URL used to build lead ingest URLs in tracker scripts.
  PUBLIC_API_URL: z.string().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('Invalid environment:', parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  return parsed.data;
}
