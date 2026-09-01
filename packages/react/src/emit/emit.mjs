#!/usr/bin/env node
// SPIKE. Deliberately minimal, deliberately incomplete, and not wired into any gate.
//
// It exists to answer ONE question that no amount of contract-writing can: is a contract sufficient
// to generate a working component from? Everything it cannot derive from the contract, it records in
// EMITTER_ASSUMPTIONS rather than quietly deciding — that list is the actual output of this spike,
// and docs/research/0002 reports it.
//
//   node packages/react/src/emit/emit.mjs <Name> --out <dir>
//
// v2. The first version was Switch-shaped: it hardcoded button attributes, a click-to-toggle
// handler and `aria-checked` on every component it touched, which produced a Field that referenced
// an undeclared variable and put `type="button"` on a div. What follows is the same probe with
// those assumptions moved out of the templates and into either the binding, the contract, or a
// logged assumption. It is still not the emitter.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv/dist/2020.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '../../../..');
const CONTRACTS = join(REPO_ROOT, 'packages/contracts');
const BINDINGS = join(REPO_ROOT, 'packages/react/bindings');

// Roles whose state is toggled by activating the element itself. Outside this list the emitter
// does NOT wire an event, because nothing in a contract says what causes a state to change.
const TOGGLE_ROLES = new Set(['switch', 'checkbox']);

// Which DOM attribute carries a state. Not stated in any contract — see the logged assumption.
const NATIVE_ATTR = { disabled: 'disabled' };
const ARIA_ATTR = {
  checked: 'aria-checked',
  'read-only': 'aria-readonly',
  invalid: 'aria-invalid',
  open: 'aria-expanded',
  disabled: 'aria-disabled',
};
const NATIVE_PSEUDO = {
  hover: ':hover',
  'focus-visible': ':focus-visible',
  disabled: ':disabled',
  active: ':active',
};

// React's typing for a given intrinsic element. Another thing no contract states.
const ATTR_TYPE = {
  button: ['ButtonHTMLAttributes', 'HTMLButtonElement'],
  input: ['InputHTMLAttributes', 'HTMLInputElement'],
  label: ['LabelHTMLAttributes', 'HTMLLabelElement'],
  a: ['AnchorHTMLAttributes', 'HTMLAnchorElement'],
};
const attrTypeFor = (el) => ATTR_TYPE[el] ?? ['HTMLAttributes', 'HTMLDivElement'];

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
// states -> the public prop surface, per ADR 0004's controlRules
// slots  -> content props
// ---------------------------------------------------------------------------------------
function surfaceFrom(contract) {
  const props = [];

  for (const [state, def] of Object.entries(contract.states ?? {})) {
    const n = camel(state);
    if (def.control === 'shared') {
      props.push(
        { name: n, type: 'boolean', from: state, role: 'controlled' },
        { name: `default${pascal(state)}`, type: 'boolean', from: state, role: 'uncontrolled' },
        {
          name: `on${pascal(state)}Change`,
          type: `(${n}: boolean) => void`,
          from: state,
          role: 'callback',
        },
      );
    } else if (def.control === 'consumer') {
      props.push({ name: n, type: 'boolean', from: state, role: 'input' });
    }
    // `internal` emits nothing. That is the whole point of the value.
  }

  // A named slot becomes a content prop. ADR 0004 covers states only; this is the obvious
  // analogue and is NOT recorded anywhere, which is itself worth reporting.
  for (const [slot, def] of Object.entries(contract.composition?.slots ?? {})) {
    props.push({
      name: camel(slot),
      type: 'ReactNode',
      from: slot,
      role: 'slot',
      required: def.required === true,
      description: def.description,
    });
  }

  return props;
}

function partsOf(node, out = [], key = 'root') {
  out.push({ key, part: node.part, node });
  for (const [k, child] of Object.entries(node.parts ?? {})) partsOf(child, out, k);
  return out;
}

