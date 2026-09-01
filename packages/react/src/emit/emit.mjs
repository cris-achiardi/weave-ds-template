#!/usr/bin/env node
// SPIKE. Deliberately minimal, deliberately incomplete, and not wired into any gate.
//
// It exists to answer ONE question that no amount of contract-writing can: is a contract sufficient
// to generate a working component from? Everything it cannot derive from the contract, it records in
// EMITTER_ASSUMPTIONS below rather than quietly deciding — that list is the actual output of this
// spike, and docs/research/0002 reports it.
//
//   node packages/react/src/emit/emit.mjs <Name> --out <dir>
//
// Handles exactly what Switch needs. It is not the emitter; it is the probe that tells us what the
// emitter will require.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv/dist/2020.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '../../../..');
const CONTRACTS = join(REPO_ROOT, 'packages/contracts');
const BINDINGS = join(REPO_ROOT, 'packages/react/bindings');

// ---------------------------------------------------------------------------------------
// Everything the emitter had to decide FOR ITSELF. Each one is a gap in the contract system,
// not a preference — a second backend would have to make the same call with nothing to guide it.
// ---------------------------------------------------------------------------------------
const EMITTER_ASSUMPTIONS = [];
const assume = (topic, decision, why) => EMITTER_ASSUMPTIONS.push({ topic, decision, why });

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
const camel = (s) => s.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
const pascal = (s) => {
  const c = camel(s);
  return c.charAt(0).toUpperCase() + c.slice(1);
};

// ---------------------------------------------------------------------------------------
// load + validate
// ---------------------------------------------------------------------------------------
function load(name) {
  const contractPath = join(CONTRACTS, 'components', name, `${name}.contract.json`);
  const bindingPath = join(BINDINGS, `${name}.react.json`);
  if (!existsSync(contractPath)) throw new Error(`no contract at ${contractPath}`);
  if (!existsSync(bindingPath)) throw new Error(`no binding at ${bindingPath}`);

  const contract = readJson(contractPath);
  const binding = readJson(bindingPath);
  const ajv = new Ajv({ allErrors: true, strict: false });

  const okContract = ajv.compile(readJson(join(CONTRACTS, 'schema/component.schema.json')));
  if (!okContract(contract)) {
    throw new Error(
      `contract is invalid:\n` +
        okContract.errors.map((e) => `  ${e.instancePath || '(root)'} ${e.message}`).join('\n'),
    );
  }
  const okBinding = ajv.compile(readJson(join(BINDINGS, 'binding.schema.json')));
  if (!okBinding(binding)) {
    throw new Error(
      `binding is invalid:\n` +
        okBinding.errors.map((e) => `  ${e.instancePath || '(root)'} ${e.message}`).join('\n'),
    );
  }
  // The gap ADR 0002 named: nothing else checks this pointer resolves.
  const target = resolve(BINDINGS, binding.contract);
  if (resolve(contractPath) !== target) {
    throw new Error(`binding.contract points at ${target}, not ${contractPath}`);
  }
  return { contract, binding };
}

// ---------------------------------------------------------------------------------------
// states -> the public prop surface, via prop-bindings.json controlRules
// ---------------------------------------------------------------------------------------
function surfaceFrom(contract) {
  const states = contract.states ?? {};
  const props = [];
  for (const [state, def] of Object.entries(states)) {
    const name = camel(state);
    if (def.control === 'shared') {
      props.push(
        { name, type: 'boolean', optional: true, from: state, role: 'controlled' },
        {
          name: `default${pascal(state)}`,
          type: 'boolean',
          optional: true,
          from: state,
          role: 'uncontrolled',
        },
        {
          name: `on${pascal(state)}Change`,
          type: `(${name}: boolean) => void`,
          optional: true,
          from: state,
          role: 'callback',
        },
      );
    } else if (def.control === 'consumer') {
      props.push({ name, type: 'boolean', optional: true, from: state, role: 'input' });
    }
    // `internal` emits nothing. That is the whole point of the value.
  }
  return props;
}

