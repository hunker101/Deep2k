import type { BeaconMethod } from '@deep2k/shared';
import {
  generateSecret,
  generateVariableSeed,
  generateEndpointPath,
  pickBeaconMethod,
  pickInitDelayMs,
  pickScriptPath,
} from './pools.js';

export interface NewSiteConfig {
  domain: string;
  secret: string;
  script_path: string;
  endpoint_path: string;
  beacon_method: BeaconMethod;
  init_delay_ms: number;
  variable_seed: string;
}

// Build a fresh randomized config for a new site. ID and backend_url are
// assigned by the persistence layer.
// Note: endpoint_path here is a candidate only — the API layer must check DB
// uniqueness and call generateEndpointPath() until a free path is found.
export function generateSiteConfig(domain: string): NewSiteConfig {
  return {
    domain,
    secret: generateSecret(),
    script_path: pickScriptPath(),
    endpoint_path: generateEndpointPath(),
    beacon_method: pickBeaconMethod(),
    init_delay_ms: pickInitDelayMs(),
    variable_seed: generateVariableSeed(),
  };
}

export { generateScript } from './obfuscate.js';
export type { ScriptInputs } from './obfuscate.js';
export { generateVariableSeed, pickBeaconMethod, pickInitDelayMs, generateEndpointPath } from './pools.js';
