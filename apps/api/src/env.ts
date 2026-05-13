import { z } from 'zod';

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  API_PORT: z.coerce.number().int().positive().default(3000),
  ADMIN_TOKEN: z.string().min(16),
  // Comma-separated list of backend collector URLs for pool assignment.
  // Optional — omit in dev to leave backend_url null (Worker falls back to BACKEND_URL env var).
  BACKEND_URLS: z.string().optional(),
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