// ---------------------------------------------------------------------------------------
// anatomy -> a flat list of parts
// ---------------------------------------------------------------------------------------
function partsOf(node, out = [], key = 'root') {
  out.push({ key, part: node.part, node });
  for (const [k, child] of Object.entries(node.parts ?? {})) partsOf(child, out, k);
  return out;
}

// ---------------------------------------------------------------------------------------
// emit: TSX
// ---------------------------------------------------------------------------------------
function emitTsx(name, contract, binding, dataPrefix) {
  const props = surfaceFrom(contract);
  const parts = partsOf(contract.anatomy.root);
  const shared = props.filter((p) => p.role === 'controlled');
  const el = binding.element;

  if (shared.length > 1) {
    assume(
      'multiple shared states',
      'only the first is given controlled/uncontrolled machinery',
      'Nothing says how two independently controllable states interact, or whether a framework can even express two two-way bindings. Vue allows one primary v-model.',
    );
  }

  const role = contract.semantics?.role;
  if (!role) {
    assume(
      'semantics.role absent',
      'no role attribute emitted',
      'The contract may omit it, and the emitter cannot infer one.',
    );
  }

  // ---- state -> DOM attribute. NOT stated anywhere.
  assume(
    'how a state reaches the DOM',
    'ARIA attribute where one exists (aria-checked, aria-readonly), native attribute for disabled, otherwise data-<prefix>-state',
    'The contract declares that a state exists and who sets it, never how it is exposed. The binding says so in prose notes, which no tool reads. Two backends will diverge here.',
  );

  const s = [];
  s.push(`// GENERATED from ${name}.contract.json + ${name}.react.json. Do not edit by hand.`);
  s.push(`// Regenerate: node packages/react/src/emit/emit.mjs ${name} --out <dir>`);
  s.push(`//`);
  s.push(`// ${contract.intent.purpose.replace(/\n/g, ' ')}`);
  s.push(``);
  s.push(`import { forwardRef, useCallback, useState } from 'react';`);
  s.push(`import type { ButtonHTMLAttributes } from 'react';`);
  s.push(`import './${name}.structure.css';`);
  s.push(`import './${name}.theme.css';`);
  s.push(``);

  const own = props.map((p) => p.name);
  s.push(`export interface ${name}Props`);
  s.push(
    `  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, ${own.map((n) => `'${n}'`).join(' | ')}> {`,
  );
  for (const p of props) {
    const src = contract.states[p.from];
    if (p.role === 'controlled') s.push(`  /** ${src.description} Controlled. */`);
    if (p.role === 'uncontrolled') s.push(`  /** Initial value when uncontrolled. */`);
    if (p.role === 'callback') s.push(`  /** Called when it changes, controlled or not. */`);
    if (p.role === 'input') s.push(`  /** ${src.description} */`);
    s.push(`  ${p.name}?: ${p.type};`);
  }
  s.push(`}`);
  s.push(``);

  const primary = shared[0];
  const pn = primary?.name;
  const destructure = [
    ...props.map((p) => (p.role === 'uncontrolled' ? `${p.name} = false` : p.name)),
    'className',
    '...rest',
  ];

  s.push(`export const ${name} = forwardRef<HTMLButtonElement, ${name}Props>(function ${name}(`);
  s.push(`  { ${destructure.join(', ')} },`);
  s.push(`  ref,`);
  s.push(`) {`);
  if (primary) {
    s.push(`  const controlled = ${pn} !== undefined;`);
    s.push(`  const [internal, setInternal] = useState(default${pascal(primary.from)});`);
    s.push(`  const value = controlled ? ${pn} : internal;`);
    s.push(``);
    s.push(`  const toggle = useCallback(() => {`);
    s.push(`    if (disabled || readOnly) return;`);
    s.push(`    const next = !value;`);
    s.push(`    if (!controlled) setInternal(next);`);
    s.push(`    on${pascal(primary.from)}Change?.(next);`);
    s.push(`  }, [controlled, disabled, readOnly, value, on${pascal(primary.from)}Change]);`);
    s.push(``);
  }
  s.push(`  return (`);
  s.push(`    <${el}`);
  s.push(`      {...rest}`);
  s.push(`      ref={ref}`);
  s.push(`      type="button"`);
  if (role) s.push(`      role="${role}"`);
  if (primary) s.push(`      aria-checked={value}`);
  s.push(`      aria-readonly={readOnly || undefined}`);
  s.push(`      disabled={disabled}`);
  s.push(`      onClick={toggle}`);
  s.push(`      data-${dataPrefix}-component="${name}"`);
  s.push(`      data-${dataPrefix}-part="${parts[0].node.part}"`);
  s.push(`      className={className}`);
  s.push(`    >`);
  for (const p of parts.slice(1)) {
    s.push(`      <span data-${dataPrefix}-part="${p.node.part}" />`);
  }
  s.push(`    </${el}>`);
  s.push(`  );`);
  s.push(`});`);
  s.push(``);
  return s.join('\n');
}

