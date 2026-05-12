import { randomBytes, randomInt } from 'node:crypto';
import {
  BEACON_METHODS,
  ENDPOINT_PATH_POOL,
  SCRIPT_PATH_POOL,
  INIT_DELAY_RANGE_MS,
  type BeaconMethod,
} from '@deep2k/shared';

export function pickScriptPath(): string {
  return pickFromPool(SCRIPT_PATH_POOL);
}

export function pickEndpointPath(): string {
  return pickFromPool(ENDPOINT_PATH_POOL);
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
