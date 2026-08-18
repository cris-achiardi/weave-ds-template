#!/usr/bin/env node
/**
 * `pnpm verify:contract` — the contract gate.
 *
 * Enforces ADR 0001 + ADR 0002. Everything it checks is something whose breach produces NO build
 * error and NO failing test: a contract can promise an axis the code does not expose, name a part
 * that never renders, or style a state nothing can enter, and every other tool stays green.
 *
 * THE SHAPE OF THE CHECKING CHANGED IN ADR 0002.
 * The contract used to be forbidden from restating anything derivable. It now SPECIFIES the axes
 * and their values, because a file that omits them cannot be built from. Duplication is safe here
 * only because of what this script does: it asserts the two are equal. Remove these parity checks
 * and the contract silently becomes a stale second opinion.
 *
 * FAILS
 *   shape      contract or binding does not validate against its schema
 *   identity   name vs directory vs export vs barrel vs binding
 *   parity     contract and implementation disagree about axes, values or defaults
 *   invented   contract names a part / state / slot / axis value the implementation lacks
 *   phantom    contract declares a part the TSX never renders
 *   status     a `deprecated` level whose replacedBy does not exist
 *
 * REPORTS, NEVER FAILS
 *   a component with no contract          (ADR 0001 §5)
 *   a rendered part the contract omits
 *   extraction warnings
 *
 * That split is not softness: a gate that failed on every uncontracted component on day one would
 * be switched off within the week, and a switched-off gate protects nothing.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import Ajv from 'ajv/dist/2020.js';
import { extractProps } from './extract/props.mjs';
import { extractCvaAxes, flattenAxes } from './extract/cva.mjs';
import { extractParts, extractStyleKeys } from './extract/parts.mjs';
import {
  REPO_ROOT,
  listComponents,
  componentPaths,
  readJson,
  dsConfig,
  isExported,
  walkAnatomy,
  byCodePoint,
} from './lib.mjs';

/** Interaction states a platform provides. A contract may declare these as `intrinsic`. */
const INTRINSIC = [
  'active',
  'checked',
  'disabled',
  'focus',
  'focus-visible',
  'focus-within',
  'hover',
  'indeterminate',
  'invalid',
  'placeholder-shown',
  'read-only',
  'required',
  'valid',
  'visited',
];

const failures = [];
const reports = [];
const fail = (component, cls, detail) => failures.push({ component, cls, detail });
const report = (component, detail) => reports.push({ component, detail });

function main() {
  const cfg = dsConfig();
  const ajv = new Ajv({ allErrors: true, strict: false });

  // Compiling both schemas is itself a check, and the only one that can fail on day one with zero
  // components. A malformed schema would otherwise sit undetected until the first contract.
  let validateContract, validateBinding;
  try {
    validateContract = ajv.compile(readJson(join(REPO_ROOT, 'contracts/component.schema.json')));
    validateBinding = ajv.compile(readJson(join(REPO_ROOT, 'contracts/react-binding.schema.json')));
  } catch (err) {
    console.error(`a schema in contracts/ does not compile: ${err.message}`);
    process.exit(1);
  }

  const components = listComponents();
  for (const name of components) check(name, validateContract, validateBinding, cfg);

  const contracted = components.filter((n) => existsSync(componentPaths(n).contract));
  console.log(`contracts: ${contracted.length}/${components.length} components contracted.`);
  if (components.length === 0) {
    console.log('No components exist yet — the template’s intended starting state, not a gap.');
  }

  const uncontracted = components.filter((n) => !existsSync(componentPaths(n).contract));
  if (uncontracted.length)
    console.log(`\nUncontracted (reported, not failed): ${uncontracted.join(', ')}`);

  if (reports.length) {
    console.log('\nReports — not failures:');
    for (const r of reports.sort((a, b) =>
      byCodePoint(a.component + a.detail, b.component + b.detail),
    )) {
      console.log(`  ${r.component}: ${r.detail}`);
    }
  }

  if (failures.length) {
    console.error(`\n${failures.length} contract failure(s):\n`);
    for (const f of failures.sort((a, b) =>
      byCodePoint(a.component + a.cls, b.component + b.cls),
    )) {
      console.error(`  [${f.cls}] ${f.component}: ${f.detail}`);
    }
    process.exit(1);
  }

  console.log('\nverify:contract OK.');
}