// ---------------------------------------------------------------------------------------
// emit: structure.css  — the honest part of the spike
// ---------------------------------------------------------------------------------------
function emitStructure(name, contract, dataPrefix) {
  const parts = partsOf(contract.anatomy.root);
  assume(
    'structural CSS',
    'hand-written in the emitter, per component',
    "THE BIG ONE. The contract has no `layout` block, so nothing states that the thumb must be out of flow for its position to carry the state — which is a promise the contract makes in prose. The emitter cannot derive it and currently hardcodes it, which means the layout a contract depends on is not the contract's decision and no gate can check it.",
  );
  assume(
    'scoping selector',
    `data-${dataPrefix}-component="<Name>" on the root`,
    'Without CSS Modules there is no hashing, so [data-*-part="root"] would match every component in the page. Nothing in the contract system defines a component-level attribute; the emitter invented one.',
  );

  const L = [];
  L.push(`/* GENERATED from ${name}.contract.json. Do not edit by hand — regenerate instead. */`);
  L.push(`/*`);
  L.push(
    ` * STRUCTURE ONLY. No colour, no spacing scale, no type: those are yours, in ${name}.theme.css.`,
  );
  L.push(
    ` * What is here is layout the contract's stated behaviour depends on. Removing it makes the`,
  );
  L.push(
    ` * contract lie — the thumb's position is what carries the state for anyone who cannot rely`,
  );
  L.push(` * on colour, and that only works if the thumb is out of flow.`);
  L.push(` */`);
  L.push(``);
  L.push(`[data-${dataPrefix}-component='${name}'] {`);
  L.push(`  position: relative;`);
  L.push(`  display: inline-flex;`);
  L.push(`  align-items: center;`);
  L.push(`  flex-shrink: 0;`);
  L.push(`  cursor: pointer;`);
  L.push(`}`);
  L.push(``);
  L.push(`[data-${dataPrefix}-component='${name}']:disabled {`);
  L.push(`  cursor: not-allowed;`);
  L.push(`}`);
  L.push(``);
  for (const p of parts.slice(1)) {
    L.push(`[data-${dataPrefix}-component='${name}'] [data-${dataPrefix}-part='${p.node.part}'] {`);
    L.push(`  position: absolute;`);
    L.push(`  pointer-events: none;`);
    L.push(`}`);
    L.push(``);
  }
  return L.join('\n');
}

