import { z } from 'zod';
import { BEACON_METHODS, INIT_DELAY_RANGE_MS } from './constants.js';

export const SiteConfigSchema = z.object({
  id: z.string().uuid(),
  domain: z.string().min(1).max(253),
  secret: z.string().length(64).regex(/^[0-9a-f]{64}$/),
  script_path: z.string().startsWith('/').max(128),
  endpoint_path: z.string().startsWith('/').max(128),
  beacon_method: z.enum(BEACON_METHODS),
  init_delay_ms: z
    .number()
    .int()
    .min(INIT_DELAY_RANGE_MS[0])
    .max(INIT_DELAY_RANGE_MS[1]),
  variable_seed: z.string().length(32).regex(/^[0-9a-f]{32}$/),
  backend_url: z.string().url().nullable(),
});

export type SiteConfig = z.infer<typeof SiteConfigSchema>;