function check(name, validateContract, validateBinding, cfg) {
  const paths = componentPaths(name);
  const source = readFileSync(paths.tsx, 'utf8');

  // --- identity (applies with or without a contract) -----------------------------------
  if (!new RegExp(`export\\s+(const|function|class)\\s+${name}\\b`).test(source)) {
    fail(name, 'identity', `${name}.tsx does not export a symbol named ${name}.`);
  }
  if (!isExported(name)) {
    fail(
      name,
      'identity',
      'not re-exported from src/index.ts — invisible to every consumer, and no compiler complains.',
    );
  }

  if (!existsSync(paths.contract)) return; // uncontracted: reported, never failed

  const contract = readJson(paths.contract);
  if (!validateContract(contract)) {
    for (const e of validateContract.errors ?? [])
      fail(name, 'shape', `contract ${e.instancePath || '/'} ${e.message}`);
    return; // a contract that does not validate cannot be reasoned about further
  }
  if (contract.component !== name) {
    fail(name, 'identity', `contract declares component "${contract.component}".`);
  }

  // --- the binding ---------------------------------------------------------------------
  let binding = null;
  if (existsSync(paths.binding)) {
    binding = readJson(paths.binding);
    if (!validateBinding(binding)) {
      for (const e of validateBinding.errors ?? [])
        fail(name, 'shape', `binding ${e.instancePath || '/'} ${e.message}`);
      binding = null;
    } else if (binding.component !== name) {
      fail(name, 'identity', `binding declares component "${binding.component}".`);
    }
  } else {
    report(
      name,
      `no ${name}.react.json — the React binding is undeclared (element, ref target, className target).`,
    );
  }

  // --- status ---------------------------------------------------------------------------
  if (contract.status.level === 'deprecated') {
    const target = contract.status.replacedBy;
    if (target && !existsSync(componentPaths(target).tsx)) {
      fail(name, 'status', `replacedBy names "${target}", which does not exist.`);
    }
  }

  // --- what the implementation actually says --------------------------------------------
  const { props } = extractProps(paths.tsx);
  const { axes: implAxes } = flattenAxes(extractCvaAxes(source, paths.tsx));
  const rendered = extractParts(source, cfg.dataPrefix);
  const styleKeys = extractStyleKeys(source);

  // --- PARITY: the heart of ADR 0002 ----------------------------------------------------
  //
  // The contract specifies the axes. The implementation expresses them. Neither is allowed to
  // be right on its own — they have to agree, and this is the only place that is checked.
  const declaredAxes = contract.axes ?? {};
  const renames = binding?.propOverrides ?? {};

  for (const axis of Object.keys(declaredAxes).sort(byCodePoint)) {
    const spec = declaredAxes[axis];
    const implName = renames[axis]?.prop ?? axis;
    const impl = implAxes[implName];

    if (!impl) {
      fail(
        name,
        'parity',
        `contract declares axis "${axis}"${implName !== axis ? ` (bound to prop "${implName}")` : ''}, but the implementation exposes no such variant axis.`,
      );
      continue;
    }

    const want = [...spec.values].sort(byCodePoint).join(' | ');
    const got = [...impl.values].sort(byCodePoint).join(' | ');
    if (want !== got) {
      fail(
        name,
        'parity',
        `axis "${axis}" — contract says [${want}], implementation says [${got}].`,
      );
    }

    const wantDefault = spec.default ?? null;
    if (wantDefault !== null && impl.default !== wantDefault) {
      fail(
        name,
        'parity',
        `axis "${axis}" — contract says the default is "${wantDefault}", implementation says ${impl.default === null ? 'there is none' : `"${impl.default}"`}.`,
      );
    }
  }

  for (const implName of Object.keys(implAxes).sort(byCodePoint)) {
    const declared = Object.keys(declaredAxes).some((a) => (renames[a]?.prop ?? a) === implName);
    if (!declared) {
      fail(
        name,
        'parity',
        `the implementation exposes variant axis "${implName}", which the contract does not declare.`,
      );
    }
  }

  // --- composition ----------------------------------------------------------------------
  for (const slot of Object.keys(contract.composition?.slots ?? {}).sort(byCodePoint)) {
    const p = props[slot];
    if (!p) fail(name, 'invented', `composition.slots names "${slot}", which is not a prop.`);
    else if (!p.acceptsNode)
      fail(
        name,
        'invented',
        `composition.slots names "${slot}", whose type is \`${p.type}\` and cannot hold rendered content.`,
      );
  }

  // --- states -----------------------------------------------------------------------------
  const declaredStates = contract.states ?? {};
  for (const state of Object.keys(declaredStates).sort(byCodePoint)) {
    const kind = declaredStates[state].kind;
    if (kind === 'intrinsic' && !INTRINSIC.includes(state)) {
      fail(
        name,
        'invented',
        `state "${state}" is declared intrinsic, but no platform provides it. An authored state has to be tracked by the implementation.`,
      );
    }
    if (
      kind === 'authored' &&
      !rendered.states.includes(state) &&
      props[state]?.type !== 'boolean'
    ) {
      fail(
        name,
        'invented',
        `state "${state}" is declared authored, but nothing sets data-${cfg.dataPrefix}-state="${state}" and there is no boolean prop of that name.`,
      );
    }
  }

  // --- anatomy ------------------------------------------------------------------------------
  const contractedParts = new Set();
  const anatomyKeys = new Set();

  for (const [path, node] of walkAnatomy(contract.anatomy.root)) {
    anatomyKeys.add(path.split('.').pop());
    contractedParts.add(node.part);

    if (!node.internalOnly && !rendered.parts.includes(node.part)) {
      fail(
        name,
        'phantom',
        `anatomy.${path} declares part "${node.part}", which ${name}.tsx never renders as data-${cfg.dataPrefix}-part.`,
      );
    }

    const key = node.part.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
    if (!node.internalOnly && !styleKeys.includes(key) && !styleKeys.includes(node.part)) {
      report(
        name,
        `part "${node.part}" has no matching styles.${key} — report:paints cannot resolve its token policy.`,
      );
    }

    for (const state of Object.keys(node.states ?? {}).sort(byCodePoint)) {
      if (!(state in declaredStates)) {
        fail(
          name,
          'invented',
          `anatomy.${path}.states styles "${state}", which the contract's top-level \`states\` does not declare.`,
        );
      }
    }

    for (const key2 of Object.keys(node.whenAxis ?? {}).sort(byCodePoint)) {
      const [axis, value] = key2.split('=');
      if (!(axis in declaredAxes)) {
        fail(
          name,
          'invented',
          `anatomy.${path}.whenAxis["${key2}"] names axis "${axis}", which the contract does not declare.`,
        );
        continue;
      }
      if (value !== undefined && !declaredAxes[axis].values.includes(value)) {
        fail(
          name,
          'invented',
          `anatomy.${path}.whenAxis["${key2}"] — "${value}" is not one of this component's ${axis} values (${declaredAxes[axis].values.join(' | ')}).`,
        );
      }
    }
  }

  for (const part of rendered.parts) {
    if (!contractedParts.has(part)) {
      report(
        name,
        `renders data-${cfg.dataPrefix}-part="${part}" but the contract does not document it.`,
      );
    }
  }

  // --- the binding points at real nodes -------------------------------------------------
  for (const field of ['refTarget', 'classNamePassthrough']) {
    const target = binding?.[field];
    if (target && !anatomyKeys.has(target)) {
      fail(
        name,
        'invented',
        `binding.${field} names "${target}", which is not a node in the contract's anatomy.`,
      );
    }
  }
}

main();
