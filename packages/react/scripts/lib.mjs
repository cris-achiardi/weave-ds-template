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

/** Where the agnostic contracts live, and where this backend's bindings for them live. */
export const CONTRACTS_DIR = join(REPO_ROOT, 'packages/contracts/components');
export const BINDINGS_DIR = join(PKG_ROOT, 'bindings');

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
 * Every CONTRACT, sorted. This is the population now.
 *
 * The inversion matters and is the whole reason this function exists beside `listComponents`.
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

/**
 * Every HAND-WRITTEN component directory, sorted. A directory counts when it holds `<Name>.tsx`.
 *
 * This correctly returns nothing: `src/components/` no longer exists, because component source is
 * generated into a consumer's repository rather than authored here. Kept because the extraction
 * readers still work and a consumer's own repo is exactly where they apply.
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
 * Merge the descriptions of a component into one answer.
 *
 *   contract  — what it IS, on any framework      (authored, agnostic)
 *   binding   — what it becomes in React          (authored, framework-specific)
 *   surface   — the props the contract implies    (derived from the contract, at read time)
 *
 * THE THIRD ONE USED TO BE THE IMPLEMENTATION, and that is the change worth understanding. When
 * components were hand-written, this merged what the contract PROMISED with what the code DID, and
 * `verify:contract` asserted they agreed where they overlapped. Components are now generated from
 * the contract, so there is no independent second opinion to merge: the props here come from
 * `surfaceFrom`, the emitter's own function, which means this view and the generated component
 * cannot disagree.
 *
 * That is a real loss of safety, not a simplification, and it is recorded as one — see the note on
 * parity at the top of `verify-contract.mjs`.
 *
 * Nothing derived is ever committed; this runs at read time, so it works on a fresh clone with no
 * build.
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
      'Composed at read time from the agnostic contract, the React binding, and the prop ' +
      'surface DERIVED FROM THAT CONTRACT — not from any implementation, which is generated ' +
      'output and cannot serve as a second opinion. Not committed anywhere. Regenerate with `pnpm contract ' +
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
    // --- the props the contract implies, and the parts and states it declares ---
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
