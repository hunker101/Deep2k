import { createHash } from 'node:crypto';
import JavaScriptObfuscator from 'javascript-obfuscator';
import { TRACKER_TEMPLATE, TEMPLATE_VAR_SLOTS, type TemplateVarSlot } from './template.js';
import type { BeaconMethod } from '@deep2k/shared';

export interface ScriptInputs {
  variable_seed: string;
  beacon_method: BeaconMethod;
  endpoint_path: string;
  init_delay_ms: number;
  lead_endpoint: string;
}

// Produces JS identifier `_xxxx` deterministically from (seed, slot).
// Different seeds → different names; same seed → reproducible names.
function identifierFor(seed: string, slot: TemplateVarSlot): string {
  const h = createHash('sha256').update(`${seed}:${slot}`).digest('hex');
  return `_${h.slice(0, 6)}`;
}

// Convert the string seed to a 32-bit integer for the obfuscator's numeric seed.
function seedToInt(seed: string): number {
  const h = createHash('sha256').update(seed).digest('hex');
  return parseInt(h.slice(0, 8), 16);
}

export function generateScript(inputs: ScriptInputs): string {
  let out = TRACKER_TEMPLATE;

  // Step 1: per-site identifier substitution (ensures scripts differ across sites).
  for (const slot of TEMPLATE_VAR_SLOTS) {
    const name = identifierFor(inputs.variable_seed, slot);
    out = out.replaceAll(`$$${slot}$$`, name);
  }
  out = out.replaceAll('$$BEACON_METHOD$$', inputs.beacon_method);
  out = out.replaceAll('$$ENDPOINT_PATH$$', inputs.endpoint_path);
  out = out.replaceAll('$$INIT_DELAY$$', String(inputs.init_delay_ms));
  out = out.replaceAll('$$LEAD_ENDPOINT$$', inputs.lead_endpoint);

  // Step 2: AST-level obfuscation — string arrays, control-flow flattening,
  // dead-code injection. Seeded so regeneration of the same site is byte-stable.
  const result = JavaScriptObfuscator.obfuscate(out, {
    seed: seedToInt(inputs.variable_seed),
    stringArray: true,
    stringArrayEncoding: ['base64'],
    stringArrayThreshold: 0.8,
    stringArrayCallsTransform: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.75,
    deadCodeInjection: true,
    deadCodeInjectionThreshold: 0.2,
    numbersToExpressions: true,
    simplify: true,
    selfDefending: false,
    debugProtection: false,
    disableConsoleOutput: false,
    sourceMap: false,
  });

  return result.getObfuscatedCode();
}
