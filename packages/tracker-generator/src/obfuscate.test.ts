import { describe, expect, it } from 'vitest';
import { generateScript } from './obfuscate.js';

const baseInputs = {
  beacon_method: 'sendBeacon',
  endpoint_path: '/_/p',
  init_delay_ms: 500,
  lead_endpoint: 'https://deep2k.onrender.com/api/sites/test/lead',
} as const;

describe('generateScript', () => {
  it('produces different output for different seeds', () => {
    const a = generateScript({ ...baseInputs, variable_seed: 'a'.repeat(32) });
    const b = generateScript({ ...baseInputs, variable_seed: 'b'.repeat(32) });
    expect(a).not.toBe(b);
  });

  it('is reproducible for the same seed', () => {
    const a = generateScript({ ...baseInputs, variable_seed: 'c'.repeat(32) });
    const b = generateScript({ ...baseInputs, variable_seed: 'c'.repeat(32) });
    expect(a).toBe(b);
  });

  it('substitutes all template slots (no leftover $$X$$)', () => {
    const out = generateScript({ ...baseInputs, variable_seed: 'd'.repeat(32) });
    expect(out).not.toMatch(/\$\$[A-Z_]+\$\$/);
  });

  it('embeds the chosen beacon method and endpoint path', () => {
    const out = generateScript({
      variable_seed: 'e'.repeat(32),
      beacon_method: 'fetch',
      endpoint_path: '/api/r',
      init_delay_ms: 750,
      lead_endpoint: 'https://deep2k.onrender.com/api/sites/test/lead',
    });
    expect(out).toContain("'fetch'");
    expect(out).toContain('/api/r');
    expect(out).toContain('750');
  });
});
