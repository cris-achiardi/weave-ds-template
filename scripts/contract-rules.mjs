#!/usr/bin/env node
/**
 * Contract rules the JSON Schema cannot express, checked over EVERY contract.
 *
 * The shared contract readers (`formFor`, `consumerNamedPart` in @ds/emit-web) throw on a contract
 * that is schema-valid but meaningless. Emitters call them, so a malformed contract fails the moment
 * something is generated from it — and not before. Without this gate a contract could carry, say,
 * `namedByConsumer` on a role-less part and pass `pnpm verify` and CI, because no component happened
 * to be emitted from it in that run.
 *
 * Gated through `pnpm verify:parity` (which runs in CI). Runnable on its own against any directory
 * laid out like `packages/contracts/components/` — `node scripts/contract-rules.mjs [dir]` — which is
 * what the regression test uses to feed it a malformed contract without touching the real ones.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { consumerNamedPart, formFor } from '../packages/emit-web/contract.mjs';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const DEFAULT_CONTRACTS_DIR = join(REPO_ROOT, 'packages/contracts/components');

const RULES = [
  ['form', formFor],
  ['namedByConsumer', consumerNamedPart],
];

/** One failure string per broken rule per contract, in code-point order of contract name. */
export function contractRuleFailures(componentsDir = DEFAULT_CONTRACTS_DIR) {
  const failures = [];
  const names = readdirSync(componentsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  for (const name of names) {
    const file = join(componentsDir, name, `${name}.contract.json`);
    if (!existsSync(file)) continue;
    const contract = JSON.parse(readFileSync(file, 'utf8'));
    for (const [rule, check] of RULES) {
      try {
        check(contract);
      } catch (error) {
        failures.push(`contract  ${name} [${rule}]: ${error.message}`);
      }
    }
  }
  return failures;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const dir = process.argv[2] ? resolve(process.argv[2]) : DEFAULT_CONTRACTS_DIR;
  const failures = contractRuleFailures(dir);
  if (failures.length) {
    console.error(`\ncontract-rules FAILED — ${failures.length} problem(s):\n`);
    for (const f of failures) console.error(`  ${f}`);
    process.exit(1);
  }
  console.log('contract-rules ok.');
}