// ---------------------------------------------------------------------------------------
// TSX
// ---------------------------------------------------------------------------------------
function emitTsx(name, contract, binding, prefix) {
  const props = surfaceFrom(contract);
  const root = contract.anatomy.root;
  const el = binding.element;
  const [attrType, elType] = attrTypeFor(el);
  const role = contract.semantics?.role;

  const shared = props.filter((p) => p.role === 'controlled');
  const slots = props.filter((p) => p.role === 'slot');
  const takesChildren = (contract.composition?.children?.max ?? 1) !== 0;

  // ---- can this component's state be driven by activating it?
  const toggles = shared.length > 0 && role && TOGGLE_ROLES.has(role);
  const primary = toggles ? shared[0] : null;

  assume(
    'how a state reaches the DOM',
    'ARIA attribute where one is conventional, native attribute for disabled, otherwise data-<prefix>-state',
    'The contract declares that a state exists and who may set it, never how it is exposed. Two backends will diverge here, and a consumer styling [aria-checked] against one will find the other using a data attribute.',
  );

  if (shared.length > 0 && !toggles) {
    assume(
      'what changes a shared state',
      `no event wired — ${shared.map((s) => s.name).join(', ')} ${shared.length > 1 ? 'are' : 'is'} exposed as storage only`,
      `Nothing in a contract says what CAUSES a state to change. It is stated in intent.behaviour as prose, which no tool reads. The emitter only wires activation for roles it knows are self-toggling (${[...TOGGLE_ROLES].join(', ')}); for anything else the generated component holds the state and never sets it.`,
    );
  }
  if (shared.length > 1) {
    assume(
      'multiple shared states',
      'each gets its own independent controlled/uncontrolled storage',
      'Nothing says whether two shared states are independent or related. It works in React; Vue allows one primary v-model, so this is the case most likely to break the rule in ADR 0004.',
    );
  }
  if (slots.length > 0) {
    assume(
      'slots as props',
      'each named slot becomes a ReactNode prop rendered into the anatomy part of the same name',
      'ADR 0004 defines how STATES become props and says nothing about slots. This mapping is the obvious analogue and is recorded nowhere, so a second backend would invent its own.',
    );
  }

  const s = [];
  s.push(`// GENERATED from ${name}.contract.json + ${name}.react.json. Do not edit by hand.`);
  s.push(`// Regenerate: node packages/react/src/emit/emit.mjs ${name} --out <dir>`);
  s.push(`//`);
  s.push(`// ${contract.intent.purpose.replace(/\s+/g, ' ')}`);
  s.push(``);

  const hooks = ['forwardRef'];
  if (primary) hooks.push('useCallback', 'useState');
  else if (shared.length) hooks.push('useState');
  s.push(`import { ${hooks.join(', ')} } from 'react';`);
  const types = [attrType];
  if (slots.length) types.push('ReactNode');
  s.push(`import type { ${types.join(', ')} } from 'react';`);
  s.push(`import './${name}.structure.css';`);
  s.push(`import './${name}.theme.css';`);
  s.push(``);

  const owned = props.map((p) => p.name);
  s.push(
    `export interface ${name}Props extends Omit<${attrType}<${elType}>, ${owned.map((n) => `'${n}'`).join(' | ')}> {`,
  );
  for (const p of props) {
    const src = contract.states?.[p.from];
    if (p.role === 'controlled') s.push(`  /** ${src.description} Controlled. */`);
    if (p.role === 'uncontrolled') s.push(`  /** Initial value when uncontrolled. */`);
    if (p.role === 'callback') s.push(`  /** Called when it changes, controlled or not. */`);
    if (p.role === 'input') s.push(`  /** ${src.description} */`);
    if (p.role === 'slot') s.push(`  /** ${p.description ?? 'Slot content.'} */`);
    s.push(`  ${p.name}${p.required ? '' : '?'}: ${p.type};`);
  }
  s.push(`}`);
  s.push(``);

  const destructured = [
    ...props.map((p) => (p.role === 'uncontrolled' ? `${p.name} = false` : p.name)),
    ...(takesChildren ? ['children'] : []),
    'className',
    '...rest',
  ];

  s.push(`export const ${name} = forwardRef<${elType}, ${name}Props>(function ${name}(`);
  s.push(`  { ${destructured.join(', ')} },`);
  s.push(`  ref,`);
  s.push(`) {`);

  for (const sh of shared) {
    const st = sh.from;
    const v = camel(st);
    s.push(`  const ${v}Controlled = ${sh.name} !== undefined;`);
    s.push(`  const [${v}Internal, set${pascal(st)}Internal] = useState(default${pascal(st)});`);
    s.push(`  const ${v}Value = ${v}Controlled ? ${sh.name} : ${v}Internal;`);
    if (!primary || primary.from !== st) {
      s.push(
        `  // The contract declares \`${st}\` as control: shared, so a consumer may set it — but`,
      );
      s.push(
        `  // nothing in the contract says what CHANGES it, so this setter is unreachable and the`,
      );
      s.push(
        `  // uncontrolled form of this state can never move. Pass \`${sh.name}\` to control it.`,
      );
      s.push(`  void set${pascal(st)}Internal;`);
    }
  }
  if (shared.length) s.push(``);

  if (primary) {
    const st = primary.from;
    const v = camel(st);
    const guards = props
      .filter((p) => p.role === 'input' && ['disabled', 'readOnly'].includes(p.name))
      .map((p) => p.name);
    s.push(`  const activate = useCallback(() => {`);
    if (guards.length) s.push(`    if (${guards.join(' || ')}) return;`);
    s.push(`    const next = !${v}Value;`);
    s.push(`    if (!${v}Controlled) set${pascal(st)}Internal(next);`);
    s.push(`    on${pascal(st)}Change?.(next);`);
    s.push(
      `  }, [${v}Controlled, ${v}Value, on${pascal(st)}Change${guards.length ? ', ' + guards.join(', ') : ''}]);`,
    );
    s.push(``);
  }

  s.push(`  return (`);
  s.push(`    <${el}`);
  s.push(`      {...rest}`);
  s.push(`      ref={ref}`);
  if (el === 'button') s.push(`      type="button"`);
  if (role) s.push(`      role="${role}"`);

  // state -> attribute, only for states this component actually declares
  for (const [st, def] of Object.entries(contract.states ?? {})) {
    const v = camel(st);
    const isShared = shared.some((x) => x.from === st);
    const isConsumer = props.some((p) => p.role === 'input' && p.from === st);
    if (!isShared && !isConsumer) continue;
    const expr = isShared ? `${v}Value` : v;
    if (NATIVE_ATTR[st] && el === 'button') {
      s.push(`      ${NATIVE_ATTR[st]}={${expr}}`);
    } else if (ARIA_ATTR[st]) {
      s.push(`      ${ARIA_ATTR[st]}={${expr} || undefined}`);
    } else {
      s.push(`      data-${prefix}-state-${st}={${expr} || undefined}`);
    }
  }
  if (primary) s.push(`      onClick={activate}`);
  s.push(`      data-${prefix}-component="${name}"`);
  s.push(`      data-${prefix}-part="${root.part}"`);
  s.push(`      className={className}`);
  s.push(`    >`);

  const childParts = Object.entries(root.parts ?? {});
  for (const [key, node] of childParts) {
    const slot = slots.find((x) => camel(x.from) === key);
    if (slot) {
      s.push(`      <span data-${prefix}-part="${node.part}">{${slot.name}}</span>`);
    } else {
      s.push(`      <span data-${prefix}-part="${node.part}" />`);
    }
  }
  // Slots with no matching anatomy part still have to go somewhere.
  const orphaned = slots.filter((x) => !childParts.some(([k]) => k === camel(x.from)));
  if (orphaned.length) {
    assume(
      'slots with no anatomy part',
      `rendered bare, in declaration order: ${orphaned.map((o) => o.name).join(', ')}`,
      'The contract declares these slots but its anatomy names no part for them, so there is no described region to put them in and no way to style where they land.',
    );
    for (const o of orphaned) s.push(`      {${o.name}}`);
  }
  if (takesChildren) s.push(`      {children}`);
  s.push(`    </${el}>`);
  s.push(`  );`);
  s.push(`});`);
  s.push(``);
  return s.join('\n');
}

