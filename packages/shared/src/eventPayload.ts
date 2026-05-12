import { z } from 'zod';

export const BrowserEventPayloadSchema = z.object({
  h: z.string().min(1).max(253),
  p: z.string().min(1).max(2048),
  r: z.string().max(2048).default(''),
  s: z
    .string()
    .max(16)
    .regex(/^\d{1,5}x\d{1,5}$/)
    .default('0x0'),
  t: z.number().int().nonnegative(),
});

export type BrowserEventPayload = z.infer<typeof BrowserEventPayloadSchema>;
