/**
 * Shared plumbing for the contract tooling: locating things, reading config, deterministic
 * sorting, and React binding paths. Repository-wide readers live in scripts/.
 *
 * Everything here is deterministic by construction. Generated artifacts must be byte-stable for
 * a given input, so: fixed code-point comparators (never localeCompare), sorted directory reads
 * (never filesystem order), and nothing machine-specific in any output.
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

export const PKG_ROOT = resolve(here, '..');
export const REPO_ROOT = resolve(here, '../../..');

/** Where the agnostic contracts live, and where this backend's bindings for them live. */
export const CONTRACTS_DIR = join(REPO_ROOT, 'packages/contracts/components');
export const BINDINGS_DIR = join(PKG_ROOT, 'bindings');

/** Fixed code-point comparator. Never localeCompare — it makes generated output machine-dependent. */
export const byCodePoint = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

export function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

/** /ds.config.json — the single source of truth for prefixes. Never hard-code them. */
export function brandConfig() {
  return readJson(join(REPO_ROOT, 'ds.config.json'));
}

/**
 * Every CONTRACT, sorted. This is the population now.
 *
 * The contract is the population; generated source is not an independent specification.
 * When components were hand-written, they were the population and a contract was optional
 * annotation — so the question was "which components have contracts?". Components are now
 * GENERATED FROM contracts into a consumer's own repository, so the contract is the population
 * and the question is "which contracts can this backend compile?".
 *
 * Asking the old question of the new repo returns zero, which is true and useless: it was
 * reported as "no components exist yet — the intended starting state", while fifteen contracts
 * sat in the tree.
 */
export function listContracts() {
  if (!existsSync(CONTRACTS_DIR)) return [];
  return readdirSync(CONTRACTS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((name) => existsSync(join(CONTRACTS_DIR, name, `${name}.contract.json`)))
    .sort(byCodePoint);
}

/** Where a contract and this backend's binding for it live. Neither is assumed to exist. */
export function contractPaths(name) {
  return {
    dir: join(CONTRACTS_DIR, name),
    contract: join(CONTRACTS_DIR, name, `${name}.contract.json`),
    changelog: join(CONTRACTS_DIR, name, 'CHANGELOG.md'),
    binding: join(BINDINGS_DIR, `${name}.react.json`),
  };
}

/** Every binding this backend ships, sorted — so an orphan binding is findable. */
export function listBindings() {
  if (!existsSync(BINDINGS_DIR)) return [];
  return readdirSync(BINDINGS_DIR)
    .filter((f) => f.endsWith('.react.json'))
    .map((f) => f.replace(/\.react\.json$/, ''))
    .sort(byCodePoint);
}

/** Walk an anatomy tree, yielding [keyPath, node] for every node including the root. */
export function* walkAnatomy(node, path = ['root']) {
  if (!node) return;
  yield [path.join('.'), node];
  for (const key of Object.keys(node.parts ?? {}).sort(byCodePoint)) {
    yield* walkAnatomy(node.parts[key], [...path, key]);
  }
}
