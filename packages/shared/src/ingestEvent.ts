import { z } from 'zod';
import { DEVICE_TYPES } from './constants.js';

export const IngestEventSchema = z.object({
  site_id: z.string().uuid(),
  visitor_id: z
    .string()
    .length(16)
    .regex(/^[0-9a-f]{16}$/),
  path: z.string().max(2048),
  referrer: z.string().max(2048),
  country: z.string().max(8),
  device: z.enum(DEVICE_TYPES),
  timestamp: z.number().int().nonnegative(),
});

export type IngestEvent = z.infer<typeof IngestEventSchema>;
