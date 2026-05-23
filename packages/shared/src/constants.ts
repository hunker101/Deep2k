export const BEACON_METHODS = ['sendBeacon', 'fetch', 'image', 'xhr'] as const;
export type BeaconMethod = (typeof BEACON_METHODS)[number];

export const SCRIPT_PATH_POOL = [
  '/assets/c.js',
  '/_/m.js',
  '/assets/v.js',
  '/c.js',
  '/_a.js',
  '/js/_t.js',
  '/cdn/x.js',
  '/static/c.js',
] as const;

export const ENDPOINT_PATH_POOL = [
  '/_/p',
  '/c/v',
  '/api/r',
  '/p.gif',
  '/static/_e',
  '/_a/c',
  '/__/t',
  '/m/s',
  '/_b/t',
  '/r/e',
  '/_p/v',
  '/js/c',
  '/_/c',
  '/v/p',
  '/_t/r',
  '/e.gif',
  '/_/r',
  '/b/p',
  '/_e/t',
  '/c/p',
] as const;

export const DEVICE_TYPES = ['mobile', 'tablet', 'desktop'] as const;
export type Device = (typeof DEVICE_TYPES)[number];

export const INIT_DELAY_RANGE_MS: readonly [number, number] = [200, 2000];

export const MAX_PAYLOAD_BYTES = 10 * 1024;
