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
// ARIA attributes whose FALSE value is meaningful and must be rendered rather than omitted.
// A switch that drops aria-checked when off is announced as having no on/off state at all.
const ARIA_EXPLICIT_FALSE = new Set(['checked']);

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

  // A collection's selection compiles exactly like a `shared` state, except its value is a set
  // of member identities rather than a boolean. Same three props, different type.
  const sel = contract.collection?.selection;
  if (sel && sel.control === 'shared') {
    const many = sel.cardinality === 'many';
    const t = many ? 'string[]' : 'string';
    props.push(
      { name: 'value', type: t, from: 'selection', role: 'controlled' },
      { name: 'defaultValue', type: t, from: 'selection', role: 'uncontrolled' },
      { name: 'onValueChange', type: `(value: ${t}) => void`, from: 'selection', role: 'callback' },
    );
  }

  // A member's identity is a required prop. It is not a state — nothing is IN it — so ADR 0004's
  // controlRules do not cover it, and this mapping is recorded nowhere.
  if (contract.member) {
    props.push({
      name: contract.member.identity,
      type: 'string',
      from: 'member',
      role: 'identity',
      required: true,
      description: `Distinguishes this ${contract.component} from its siblings. The ancestor ${contract.member.of} compares against it to decide whether this one is in the selection.`,
    });
  }

  // A named slot becomes a content prop. ADR 0004 covers states only; this is the obvious
  // analogue and is NOT recorded anywhere, which is itself worth reporting.
  for (const [slot, def] of Object.entries(contract.composition?.slots ?? {})) {
    props.push({
      name: camel(slot),
      type: 'ReactNode',
      from: slot,
      role: 'slot',
      part: def.part,
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

// Render one anatomy part and everything under it. Recursive, so a role or a relationship on a
// nested part lands where the contract put it rather than on the root.
function renderPart(key, node, ctx, depth) {
  const { prefix, slots, contract, idFor } = ctx;
  const pad = '  '.repeat(depth + 3);
  const slot = slots.find((x) => (x.part ? x.part === key : camel(x.from) === key));
  const attrs = [];

  const nodeEl = node.activates?.toggles ? 'button' : 'div';
  if (node.role && !(nodeEl === 'button' && node.role === 'button')) {
    attrs.push(`role="${node.role}"`);
  }
  if (node.role || node.controls || node.namedBy || (node.describedBy ?? []).length) {
    attrs.push(`id={${idFor(key)}}`);
  }
  if (node.controls) attrs.push(`aria-controls={${idFor(node.controls)}}`);
  if (node.namedBy) attrs.push(`aria-labelledby={${idFor(node.namedBy)}}`);
  if ((node.describedBy ?? []).length) {
    const live = node.describedBy.filter((d) => {
      const target = Object.entries(contract.anatomy.root.parts ?? {}).find(([k]) => k === d);
      return !target || !target[1].visibleWhen;
    });
    const conditional = node.describedBy.filter((d) => !live.includes(d));
    const pieces = [
      ...live.map((d) => idFor(d)),
      ...conditional.map((d) => {
        const st = Object.entries(contract.anatomy.root.parts ?? {}).find(([k]) => k === d)[1]
          .visibleWhen;
        return `(${stateExpr(st, ctx)} ? ${idFor(d)} : null)`;
      }),
    ];
    attrs.push(`aria-describedby={[${pieces.join(', ')}].filter(Boolean).join(' ') || undefined}`);
  }
  if (node.activates?.toggles) attrs.push(`onClick={activate}`);
  if (node.activates?.toggles && node.role === 'button') attrs.push(`type="button"`);
  if (node.visibleWhen) attrs.push(`hidden={!${stateExpr(node.visibleWhen, ctx)}}`);
  if (node.role === 'button') {
    const dis = ctx.disabledExpr;
    if (dis) attrs.push(`disabled={${dis}}`);
  }
  // aria-expanded belongs on whatever controls a part whose visibility is a state
  if (node.controls) {
    const target = Object.entries(contract.anatomy.root.parts ?? {}).find(
      ([k]) => k === node.controls,
    );
    if (target && target[1].visibleWhen) {
      attrs.push(`aria-expanded={${stateExpr(target[1].visibleWhen, ctx)}}`);
    }
  }
  attrs.push(`data-${prefix}-part="${node.part}"`);

  const el = nodeEl;
  const kids = Object.entries(node.parts ?? {});
  const open = `<${el} ${attrs.join(' ')}>`;
  const close = `</${el}>`;

  const out = [];
  if (!kids.length && !slot) {
    out.push(`${pad}<${el} ${attrs.join(' ')} />`);
    return out;
  }
  out.push(pad + open);
  if (slot) out.push(`${pad}  {${slot.name}}`);
  for (const [k, child] of kids) out.push(...renderPart(k, child, ctx, depth + 1));
  out.push(pad + close);
  return out;
}

// How a state name evaluates inside the generated component.
function stateExpr(state, ctx) {
  if (ctx.memberReflects === state) return 'selected';
  if (ctx.sharedStates.has(state)) return `${camel(state)}Value`;
  return camel(state);
}

// ---------------------------------------------------------------------------------------
// TSX
// ---------------------------------------------------------------------------------------
function emitTsx(name, contract, binding, prefix) {
  const props = surfaceFrom(contract);
  const root = contract.anatomy.root;
  const el = binding.element;
  const [attrType, elType] = attrTypeFor(el);
  const rootRole = root.role ?? contract.semantics?.role;

  const shared = props.filter((p) => p.role === 'controlled' && p.from !== 'selection');
  const slots = props.filter((p) => p.role === 'slot');
  const identity = props.find((p) => p.role === 'identity');
  const takesChildren = (contract.composition?.children?.max ?? 1) !== 0;

  const collection = contract.collection;
  const selShared = collection?.selection?.control === 'shared';
  const many = collection?.selection?.cardinality === 'many';
  const member = contract.member;

  // A member contract is NOT self-contained: whether its selection is a set or a single value
  // lives in the ancestor's contract, so the emitter has to open that file to compile this one.
  let memberMany = false;
  if (member) {
    const ancestorPath = join(CONTRACTS, 'components', member.of, `${member.of}.contract.json`);
    if (!existsSync(ancestorPath)) {
      throw new Error(
        `${name} declares member.of "${member.of}" but no contract exists at ${ancestorPath}`,
      );
    }
    const ancestor = readJson(ancestorPath);
    if (ancestor.collection?.items !== name) {
      throw new Error(
        `${name} says it is a member of ${member.of}, but ${member.of}.collection.items is ` +
          `"${ancestor.collection?.items ?? '(absent)'}" — the two contracts disagree.`,
      );
    }
    memberMany = ancestor.collection.selection.cardinality === 'many';
    assume(
      'a member contract is not self-contained',
      `read ${member.of}.contract.json to learn the selection is ${memberMany ? 'a set' : 'a single value'}`,
      'Cardinality lives on the ancestor, so this component cannot be compiled from its own contract alone. Nothing in the repo checks that the two contracts agree; the emitter now does, and it is the only thing that does.',
    );
  }

  const sharedStates = new Set(shared.map((s) => s.from));
  const consumerProps = props.filter((p) => p.role === 'input');
  const disabledExpr = consumerProps.some((p) => p.name === 'disabled')
    ? member
      ? 'disabled || ctx.disabled'
      : 'disabled'
    : null;

  // Which part, if any, activates something.
  const allParts = partsOf(root);
  const activator = allParts.find((p) => p.node.activates?.toggles);
  const rootToggles = root.activates?.toggles;

  assume(
    'how a state reaches the DOM',
    'ARIA attribute where one is conventional, native attribute for disabled, otherwise data-<prefix>-state',
    'The contract declares that a state exists and who may set it, never how it is exposed. Two backends will diverge here.',
  );
  if (shared.length && !rootToggles && !activator) {
    assume(
      'what changes a shared state',
      `no event wired — ${shared.map((s) => s.name).join(', ')} exposed as storage only`,
      'No part declares `activates`, and nothing else in the contract says what causes these to change.',
    );
  }
  if (member) {
    assume(
      'how a member reaches its collection',
      'React context, imported from the ancestor component module',
      'The contract says this component is a member of an ancestor collection; it does not and should not say HOW. React uses context; Vue would use provide/inject; a web component would need a registration protocol. Each backend picks, and the emitted import path is this backend invention.',
    );
  }

  const idFor = (key) => (key === 'root' ? 'baseId' : '`${baseId}-' + key + '`');
  const needsIds =
    Boolean(collection) ||
    allParts.some(
      (p) => p.node.role || p.node.controls || p.node.namedBy || (p.node.describedBy ?? []).length,
    );

  const ctx = {
    prefix,
    slots,
    contract,
    idFor,
    memberReflects: member?.reflects,
    sharedStates,
    disabledExpr,
  };

  const s = [];
  s.push(`// GENERATED from ${name}.contract.json + ${name}.react.json. Do not edit by hand.`);
  s.push(`// Regenerate: node packages/react/src/emit/emit.mjs ${name} --out <dir>`);
  s.push(`//`);
  s.push(`// ${contract.intent.purpose.replace(/\s+/g, ' ')}`);
  s.push(``);

  const hooks = ['forwardRef'];
  if (needsIds && !member) hooks.push('useId');
  if (shared.length || selShared) hooks.push('useState');
  if (rootToggles || activator || collection) hooks.push('useCallback');
  if (collection) hooks.push('createContext', 'useMemo');
  if (member) hooks.push('useContext');
  s.push(`import { ${[...new Set(hooks)].join(', ')} } from 'react';`);
  const types = [attrType];
  if (slots.length) types.push('ReactNode');
  s.push(`import type { ${types.join(', ')} } from 'react';`);
  if (member) {
    s.push(`import { ${member.of}Context } from '../${member.of}/${member.of}';`);
  }
  s.push(`import './${name}.structure.css';`);
  s.push(`import './${name}.theme.css';`);
  s.push(``);

  // ---- the context a collection publishes to its members
  if (collection) {
    const t = many ? 'string[]' : 'string';
    s.push(`export interface ${name}ContextValue {`);
    s.push(`  /** The current selection, by member ${collection.identity}. */`);
    s.push(`  selection: ${t};`);
    s.push(`  /** Called by a member when it is activated. */`);
    s.push(`  toggle: (${collection.identity}: string) => void;`);
    s.push(`  /** Shared id root, so a member's parts can reference one another. */`);
    s.push(`  baseId: string;`);
    s.push(`  /** True when the whole collection is disabled. */`);
    s.push(`  disabled: boolean;`);
    s.push(`}`);
    s.push(``);
    s.push(`export const ${name}Context = createContext<${name}ContextValue | null>(null);`);
    s.push(``);
  }

  const owned = props.map((p) => p.name);
  s.push(
    `export interface ${name}Props extends Omit<${attrType}<${elType}>, ${owned.map((n) => `'${n}'`).join(' | ')}> {`,
  );
  for (const p of props) {
    const src = contract.states?.[p.from];
    if (p.role === 'controlled')
      s.push(
        `  /** ${p.from === 'selection' ? 'The current selection. Controlled.' : src.description + ' Controlled.'} */`,
      );
    if (p.role === 'uncontrolled') s.push(`  /** Initial value when uncontrolled. */`);
    if (p.role === 'callback') s.push(`  /** Called when it changes, controlled or not. */`);
    if (p.role === 'input') s.push(`  /** ${src.description} */`);
    if (p.role === 'identity' || p.role === 'slot')
      s.push(`  /** ${p.description ?? 'Slot content.'} */`);
    s.push(`  ${p.name}${p.required ? '' : '?'}: ${p.type};`);
  }
  s.push(`}`);
  s.push(``);

  const destructured = [
    ...props.map((p) =>
      p.role === 'uncontrolled'
        ? p.from === 'selection'
          ? `${p.name} = ${many ? '[]' : "''"}`
          : `${p.name} = false`
        : p.name,
    ),
    ...(takesChildren ? ['children'] : []),
    'className',
    '...rest',
  ];

  s.push(`export const ${name} = forwardRef<${elType}, ${name}Props>(function ${name}(`);
  s.push(`  { ${destructured.join(', ')} },`);
  s.push(`  ref,`);
  s.push(`) {`);

  // ---- member: read the ancestor's selection
  if (member) {
    s.push(`  const ctx = useContext(${member.of}Context);`);
    s.push(`  if (!ctx) {`);
    s.push(
      `    throw new Error('${name} must be rendered inside a ${member.of}. There is no selection to compare against, and looking unselected would hide the mistake.');`,
    );
    s.push(`  }`);
    s.push(
      `  const selected = ${memberMany ? `ctx.selection.includes(${member.identity})` : `ctx.selection === ${member.identity}`};`,
    );
    s.push(`  const baseId = \`\${ctx.baseId}-\${${member.identity}}\`;`);
    s.push(``);
  } else if (needsIds) {
    s.push(`  const baseId = useId();`);
    s.push(``);
  }

  // ---- plain shared states
  for (const sh of shared) {
    const st = sh.from;
    const v = camel(st);
    s.push(`  const ${v}Controlled = ${sh.name} !== undefined;`);
    s.push(`  const [${v}Internal, set${pascal(st)}Internal] = useState(default${pascal(st)});`);
    s.push(`  const ${v}Value = ${v}Controlled ? ${sh.name} : ${v}Internal;`);
    if (rootToggles !== st) {
      s.push(`  // Nothing in the contract says what CHANGES \`${st}\`: no part declares`);
      s.push(
        `  // \`activates\`. It works when controlled from outside; uncontrolled it cannot move.`,
      );
      s.push(`  void set${pascal(st)}Internal;`);
    }
  }
  if (shared.length) s.push(``);

  // ---- the collection's own selection
  if (selShared) {
    s.push(`  const valueControlled = value !== undefined;`);
    s.push(`  const [valueInternal, setValueInternal] = useState(defaultValue);`);
    s.push(`  const selection = valueControlled ? value : valueInternal;`);
    s.push(``);
    s.push(`  const toggle = useCallback(`);
    s.push(`    (${collection.identity}: string) => {`);
    if (many) {
      s.push(`      const next = selection.includes(${collection.identity})`);
      s.push(`        ? selection.filter((v) => v !== ${collection.identity})`);
      s.push(`        : [...selection, ${collection.identity}];`);
    } else if (collection.selection.cardinality === 'at-most-one') {
      s.push(
        `      const next = selection === ${collection.identity} ? '' : ${collection.identity};`,
      );
    } else {
      s.push(`      const next = ${collection.identity};`);
      s.push(`      if (next === selection) return;`);
    }
    s.push(`      if (!valueControlled) setValueInternal(next);`);
    s.push(`      onValueChange?.(next);`);
    s.push(`    },`);
    s.push(`    [selection, valueControlled, onValueChange],`);
    s.push(`  );`);
    s.push(``);
    s.push(`  const contextValue = useMemo(`);
    s.push(`    () => ({ selection, toggle, baseId, disabled: disabled ?? false }),`);
    s.push(`    [selection, toggle, baseId, disabled],`);
    s.push(`  );`);
    s.push(``);
  }

  // ---- activation
  if (activator || rootToggles) {
    const what = activator?.node.activates.toggles ?? rootToggles;
    s.push(`  const activate = useCallback(() => {`);
    const guards = [];
    if (consumerProps.some((p) => p.name === 'disabled')) guards.push(disabledExpr);
    if (consumerProps.some((p) => p.name === 'readOnly')) guards.push('readOnly');
    if (guards.length) s.push(`    if (${guards.join(' || ')}) return;`);
    if (what === 'member') {
      s.push(`    ctx.toggle(${member.identity});`);
      const deps = ['ctx', member.identity];
      if (consumerProps.some((p) => p.name === 'disabled')) deps.push('disabled');
      s.push(`  }, [${deps.join(', ')}]);`);
    } else {
      const v = camel(what);
      s.push(`    const next = !${v}Value;`);
      s.push(`    if (!${v}Controlled) set${pascal(what)}Internal(next);`);
      s.push(`    on${pascal(what)}Change?.(next);`);
      s.push(
        `  }, [${v}Controlled, ${v}Value, on${pascal(what)}Change${guards.length ? ', ' + guards.join(', ') : ''}]);`,
      );
    }
    s.push(``);
  }

  // ---- markup
  s.push(`  return (`);
  const rootAttrs = [];
  rootAttrs.push(`{...rest}`);
  rootAttrs.push(`ref={ref}`);
  if (el === 'button') rootAttrs.push(`type="button"`);
  if (rootRole) rootAttrs.push(`role="${rootRole}"`);
  if (needsIds && !member) rootAttrs.push(`id={baseId}`);
  for (const [st, def] of Object.entries(contract.states ?? {})) {
    const isShared = sharedStates.has(st);
    const isConsumer = consumerProps.some((p) => p.from === st);
    if (!isShared && !isConsumer) continue;
    const expr = isShared ? `${camel(st)}Value` : camel(st);
    if (NATIVE_ATTR[st] && el === 'button') rootAttrs.push(`${NATIVE_ATTR[st]}={${expr}}`);
    else if (ARIA_ATTR[st] && ARIA_EXPLICIT_FALSE.has(st))
      rootAttrs.push(`${ARIA_ATTR[st]}={${expr}}`);
    else if (ARIA_ATTR[st]) rootAttrs.push(`${ARIA_ATTR[st]}={${expr} || undefined}`);
    else rootAttrs.push(`data-${prefix}-state-${st}={${expr} || undefined}`);
  }
  if (rootToggles) rootAttrs.push(`onClick={activate}`);
  rootAttrs.push(`data-${prefix}-component="${name}"`);
  rootAttrs.push(`data-${prefix}-part="${root.part}"`);
  rootAttrs.push(`className={className}`);

  s.push(`    <${el}`);
  for (const a of rootAttrs) s.push(`      ${a}`);
  s.push(`    >`);

  if (collection) s.push(`      <${name}Context.Provider value={contextValue}>`);

  const kids = Object.entries(root.parts ?? {});
  for (const [k, node] of kids) s.push(...renderPart(k, node, ctx, collection ? 1 : 0));

  const orphaned = slots.filter(
    (x) => !allParts.some((p) => (x.part ? p.key === x.part : p.key === camel(x.from))),
  );
  if (orphaned.length) {
    assume(
      'slots with no anatomy part',
      `rendered bare: ${orphaned.map((o) => o.name).join(', ')}`,
      'The contract declares these slots but names no part for them, so there is no described region to put them in and no way to style where they land.',
    );
    for (const o of orphaned) s.push(`      {${o.name}}`);
  }
  if (takesChildren) s.push(`      {children}`);
  if (collection) s.push(`      </${name}Context.Provider>`);
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
