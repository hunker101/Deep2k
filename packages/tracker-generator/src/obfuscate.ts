import { createHash } from 'node:crypto';
import { TRACKER_TEMPLATE, TEMPLATE_VAR_SLOTS, type TemplateVarSlot } from './template.js';
import type { BeaconMethod } from '@deep2k/shared';

export interface ScriptInputs {
  variable_seed: string;
  beacon_method: BeaconMethod;
  endpoint_path: string;
  init_delay_ms: number;
}

// Produces JS identifier `_xxxx` where xxxx are 4 hex chars deterministically
// derived from (seed, slot). Different seeds → different names; identical seeds
// (same site) → reproducible names so a regenerated script is byte-identical.
function identifierFor(seed: string, slot: TemplateVarSlot): string {
  const h = createHash('sha256').update(`${seed}:${slot}`).digest('hex');
  return `_${h.slice(0, 6)}`;
}

export function generateScript(inputs: ScriptInputs): string {
  let out = TRACKER_TEMPLATE;

  for (const slot of TEMPLATE_VAR_SLOTS) {
    const name = identifierFor(inputs.variable_seed, slot);
    out = out.replaceAll(`$$${slot}$$`, name);
  }

  out = out.replaceAll('$$BEACON_METHOD$$', inputs.beacon_method);
  out = out.replaceAll('$$ENDPOINT_PATH$$', inputs.endpoint_path);
  out = out.replaceAll('$$INIT_DELAY$$', String(inputs.init_delay_ms));

  return out;
}