// ---------------------------------------------------------------------------------------
// structure.css
// ---------------------------------------------------------------------------------------
function emitStructure(name, contract, prefix) {
  const root = contract.anatomy.root;
  const kids = Object.values(root.parts ?? {});

  assume(
    'structural CSS',
    'NONE EMITTED — the emitter refuses to guess',
    "THE BIG ONE. The contract has no `layout` block, so there is nothing to derive from. v1 hardcoded a Switch's layout into the emitter; v2 tried to infer it from prose in `states.*.visual` and silently emitted `display: block`, which collapsed the Switch's thumb onto its track. Both are guesses, and a guess that renders is more dangerous than one that does not. So this file now carries only the scoping rule, and every component's real layout has to live in the CONSUMER's theme file — which is the wrong place, and is exactly the gap.",
  );
  assume(
    'scoping selector',
    `data-${prefix}-component="<Name>" on the root`,
    'Without CSS Modules there is no hashing, so [data-*-part="root"] would match every component on the page. Nothing in the contract system defines a component-level attribute; the emitter invented one.',
  );

  const L = [];
  L.push(`/* GENERATED from ${name}.contract.json. Do not edit by hand — regenerate instead. */`);
  L.push(`/*`);
  L.push(` * STRUCTURE ONLY — and there is almost none, on purpose.`);
  L.push(` *`);
  L.push(` * This file should hold the layout ${name}'s contract depends on: the positioning,`);
  L.push(
    ` * stacking and flow that make its stated behaviour true, with no colour or spacing in it.`,
  );
  L.push(` * It cannot, because the contract has no \`layout\` block and nothing in it describes`);
  L.push(` * where a part sits. The emitter will not guess: an inferred layout that renders is`);
  L.push(` * harder to catch than one that does not.`);
  L.push(` *`);
  L.push(` * So ${name}'s real layout currently lives in ${name}.theme.css — the CONSUMER's file,`);
  L.push(` * which is the wrong place for it. See docs/research/0002.`);
  L.push(` */`);
  L.push(``);
  L.push(`[data-${prefix}-component='${name}'] {`);
  L.push(`  /* the scoping handle. Everything else is yours, for now. */`);
  L.push(`}`);
  L.push(``);
  for (const node of kids) {
    L.push(`[data-${prefix}-component='${name}'] [data-${prefix}-part='${node.part}'] {`);
    L.push(`  /* no declared layout for this part */`);
    L.push(`}`);
    L.push(``);
  }
  return L.join('\n');
}

