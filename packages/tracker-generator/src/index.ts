import type { BeaconMethod } from '@deep2k/shared';
import { generateScript } from './obfuscate.js';
import {
  generateSecret,
  generateVariableSeed,
  pickBeaconMethod,
  pickEndpointPath,
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
export function generateSiteConfig(domain: string): NewSiteConfig {
  return {
    domain,
    secret: generateSecret(),
    script_path: pickScriptPath(),
    endpoint_path: pickEndpointPath(),
    beacon_method: pickBeaconMethod(),
    init_delay_ms: pickInitDelayMs(),
    variable_seed: generateVariableSeed(),
  };
}

export { generateScript } from './obfuscate.js';
export type { ScriptInputs } from './obfuscate.js';
export { generateVariableSeed, pickBeaconMethod, pickInitDelayMs } from './pools.js';
