import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BACKENDS } from './backends.mjs';
export { BACKENDS };
export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const byCodePoint = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
export const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
export const contractPaths = (name, backend = 'react') => ({
  contract: join(REPO_ROOT, 'packages/contracts/components', name, `${name}.contract.json`),
  binding: join(REPO_ROOT, 'packages', backend, 'bindings', `${name}.${backend}.json`),
});
export function listContracts() {
  return readdirSync(join(REPO_ROOT, 'packages/contracts/components'), { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(contractPaths(e.name).contract))
    .map((e) => e.name)
    .sort(byCodePoint);
}
export function* walkAnatomy(node, path = ['root']) {
  if (!node) return;
  yield [path.join('.'), node];
  for (const key of Object.keys(node.parts ?? {}).sort(byCodePoint))
    yield* walkAnatomy(node.parts[key], [...path, key]);
}
export const surfaces = Object.fromEntries(
  await Promise.all(
    BACKENDS.map(async (b) => [
      b.framework,
      (await import(`../packages/${b.framework}/src/emit/surface.mjs`)).surfaceFrom,
    ]),
  ),
);
export function surfaceFor(contract, backend) {
  if (!surfaces[backend]) throw new Error(`Unknown backend: ${backend}`);
  const prefix = readJson(join(REPO_ROOT, 'ds.config.json')).dataPrefix;
  return surfaces[backend](contract).map((entry) =>
    backend === 'wc' && entry.event ? { ...entry, event: `${prefix}-${entry.event}` } : entry,
  );
}