// ---------------------------------------------------------------------------------------
// theme.css — one commented socket per unbound channel
// ---------------------------------------------------------------------------------------
function stateSelector(base, state) {
  const isChild = base.includes('] [');
  const rootSel = isChild ? base.split('] [')[0] + ']' : base;
  const childSel = isChild ? '[' + base.split('] [')[1] : '';
  let on;
  if (NATIVE_PSEUDO[state]) on = NATIVE_PSEUDO[state];
  else if (ARIA_ATTR[state]) on = `[${ARIA_ATTR[state]}='true']`;
  else on = `[data-state~='${state}']`;
  return isChild ? `${rootSel}${on} ${childSel}` : `${base}${on}`;
}

function emitTheme(name, contract, prefix) {
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
        ? `[data-${prefix}-component='${name}']`
        : `[data-${prefix}-component='${name}'] [data-${prefix}-part='${p.node.part}']`;
    const channels = Object.keys(p.node.paints ?? {});
    if (channels.length) {
      L.push(`${sel} {`);
      for (const c of channels) L.push(`  /* ${c}: ; */`);
      L.push(`}`);
      L.push(``);
    }
    for (const [state, paints] of Object.entries(p.node.states ?? {})) {
      const def = contract.states?.[state];
      L.push(`/* state: ${state} — ${def?.visual ?? 'no visual recorded'} */`);
      L.push(`${stateSelector(sel, state)} {`);
      for (const c of Object.keys(paints)) L.push(`  /* ${c}: ; */`);
      L.push(`}`);
      L.push(``);
    }
  }
  return L.join('\n');
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
const prefix = readJson(join(REPO_ROOT, 'ds.config.json')).dataPrefix;

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, `${name}.tsx`), emitTsx(name, contract, binding, prefix), 'utf8');
writeFileSync(join(outDir, `${name}.structure.css`), emitStructure(name, contract, prefix), 'utf8');

const themePath = join(outDir, `${name}.theme.css`);
if (existsSync(themePath)) {
  console.log(`  kept   ${name}.theme.css (yours — never regenerated)`);
} else {
  writeFileSync(themePath, emitTheme(name, contract, prefix), 'utf8');
}
writeFileSync(
  join(outDir, 'index.ts'),
  `export { ${name}, type ${name}Props } from './${name}';\n`,
  'utf8',
);

const surface = surfaceFrom(contract);
console.log(`\nemitted ${name} -> ${outDir}`);
console.log(`  props: ${surface.map((p) => p.name).join(', ') || '(none)'}`);
console.log(`\n${EMITTER_ASSUMPTIONS.length} thing(s) the contract could not tell the emitter:\n`);
for (const a of EMITTER_ASSUMPTIONS) {
  console.log(`  ${a.topic}`);
  console.log(`      chose: ${a.decision}`);
  console.log(`      why:   ${a.why}\n`);
}
