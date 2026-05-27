import { randomBytes, randomInt } from 'node:crypto';
import {
  BEACON_METHODS,
  SCRIPT_PATH_POOL,
  INIT_DELAY_RANGE_MS,
  type BeaconMethod,
} from '@deep2k/shared';

const ENDPOINT_PREFIXES = ['_', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'n', 'p', 'q', 'r', 's', 't', 'v', 'w', 'x', 'z'] as const;
const ENDPOINT_SUFFIXES = ['p', 'r', 'v', 'c', 't', 'e', 's', 'g'] as const;

/**
 * Generate a random endpoint path like /_a3f2/p.
 * ~16 million combinations — scales to any number of sites.
 * The caller must check DB uniqueness and retry if needed (collision probability < 0.01% per site).
 */
export function generateEndpointPath(): string {
  const prefix = ENDPOINT_PREFIXES[randomInt(0, ENDPOINT_PREFIXES.length)]!;
  const body = randomBytes(2).toString('hex'); // 4 hex chars = 65536 values
  const suffix = ENDPOINT_SUFFIXES[randomInt(0, ENDPOINT_SUFFIXES.length)]!;
  return `/_${prefix}${body}/${suffix}`;
}

export function pickScriptPath(): string {
  return pickFromPool(SCRIPT_PATH_POOL);
}

/** @deprecated Use generateEndpointPath() + DB uniqueness check instead. */
export function pickEndpointPath(): string {
  return generateEndpointPath();
}

export function pickBeaconMethod(): BeaconMethod {
  return pickFromPool(BEACON_METHODS);
}

export function pickInitDelayMs(): number {
  const [lo, hi] = INIT_DELAY_RANGE_MS;
  return randomInt(lo, hi + 1);
}

export function generateSecret(): string {
  return randomBytes(32).toString('hex');
}

export function generateVariableSeed(): string {
  return randomBytes(16).toString('hex');
}

function pickFromPool<T>(pool: readonly T[]): T {
  if (pool.length === 0) throw new Error('pool is empty');
  const idx = randomInt(0, pool.length);
  return pool[idx] as T;
}
