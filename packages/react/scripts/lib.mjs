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
    // The agnostic half — what the component IS, on any framework.
    contract: join(dir, `${name}.contract.json`),
    // The React half — what it becomes here. See contracts/README.md for the dividing line.
    binding: join(dir, `${name}.react.json`),
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
 * Merge the three descriptions of a component into one answer.
 *
 *   contract  — what it IS, on any framework          (authored, agnostic)
 *   binding   — what it becomes in React              (authored, framework-specific)
 *   source    — what the implementation actually does (derived, read on demand)
 *
 * None of the three is authoritative alone. The contract says what should be true, the source says
 * what is true, and where they overlap `verify:contract` asserts they agree (ADR 0002). Nothing
 * derived is ever committed — this runs at read time, which is why it works on a fresh clone with
 * no build.
 */
export function compose({ name, props, cvaAxes, parts, contract, binding, warnings, degraded }) {
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
      'Composed at read time from the agnostic contract, the React binding, and the ' +
      'implementation. Not committed anywhere. Regenerate with `pnpm contract ' +
      name +
      '`.',
    // --- what it IS (agnostic) ---
    status: contract?.status ?? null,
    intent: contract?.intent ?? null,
    states: contract?.states ?? null,
    axes: contract?.axes ?? null,
    semantics: contract?.semantics ?? null,
    a11y: contract?.a11y ?? null,
    composition: contract?.composition ?? null,
    anatomy: contract?.anatomy ?? null,
    // --- what it becomes in React ---
    react: binding
      ? {
          element: binding.element,
          elementByProp: binding.elementByProp ?? null,
          refTarget: binding.refTarget ?? null,
          classNamePassthrough: binding.classNamePassthrough ?? null,
          propOverrides: binding.propOverrides ?? null,
        }
      : null,
    // --- what the implementation actually does ---
    props: merged,
    rendered: parts,
    contracted: Boolean(contract),
    bound: Boolean(binding),
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
