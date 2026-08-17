#!/usr/bin/env node
/**
 * `pnpm verify:contract` — the contract gate.
 *
 * Enforces the mechanically decidable half of ADR 0001. Everything it checks is something whose
 * breach produces NO build error and NO failing test: a contract can name a part that does not
 * render, a state nothing can enter, or a prop value that was never an axis value, and every
 * other tool in this repo will stay green. That is exactly why this exists, and why it runs in
 * CI rather than only in `pnpm verify` — otherwise it is enforced on whichever machine happens
 * to run verify.
 *
 * FAILURE CLASSES
 *   1  shape          contract does not validate against contract.schema.json
 *   2  identity       component name vs directory vs export vs barrel
 *   3  invented       contract names a part / state / slot the source does not have
 *   4  status         a `deprecated` level whose replacedBy does not exist
 *   5  whenProp       names a prop that does not exist, or a value not in that prop's set
 *   6  phantom        contract declares a part the TSX never renders
 *
 * REPORTED, NEVER FAILED
 *   - a component with no contract              (ADR 0001 §5)
 *   - a rendered part the contract omits
 *   - extraction warnings
 *
 * That split is not softness. A gate that failed on every uncontracted component on day one
 * would be switched off within the week, and a switched-off gate protects nothing.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import Ajv from 'ajv/dist/2020.js';
import { extractProps } from './extract/props.mjs';
import { extractCvaAxes, flattenAxes } from './extract/cva.mjs';
import { extractParts, extractStyleKeys } from './extract/parts.mjs';
import {
  PKG_ROOT,
  listComponents,
  componentPaths,
  readJson,
  dsConfig,
  isExported,
  walkAnatomy,
  byCodePoint,
} from './lib.mjs';

/** Interaction states the browser owns. A contract may key `states` on any of these. */
const NATIVE_STATES = [
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
  const schemaPath = join(PKG_ROOT, 'contract.schema.json');

  // Compiling the schema is itself a check, and the ONLY one that can fail on day one with zero
  // components. A malformed schema would otherwise sit undetected until the first contract.
  let validate;
  try {
    const ajv = new Ajv({ allErrors: true, strict: false });
    validate = ajv.compile(readJson(schemaPath));
  } catch (err) {
    console.error(`contract.schema.json does not compile: ${err.message}`);
    process.exit(1);
  }

  const components = listComponents();

  for (const name of components) check(name, validate, cfg);

  // ---- output -------------------------------------------------------------------------
  const contracted = components.filter((n) => existsSync(componentPaths(n).contract));
  console.log(`contracts: ${contracted.length}/${components.length} components contracted.`);

  if (components.length === 0) {
    console.log('No components exist yet — the template’s intended starting state, not a gap.');
  }

  const uncontracted = components.filter((n) => !existsSync(componentPaths(n).contract));
  if (uncontracted.length) {
    console.log(`\nUncontracted (reported, not failed): ${uncontracted.join(', ')}`);
  }

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

function check(name, validate, cfg) {
  const paths = componentPaths(name);
  const source = readFileSync(paths.tsx, 'utf8');

  // --- 2 identity (applies with or without a contract) ---------------------------------
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

  if (!existsSync(paths.contract)) return; // uncontracted: reported above, never failed

  const contract = readJson(paths.contract);

  // --- 1 shape --------------------------------------------------------------------------
  if (!validate(contract)) {
    for (const e of validate.errors ?? []) {
      fail(name, 'shape', `${e.instancePath || '/'} ${e.message}`);
    }
    return; // a contract that does not validate cannot be reasoned about further
  }

  if (contract.component !== name) {
    fail(name, 'identity', `contract declares component "${contract.component}".`);
  }

  // --- 4 status -------------------------------------------------------------------------
  if (contract.status.level === 'deprecated') {
    const target = contract.status.replacedBy;
    if (target && !existsSync(componentPaths(target).tsx)) {
      fail(name, 'status', `replacedBy names "${target}", which does not exist.`);
    }
  }

  // --- derive the source-side truth -----------------------------------------------------
  const { props } = extractProps(paths.tsx);
  const { axes } = flattenAxes(extractCvaAxes(source, paths.tsx));
  const rendered = extractParts(source, cfg.dataPrefix);
  const styleKeys = extractStyleKeys(source);

  const valuesOf = (prop) => axes[prop]?.values ?? props[prop]?.values ?? null;

  // --- 3 invented: slots ----------------------------------------------------------------
  for (const slot of Object.keys(contract.composition?.slots ?? {}).sort(byCodePoint)) {
    const p = props[slot];
    if (!p) {
      fail(name, 'invented', `composition.slots names "${slot}", which is not a prop.`);
    } else if (!p.acceptsNode) {
      fail(
        name,
        'invented',
        `composition.slots names "${slot}", whose type is \`${p.type}\` and cannot hold rendered content.`,
      );
    }
  }

  // --- 6 phantom parts, 3 invented states, 5 whenProp -----------------------------------
  const contractedParts = new Set();

  for (const [path, node] of walkAnatomy(contract.anatomy.root)) {
    if (node.part) {
      contractedParts.add(node.part);
      if (!rendered.parts.includes(node.part)) {
        fail(
          name,
          'phantom',
          `anatomy.${path} declares part "${node.part}", which ${name}.tsx never renders as data-${cfg.dataPrefix}-part.`,
        );
      }
      // The invariant that makes report:paints possible at all.
      const key = node.part.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
      if (!styleKeys.includes(key) && !styleKeys.includes(node.part) && !node.internalOnly) {
        report(
          name,
          `part "${node.part}" has no matching styles.${key} — report:paints cannot resolve its token policy.`,
        );
      }
    } else if (!node.internalOnly) {
      fail(name, 'shape', `anatomy.${path} has no \`part\` and is not marked internalOnly.`);
    }

    for (const state of Object.keys(node.states ?? {}).sort(byCodePoint)) {
      const known =
        NATIVE_STATES.includes(state) ||
        rendered.states.includes(state) ||
        axes[state] !== undefined ||
        props[state]?.type === 'boolean';
      if (!known) {
        fail(
          name,
          'invented',
          `anatomy.${path}.states declares "${state}", which is not a native pseudo-class, not a data-${cfg.dataPrefix}-state value, and not a boolean prop. Nothing can enter it.`,
        );
      }
    }

    for (const key of Object.keys(node.whenProp ?? {}).sort(byCodePoint)) {
      const [prop, value] = key.split('=');
      if (!(prop in props) && !(prop in axes)) {
        fail(
          name,
          'whenProp',
          `anatomy.${path}.whenProp["${key}"] names prop "${prop}", which does not exist.`,
        );
        continue;
      }
      if (value !== undefined) {
        const allowed = valuesOf(prop);
        if (allowed && !allowed.includes(value)) {
          fail(
            name,
            'whenProp',
            `anatomy.${path}.whenProp["${key}"] — "${value}" is not a value of ${prop} (${allowed.join(' | ')}).`,
          );
        }
      }
    }
  }

  // --- reported: rendered but undocumented ----------------------------------------------
  for (const part of rendered.parts) {
    if (!contractedParts.has(part)) {
      report(
        name,
        `renders data-${cfg.dataPrefix}-part="${part}" but the contract does not document it.`,
      );
    }
  }

  // --- reported: refTarget / classNamePassthrough point at real nodes --------------------
  const anatomyKeys = new Set(
    [...walkAnatomy(contract.anatomy.root)].map(([p]) => p.split('.').pop()),
  );
  for (const field of ['refTarget', 'classNamePassthrough']) {
    const target = contract.semantics?.[field];
    if (target && !anatomyKeys.has(target)) {
      fail(
        name,
        'invented',
        `semantics.${field} names "${target}", which is not a node in anatomy.`,
      );
    }
  }
}

main();