// ---------------------------------------------------------------------------------------
// emit: theme.css — one commented socket per unbound channel
// ---------------------------------------------------------------------------------------
function emitTheme(name, contract, dataPrefix) {
  const parts = partsOf(contract.anatomy.root);
  const L = [];
  L.push(`/*`);
  L.push(` * ${name} — YOUR FILE. Emitted once, never regenerated. Wire your tokens here.`);
  L.push(` *`);
  L.push(
    ` * Every channel below is declared in the contract with no source: the library says this`,
  );
  L.push(
    ` * part paints a background, and deliberately does not say from where. Uncomment and fill.`,
  );
  L.push(` */`);
  L.push(``);
  for (const p of parts) {
    const sel =
      p.key === 'root'
        ? `[data-${dataPrefix}-component='${name}']`
        : `[data-${dataPrefix}-component='${name}'] [data-${dataPrefix}-part='${p.node.part}']`;
    const channels = Object.keys(p.node.paints ?? {});
    if (channels.length) {
      L.push(`${sel} {`);
      for (const c of channels) L.push(`  /* ${c}: ; */`);
      L.push(`}`);
      L.push(``);
    }
    for (const [state, paints] of Object.entries(p.node.states ?? {})) {
      const def = contract.states?.[state];
      const selector = stateSelector(sel, state, def);
      L.push(`/* state: ${state} — ${def?.visual ?? 'no visual recorded'} */`);
      L.push(`${selector} {`);
      for (const c of Object.keys(paints)) L.push(`  /* ${c}: ; */`);
      L.push(`}`);
      L.push(``);
    }
  }
  return L.join('\n');
}

function stateSelector(base, state, def) {
  // Another undeclared mapping. See EMITTER_ASSUMPTIONS.
  const NATIVE = {
    hover: ':hover',
    'focus-visible': ':focus-visible',
    disabled: ':disabled',
    active: ':active',
  };
  const ARIA = { checked: '[aria-checked="true"]', 'read-only': '[aria-readonly="true"]' };
  if (base.includes('[data-') && base.includes('part')) {
    // A child part: the state lives on the root, so the selector has to reach back up.
    const root = base.split('] [')[0] + ']';
    const child = '[' + base.split('] [')[1];
    if (NATIVE[state]) return `${root}${NATIVE[state]} ${child}`;
    if (ARIA[state]) return `${root}${ARIA[state]} ${child}`;
    return `${root}[data-state~='${state}'] ${child}`;
  }
  if (NATIVE[state]) return `${base}${NATIVE[state]}`;
  if (ARIA[state]) return `${base}${ARIA[state]}`;
  return `${base}[data-state~='${state}']`;
}

// ---------------------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------------------
const name = process.argv[2];
const outIdx = process.argv.indexOf('--out');
if (!name || outIdx === -1) {
  console.error('usage: node emit.mjs <Name> --out <dir>');
  process.exit(1);
}
const outDir = resolve(process.cwd(), process.argv[outIdx + 1], name);

const { contract, binding } = load(name);
const dataPrefix = readJson(join(REPO_ROOT, 'ds.config.json')).dataPrefix;

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, `${name}.tsx`), emitTsx(name, contract, binding, dataPrefix), 'utf8');
writeFileSync(
  join(outDir, `${name}.structure.css`),
  emitStructure(name, contract, dataPrefix),
  'utf8',
);

const themePath = join(outDir, `${name}.theme.css`);
if (existsSync(themePath)) {
  console.log(`  kept   ${name}.theme.css (yours — never regenerated)`);
} else {
  writeFileSync(themePath, emitTheme(name, contract, dataPrefix), 'utf8');
}
writeFileSync(
  join(outDir, 'index.ts'),
  `export { ${name}, type ${name}Props } from './${name}';\n`,
  'utf8',
);

const surface = surfaceFrom(contract);
console.log(`\nemitted ${name} -> ${outDir}`);
console.log(`  props generated from states: ${surface.map((p) => p.name).join(', ') || '(none)'}`);
console.log(`\n${EMITTER_ASSUMPTIONS.length} thing(s) the contract could not tell the emitter:\n`);
for (const a of EMITTER_ASSUMPTIONS) {
  console.log(`  ${a.topic}`);
  console.log(`      chose: ${a.decision}`);
  console.log(`      why:   ${a.why}\n`);
}
