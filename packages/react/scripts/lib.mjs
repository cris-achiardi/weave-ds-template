/**
 * Shared plumbing for the contract tooling: locating things, reading config, deterministic
 * sorting, and the one merge that turns "source" + "contract" into "what is this component".
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
export const COMPONENTS_DIR = join(PKG_ROOT, 'src/components');
export const BARREL = join(PKG_ROOT, 'src/index.ts');

/** Fixed code-point comparator. Never localeCompare — it makes generated output machine-dependent. */
export const byCodePoint = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

export function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

/** /ds.config.json — the single source of truth for prefixes. Never hard-code them. */
export function dsConfig() {
  return readJson(join(REPO_ROOT, 'ds.config.json'));
}

/**
 * Every component directory, sorted. A directory counts as a component when it holds
 * `<Name>.tsx`; a contract is optional, and its absence is a reportable state, never a failure.
 */
export function listComponents() {
  if (!existsSync(COMPONENTS_DIR)) return [];
  return readdirSync(COMPONENTS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((name) => existsSync(join(COMPONENTS_DIR, name, `${name}.tsx`)))
    .sort(byCodePoint);
}

export function componentPaths(name) {
  const dir = join(COMPONENTS_DIR, name);
  return {
    dir,
    tsx: join(dir, `${name}.tsx`),
    css: join(dir, `${name}.module.css`),
    contract: join(dir, `${name}.contract.json`),
    index: join(dir, 'index.ts'),
  };
}

/** Is the component re-exported from the public barrel? An unexported component is invisible. */
export function isExported(name) {
  if (!existsSync(BARREL)) return false;
  const src = readFileSync(BARREL, 'utf8');
  return new RegExp(`\\b${name}\\b`).test(src.replace(/^\s*\/\/.*$/gm, ''));
}

/**
 * Merge the derived half (read from source) with the authored half (the contract) into the
 * answer to "what is this component".
 *
 * The rule that keeps this honest: anything derivable is composed HERE at read time and is never
 * committed. A contract restating a prop, a value set or a default is a defect, not redundancy —
 * see docs/ADR/0001 §3.
 */
export function compose({ name, props, cvaAxes, parts, contract, warnings, degraded }) {
  const merged = {};

  for (const [prop, info] of Object.entries(props)) {
    const axis = cvaAxes[prop];
    merged[prop] = {
      type: info.type,
      // cva is the AUTHORITY for a variant axis: it is the only source that has the default,
      // and it is the only one that does not change behaviour with the TypeScript version.
      values: axis?.values ?? info.values,
      default: axis?.default ?? info.default,
      required: info.required,
      description: info.description,
      ...(info.acceptsNode ? { acceptsNode: true } : {}),
      ...(axis ? { source: 'cva' } : {}),
    };
  }

  // A cva axis with no matching prop means VariantProps was not spread into the props type —
  // the variant exists in the stylesheet but no consumer can reach it.
  const unreachable = Object.keys(cvaAxes)
    .filter((a) => !(a in props))
    .sort(byCodePoint);

  return {
    component: name,
    _doc:
      'Composed at read time from the component source (derivable half) and its contract ' +
      '(authored half). Not committed anywhere. Regenerate with `pnpm contract ' +
      name +
      '`.',
    status: contract?.status ?? null,
    semantics: contract?.semantics ?? null,
    a11y: contract?.a11y ?? null,
    composition: contract?.composition ?? null,
    anatomy: contract?.anatomy ?? null,
    props: merged,
    rendered: parts,
    contracted: Boolean(contract),
    extraction: {
      propsResolved: Object.keys(merged).length,
      degraded: Boolean(degraded),
      warnings: [
        ...warnings,
        ...unreachable.map(
          (a) =>
            `${a}: declared as a cva variant but not exposed as a prop — add VariantProps<typeof ...> to the props type, or the variant is unreachable.`,
        ),
      ].sort(byCodePoint),
    },
  };
}

/** Walk an anatomy tree, yielding [keyPath, node] for every node including the root. */
export function* walkAnatomy(node, path = ['root']) {
  if (!node) return;
  yield [path.join('.'), node];
  for (const key of Object.keys(node.parts ?? {}).sort(byCodePoint)) {
    yield* walkAnatomy(node.parts[key], [...path, key]);
  }
}
