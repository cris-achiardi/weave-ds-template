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

// The WEB PLATFORM, as data. Eleven tables used to live here, and not one of them was React's:
// which ARIA attribute a state maps to, which roles accept it, which elements have a native
// `disabled`, which are focusable, which carry an implicit role. A Vue or Angular emitter needs
// every one; a Flutter emitter needs none of them. See packages/platform-web/README.md.
//
// A real dependency rather than a relative path, so a generated component's provenance is
// "contract vN + web profile vM" in a lockfile rather than a claim in a README.
import {
  ariaAttributeFor,
  ariaFitsRole,
  ariaValueFor,
  channelFor,
  defaultElement,
  editsOwnValue,
  implicitRole,
  isNativelyFocusable,
  isVoid,
  loadProfile,
  pseudoClassFor,
  relationAttribute,
  rendersFalse,
  submitsByDefault,
  visibilityOf,
} from '@ds/platform-web';

const WEB = loadProfile();

// The prop surface a contract implies. Shared with the contract tooling, which needs the same
// answer and cannot import this file — see the CLI guard at the bottom.
import { camel, pascal, surfaceFrom } from './surface.mjs';

// React's typing for a given intrinsic element. Another thing no contract states.
const ATTR_TYPE = {
  button: ['ButtonHTMLAttributes', 'HTMLButtonElement'],
  input: ['InputHTMLAttributes', 'HTMLInputElement'],
  label: ['LabelHTMLAttributes', 'HTMLLabelElement'],
  a: ['AnchorHTMLAttributes', 'HTMLAnchorElement'],
  dialog: ['DialogHTMLAttributes', 'HTMLDialogElement'],
};
const attrTypeFor = (el) => ATTR_TYPE[el] ?? ['HTMLAttributes', 'HTMLDivElement'];

const EMITTER_ASSUMPTIONS = [];
const assume = (topic, decision, why) => EMITTER_ASSUMPTIONS.push({ topic, decision, why });

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
// Which component names a collection admits as members. `collection.items` is a string when there
// is one kind and a list when there are several; every reader has to normalise, so it happens once.
const admittedBy = (ancestor) => {
  const declared = readJson(join(CONTRACTS, 'components', ancestor, `${ancestor}.contract.json`))
    .collection?.items;
  return Array.isArray(declared) ? declared : declared ? [declared] : [];
};
const kebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

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

function partsOf(node, out = [], key = 'root') {
  out.push({ key, part: node.part, node });
  for (const [k, child] of Object.entries(node.parts ?? {})) partsOf(child, out, k);
  return out;
}

// Render one anatomy part and everything under it. Recursive, so a role or a relationship on a
// nested part lands where the contract put it rather than on the root.
function renderPart(key, node, ctx, depth) {
  const { prefix, slots, contract, idFor, refId } = ctx;
  const pad = '  '.repeat(depth + 3);
  const slot = slots.find((x) => (x.part ? x.part === key : camel(x.from) === key));
  const takesChildrenHere = ctx.childrenPart === key;
  const attrs = [];

  const nodeEl = defaultElement(node.activates?.toggles ? 'activatable' : 'container', WEB);
  // Unified with the ROOT path, which asks the same question two hundred lines below. Equivalent
  // to the old inline check by cases: a container has no implicit role so it never suppresses,
  // and an activatable suppresses exactly when the declared role is the one it already carries.
  if (node.role && implicitRole(nodeEl, WEB) !== node.role) {
    attrs.push(`role="${node.role}"`);
  }
  if (
    node.role ||
    node.controls ||
    node.namedBy ||
    (node.describedBy ?? []).length ||
    ctx.referenced.has(key)
  ) {
    attrs.push(`id={${idFor(key)}}`);
  }
  if (node.controls) attrs.push(`${relationAttribute('controls', WEB)}={${refId(node.controls)}}`);
  if (node.namedBy) attrs.push(`${relationAttribute('namedBy', WEB)}={${refId(node.namedBy)}}`);
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
    attrs.push(
      `${relationAttribute('describedBy', WEB)}={[${pieces.join(', ')}].filter(Boolean).join(' ') || undefined}`,
    );
  }
  if (node.activates?.toggles) attrs.push(`onClick={activate}`);
  if (node.activates?.toggles && node.role === 'button') attrs.push(`type="button"`);
  if (node.visibleWhen)
    attrs.push(`${WEB.visibility.attribute}={!(${stateExpr(node.visibleWhen, ctx)})}`);
  if (node.role === 'button') {
    const dis = ctx.disabledExpr;
    if (dis) attrs.push(`disabled={${dis}}`);
  }
  // aria-expanded belongs on whatever controls a part whose visibility is a state
  if (typeof node.controls === 'string') {
    const target = Object.entries(contract.anatomy.root.parts ?? {}).find(
      ([k]) => k === node.controls,
    );
    if (target && target[1].visibleWhen) {
      attrs.push(`aria-expanded={${stateExpr(target[1].visibleWhen, ctx)}}`);
    }
  }
  // The part the contract names as the range's track is the box a pointer is measured against, so
  // it is the one part that needs a ref of its own.
  if (ctx.rangeTrack === key) attrs.push(`ref={range.trackRef}`);
  attrs.push(`data-${prefix}-part="${node.part}"`);

  const el = nodeEl;
  const kids = Object.entries(node.parts ?? {});
  const open = `<${el} ${attrs.join(' ')}>`;
  const close = `</${el}>`;

  const out = [];
  if (!kids.length && !slot && !takesChildrenHere) {
    out.push(`${pad}<${el} ${attrs.join(' ')} />`);
    return out;
  }
  out.push(pad + open);
  if (slot) out.push(`${pad}  {${slot.name}}`);
  if (takesChildrenHere) out.push(`${pad}  {children}`);
  for (const [k, child] of kids) out.push(...renderPart(k, child, ctx, depth + 1));
  out.push(pad + close);
  return out;
}

// How a state name evaluates inside the generated component.
function stateExpr(spec, ctx) {
  const [state, value] = spec.includes('=') ? spec.split('=') : [spec, null];
  let base;
  if (ctx.memberReflects === state) base = 'selected';
  else if (ctx.sharedStates.has(state)) base = `${camel(state)}Value`;
  else base = camel(state);
  return value === null ? base : `${base} === '${value}'`;
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
  const takesChildren = (contract.composition?.children?.max ?? 1) !== 0;
  const childrenPart = contract.composition?.children?.part;

  const collection = contract.collection;
  const selShared = collection?.selection?.control === 'shared';
  const many = collection?.selection?.cardinality === 'many';
  const member = contract.member;

  // A member contract is NOT self-contained: whether its selection is a set or a single value
  // lives in the ancestor's contract, so the emitter has to open that file to compile this one.
  let memberMany = false;
  let memberNav = null;
  if (member) {
    const ancestorPath = join(CONTRACTS, 'components', member.of, `${member.of}.contract.json`);
    if (!existsSync(ancestorPath)) {
      throw new Error(
        `${name} declares member.of "${member.of}" but no contract exists at ${ancestorPath}`,
      );
    }
    const ancestor = readJson(ancestorPath);
    const admitted = admittedBy(member.of);
    if (!admitted.includes(name)) {
      throw new Error(
        `${name} says it is a member of ${member.of}, but ${member.of}.collection.items admits ` +
          `${admitted.length ? admitted.join(', ') : '(nothing)'} — the two contracts disagree.`,
      );
    }
    memberMany = ancestor.collection.selection.cardinality === 'many';
    memberNav = ancestor.collection.navigation ?? null;
    assume(
      'a member contract is not self-contained',
      `read ${member.of}.contract.json to learn the selection is ${memberMany ? 'a set' : 'a single value'}`,
      'Cardinality lives on the ancestor, so this component cannot be compiled from its own contract alone. Nothing in the repo checks that the two contracts agree; the emitter now does, and it is the only thing that does.',
    );
  }

  // Linear navigation, from whichever side of the collection this component is on.
  const navigation = collection?.navigation ?? null;
  // A member is in the arrow path iff its root declares `activates` — a thing you choose is a
  // thing you arrow onto. That is what excludes a TabPanel from the arrow path while including a
  // TabItem, WITHOUT either contract having to say so: both are members of the same collection and
  // only one of them is activated. If this ever needs to be declared explicitly, that is a schema
  // change, not an emitter table.
  const registers = Boolean(memberNav && root.activates);
  // A member the arrows must still be able to land on cannot carry the NATIVE `disabled`
  // attribute: the platform makes such an element unfocusable, full stop, and no amount of
  // tabIndex or .focus() overrides it. Found by pressing the key, not by reading the code — the
  // generated tab list looked correct and typechecked, and its disabled tab was simply
  // unreachable. `aria-disabled` is what the APG uses for exactly this reason; the activation
  // guard the emitter already writes is what keeps the member from being chosen.
  const ariaDisabledOnly = registers && memberNav.disabledItems === 'focusable';

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
    'ARIA attribute where one is conventional AND the element has a role, native attribute for disabled, otherwise data-<prefix>-state',
    'The contract declares that a state exists and who may set it, never how it is exposed. Worse, the right answer depends on the ROLE, not the state name: `open` is aria-expanded on an accordion trigger and nothing at all on a tooltip wrapper. The emitter keeps a state-name table and gates it on the element having a role, which is a heuristic. Two backends will diverge here.',
  );
  // Range stepping. The block says HOW the number is operated; the operated state says what the
  // number IS. The emitter needs both, and refuses to compile a `range` that names a state which is
  // not a number — otherwise the arithmetic would run on a boolean and produce NaN silently.
  const range = contract.range ?? null;
  let rangeState = null;
  if (range) {
    rangeState = contract.states?.[range.state];
    if (!rangeState || rangeState.valueType !== 'number') {
      throw new Error(
        `${name}.range.state names "${range.state}", which is not a state with valueType "number".`,
      );
    }
    if (
      rangeState.min === undefined ||
      rangeState.max === undefined ||
      rangeState.step === undefined
    ) {
      throw new Error(
        `${name}.range.state "${range.state}" must declare min, max and step — a range with an ` +
          `open end cannot be stepped or drawn.`,
      );
    }
    const parts = partsOf(root).map((x) => x.key);
    if (range.track !== 'root' && !parts.includes(range.track)) {
      throw new Error(
        `${name}.range.track names part "${range.track}", which this component's anatomy does not ` +
          `render. A pointer would have nothing to measure against.`,
      );
    }
  }

  // A native <dialog> does not take an attribute to become visible. It is opened by CALLING
  // showModal() and closed by calling close(), and in exchange the platform supplies focus
  // containment, an inert background, focus restoration and Escape — four things this contract
  // states in prose and cannot declare.
  //
  // The trigger is the element name plus a root whose visibility is a state. That is platform
  // knowledge sitting in an emitter, and it belongs with the other eight tables the same way.
  const platformModal =
    visibilityOf(el, WEB).mode === 'imperative' && root.visibleWhen ? root.visibleWhen : null;
  const modalShared = platformModal ? shared.find((x) => x.from === platformModal) : null;
  if (platformModal && !modalShared) {
    throw new Error(
      `${name} renders a <dialog> whose visibility depends on "${platformModal}", but that state is ` +
        `not \`control: shared\` — nothing could open it and nothing could hear it close.`,
    );
  }

  const editable = editsOwnValue(el, WEB);
  const valueState = shared.find(
    (x) => contract.states?.[x.from]?.valueType === 'string' && x.name === 'value',
  );
  const nativelyEdited = editable && valueState;
  if (nativelyEdited) {
    assume(
      'what changes a natively edited value',
      `wired ${valueState.name} to the element's own change event because the binding renders <${el}>`,
      'Nothing in the contract says typing changes the value — `activates` covers activation, not editing. The emitter knows it because an <input> edits its own value, which is PLATFORM knowledge sitting in a React emitter. A backend rendering something other than a native input would have to reimplement editing from scratch with nothing to guide it.',
    );
  }
  if (range) {
    assume(
      'how a pointer becomes a number',
      `measured against the "${range.track}" part's box, with pointer capture on the root`,
      'The contract names the track and the axis, which is as far as a framework-agnostic statement can go — it says WHAT the geometry is measured against without knowing about pixels, events or a rendering model. Everything after that is this backend: getBoundingClientRect, setPointerCapture, and the decision to jump to the pressed point rather than requiring the thumb to be grabbed. A backend on a platform without pointer capture would need a different answer and the same conformance cases.',
    );
  }
  if (platformModal) {
    assume(
      'how a modal opens and closes',
      'the binding renders <dialog>, so showModal() and close() are driven from an effect and the platform supplies containment, inertness, focus restoration and Escape',
      "THE FIRST useEffect IN GENERATED CODE, and it is not incidental. A <dialog> cannot be opened by rendering an attribute — React sets `open` on the first render and showModal() then throws InvalidStateError — so it has to be called after commit. The dialog also closes ITSELF on Escape, which means the component is no longer the only writer of its own state and has to listen for `close` to stay in sync. A backend without a modal element in its platform gets none of this and has to implement four separate behaviours, with only this contract's prose to go on.",
    );
  }
  if (shared.length && !rootToggles && !activator && !nativelyEdited && !range && !platformModal) {
    assume(
      'what changes a shared state',
      `no event wired — ${shared.map((s) => s.name).join(', ')} exposed as storage only`,
      'No part declares `activates`, and nothing else in the contract says what causes these to change.',
    );
  }
  if (navigation) {
    assume(
      'how a collection moves focus between its members',
      'a member registration protocol over React context, plus useLinearNavigation from @ds/react/behavior',
      'The contract declares WHAT the keyboard does — orientation, wrap, whether selection follows focus, what happens at a disabled member — and says nothing about how a backend learns which DOM nodes its members are. React does it with a context carrying register/unregister and a callback ref; a web component would use slot assignment; a template compiler could resolve it statically. The protocol belongs to this backend and the conformance cases are what keep the inventions equivalent.',
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

  // A reference is either a string — a part of THIS component, resolved by `idFor` — or an object
  // naming a part of a sibling MEMBER of the same collection. The second form is the one a tab
  // needs to point at its panel, and it is the reason a member's id root carries its component
  // name: a tab and its panel share one identity, so `<collection>-<identity>` alone would give
  // both of them the same id and the reference would point at whichever rendered last.
  const crossRefs = [];
  const refId = (spec) => {
    if (typeof spec === 'string') return idFor(spec);
    if (!member) {
      throw new Error(
        `${name} references member "${spec.member}" but is not itself a member of any collection, ` +
          `so there is no shared ancestor to resolve the reference against.`,
      );
    }
    crossRefs.push(spec);
    const root = '`${ctx.baseId}-' + spec.member + '-${' + member.identity + '}`';
    return spec.part === 'root' ? root : root.slice(0, -1) + '-' + spec.part + '`';
  };
  const refsOf = (node) => [
    ...(node.controls ? [node.controls] : []),
    ...(node.namedBy ? [node.namedBy] : []),
    ...(node.describedBy ?? []),
  ];
  const referencesParts = allParts.some((p) => refsOf(p.node).length);

  // Which parts are POINTED AT from inside this component. A part was given an id only when it
  // referenced something, so every part that was merely referenced had none — and the attribute
  // pointing at it named an id nothing rendered.
  //
  // That is not a cosmetic defect. A Field's control claimed to be labelled by its label and
  // described by its description and its error, and all three references were dangling: assistive
  // technology reports the control as unnamed. It typechecks, it renders, and the only way to see it
  // is to resolve the id in a browser.
  const referenced = new Set(
    [{ key: 'root', node: root }, ...allParts]
      .flatMap((p) => refsOf(p.node))
      .filter((r) => typeof r === 'string'),
  );
  // A member whose root is POINTED AT from a sibling needs an id even if it references nothing
  // itself. Nothing in this contract can know that, so the flag is set from the ancestor's roster.
  const referencedByASibling = Boolean(
    member &&
    // `collection.items` is a string OR a list — a collection with one member kind may name it
    // directly. Both forms have to normalise here, or a single-kind collection throws.
    admittedBy(member.of)
      .filter((sib) => sib !== name)
      .some((sib) => {
        const f = join(CONTRACTS, 'components', sib, `${sib}.contract.json`);
        if (!existsSync(f)) return false;
        return JSON.stringify(readJson(f)).includes(`"member": "${name}"`);
      }),
  );
  const needsIds = Boolean(collection) || referencesParts || referencedByASibling;

  const ctx = {
    prefix,
    slots,
    contract,
    idFor,
    childrenPart,
    memberReflects: member?.reflects,
    rangeTrack: range && range.track !== 'root' ? range.track : null,
    referenced,
    refId,
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
  if (rootToggles || activator || collection || nativelyEdited) hooks.push('useCallback');
  if (registers) hooks.push('useCallback');
  if (range) hooks.push('useCallback');
  if (platformModal) hooks.push('useCallback', 'useEffect', 'useRef');
  if (collection) hooks.push('createContext', 'useMemo');
  if (member) hooks.push('useContext');
  s.push(`import { ${[...new Set(hooks)].join(', ')} } from 'react';`);
  const types = [attrType];
  if (slots.length) types.push('ReactNode');
  if (nativelyEdited) types.push('ChangeEvent');
  s.push(`import type { ${types.join(', ')} } from 'react';`);
  if (range) {
    s.push(`import { snap, useRangeControl, type RangeOptions } from '@ds/react/behavior';`);
  }
  if (navigation) {
    // A real package import, not copied code. What you can see you own; what must be correct you
    // depend on. The TYPE is imported too, so a `collection.navigation` block that has drifted
    // from the primitive's option shape fails to typecheck in the generated component rather than
    // failing silently at runtime.
    s.push(
      `import {
  useLinearNavigation,
  type MemberRegistration,
  type NavigationOptions,
} from '@ds/react/behavior';`,
    );
  }
  if (member) {
    s.push(`import { ${member.of}Context } from '../${member.of}/${member.of}';`);
  }
  s.push(`import './${name}.structure.css';`);
  s.push(`import './${name}.theme.css';`);
  s.push(``);

  // ---- the declared range, module-level so its identity is stable across renders
  if (range) {
    s.push(
      `// Transcribed from ${name}.contract.json: the \`range\` block, plus min/max/step from the`,
    );
    s.push(`// \`${range.state}\` state. The cases this commits us to are in`);
    s.push(`// @ds/contracts/conformance/range-stepping.json.`);
    s.push(`const RANGE: RangeOptions = {`);
    s.push(`  min: ${rangeState.min},`);
    s.push(`  max: ${rangeState.max},`);
    s.push(`  step: ${rangeState.step},`);
    s.push(`  orientation: '${range.orientation}',`);
    if (range.pageStep !== undefined) s.push(`  pageStep: ${range.pageStep},`);
    s.push(`};`);
    s.push(``);
  }

  // ---- the declared keyboard model, module-level so its identity is stable across renders
  if (navigation) {
    s.push(`// Transcribed field for field from ${name}.contract.json > collection.navigation.`);
    s.push(
      `// The cases this commits us to are in @ds/contracts/conformance/linear-navigation.json.`,
    );
    s.push(`const NAVIGATION: NavigationOptions = {`);
    for (const [k, v] of Object.entries(navigation)) {
      s.push(`  ${k}: ${typeof v === 'string' ? `'${v}'` : String(v)},`);
    }
    s.push(`};`);
    s.push(``);
  }

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
    if (navigation) {
      s.push(
        `  /** A member announces its DOM node, so the collection can move focus between them. */`,
      );
      s.push(`  register: (${collection.identity}: string, entry: MemberRegistration) => void;`);
      s.push(`  unregister: (${collection.identity}: string) => void;`);
      s.push(`  /** True for the one member that sits in the page's tab sequence. */`);
      s.push(`  isTabStop: (${collection.identity}: string) => boolean;`);
    }
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
    if (p.role === 'axis')
      s.push(
        `  /** ${(p.description ?? '').replace(/\s+/g, ' ')}${p.default ? ` Defaults to \`${p.default}\`.` : ''} */`,
      );
    s.push(`  ${p.name}${p.required ? '' : '?'}: ${p.type};`);
  }
  s.push(`}`);
  s.push(``);

  const destructured = [
    ...props.map((p) => {
      if (p.role === 'uncontrolled') {
        if (p.from === 'selection') return `${p.name} = ${many ? '[]' : "''"}`;
        const d = p.default;
        const lit = d === false ? 'false' : typeof d === 'number' ? String(d) : `'${d}'`;
        return `${p.name} = ${lit}`;
      }
      if (p.role === 'axis' && p.default) return `${p.name} = '${p.default}'`;
      return p.name;
    }),
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
    if (needsIds) {
      s.push(`  const baseId = \`\${ctx.baseId}-${name}-\${${member.identity}}\`;`);
    }
    if (registers) {
      const dis = disabledExpr ?? 'ctx.disabled';
      // `register`/`unregister` are pulled off the context ON PURPOSE rather than closing over
      // `ctx`. They are the two stable fields on it; the rest change with the selection. A ref
      // callback that depended on the whole context would be re-created on every selection change,
      // which detaches and re-attaches the node, which re-registers it, which re-renders the
      // collection — a loop with no exit.
      s.push(`  const { register, unregister } = ctx;`);
      s.push(``);
      s.push(`  const rootRef = useCallback(`);
      s.push(`    (node: ${elType} | null) => {`);
      s.push(`      if (node) {`);
      s.push(`        register(${member.identity}, { element: node, disabled: ${dis} });`);
      s.push(`      } else {`);
      s.push(`        unregister(${member.identity});`);
      s.push(`      }`);
      s.push(`      // The consumer's own ref still has to land. Swallowing it would break every`);
      s.push(`      // measurement and every imperative focus call made from outside.`);
      s.push(`      if (typeof ref === 'function') ref(node);`);
      s.push(`      else if (ref) ref.current = node;`);
      s.push(`    },`);
      const refDeps = ['register', 'unregister', member.identity];
      if (disabledExpr) {
        refDeps.push('disabled', 'ctx.disabled');
      } else {
        refDeps.push('ctx.disabled');
      }
      refDeps.push('ref');
      s.push(`    [${refDeps.join(', ')}],`);
      s.push(`  );`);
    }
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
    const operatedByRange = range && range.state === st;
    if (rootToggles !== st && !operatedByRange && platformModal !== st) {
      s.push(`  // Nothing in the contract says what CHANGES \`${st}\`: no part declares`);
      s.push(
        `  // \`activates\`. It works when controlled from outside; uncontrolled it cannot move.`,
      );
      s.push(`  void set${pascal(st)}Internal;`);
    }
    if (platformModal === st) {
      s.push(``);
      s.push(`  // A <dialog> is opened by CALLING showModal(), never by rendering an attribute:`);
      s.push(`  // React would set \`open\` on the first render and showModal() then throws`);
      s.push(`  // InvalidStateError. So the element is held by a ref and driven after commit.`);
      s.push(`  const dialogRef = useRef<${elType} | null>(null);`);
      s.push(``);
      s.push(`  useEffect(() => {`);
      s.push(`    const node = dialogRef.current;`);
      s.push(`    if (!node) return;`);
      s.push(
        `    // \`open\` reflects showModal() having been called, so it is also the guard against`,
      );
      s.push(`    // calling it twice — which throws in Safari 16 and is merely wasteful after.`);
      s.push(`    if (${v}Value && !node.open) node.showModal();`);
      s.push(`    else if (!${v}Value && node.open) node.close();`);
      s.push(`  }, [${v}Value]);`);
      s.push(``);
      s.push(`  const setDialogRef = useCallback(`);
      s.push(`    (node: ${elType} | null) => {`);
      s.push(`      dialogRef.current = node;`);
      s.push(
        `      // The consumer's ref still has to land, and for a dialog it is the one way to`,
      );
      s.push(`      // reach showModal() from outside.`);
      s.push(`      if (typeof ref === 'function') ref(node);`);
      s.push(`      else if (ref) ref.current = node;`);
      s.push(`    },`);
      s.push(`    [ref],`);
      s.push(`  );`);
      s.push(``);
      s.push(`  // The dialog closes ITSELF on Escape, so this component is no longer the only`);
      s.push(
        `  // writer of its own state. Without this the platform would hide the element while`,
      );
      s.push(`  // \`${st}\` stayed true, and the next open would be a no-op.`);
      s.push(`  const handleClose = useCallback(() => {`);
      s.push(`    if (!${v}Controlled) set${pascal(st)}Internal(false);`);
      s.push(`    on${pascal(st)}Change?.(false);`);
      s.push(`  }, [${v}Controlled, on${pascal(st)}Change]);`);
      s.push(``);
      s.push(`  // Synced from the ELEMENT's own \`open\` attribute, not from a \`close\` event.`);
      s.push(`  //`);
      s.push(
        `  // Measured, not assumed: \`close\` did not fire in Chrome 153 — not through React's`,
      );
      s.push(
        `  // \`onClose\` prop, not through addEventListener, and not through the \`onclose\``,
      );
      s.push(`  // property, on this element or on a bare probe dialog. a11y-dialog documents the`);
      s.push(`  // same unreliability. Observing the attribute reads what is TRUE rather than`);
      s.push(`  // trusting a notification, and it catches every way the platform can close this`);
      s.push(
        `  // element behind the component's back: Escape, \`closedby\`, a form submitted with`,
      );
      s.push(`  // method="dialog".`);
      s.push(`  //`);
      s.push(`  // Getting this wrong is not a cosmetic desync. Once \`${st}\` says open and the`);
      s.push(`  // element says closed, the next open is a no-op and the dialog can never be`);
      s.push(`  // shown again.`);
      s.push(`  useEffect(() => {`);
      s.push(`    const node = dialogRef.current;`);
      s.push(`    if (!node) return;`);
      s.push(`    const observer = new MutationObserver(() => {`);
      s.push(`      if (!node.open) handleClose();`);
      s.push(`    });`);
      s.push(`    observer.observe(node, { attributes: true, attributeFilter: ['open'] });`);
      s.push(`    return () => observer.disconnect();`);
      s.push(`  }, [handleClose]);`);
    }
    if (operatedByRange) {
      s.push(``);
      s.push(`  const set${pascal(st)} = useCallback(`);
      s.push(`    (next: number) => {`);
      s.push(`      if (!${v}Controlled) set${pascal(st)}Internal(next);`);
      s.push(`      on${pascal(st)}Change?.(next);`);
      s.push(`    },`);
      s.push(`    [${v}Controlled, on${pascal(st)}Change],`);
      s.push(`  );`);
      const dis = consumerProps.some((x) => x.name === 'disabled') ? 'disabled' : 'false';
      s.push(`  const range = useRangeControl(RANGE, ${v}Value, set${pascal(st)}, ${dis});`);
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
    if (navigation) {
      s.push(
        `  // \`toggle\` is the selection setter, and \`followsFocus\` is what decides whether the`,
      );
      s.push(
        `  // primitive calls it. With followsFocus false it is never called from here and arrowing`,
      );
      s.push(`  // only moves focus.`);
      s.push(`  const nav = useLinearNavigation(NAVIGATION, selection, toggle);`);
      s.push(``);
    }
    const fields = ['selection', 'toggle', 'baseId', 'disabled: disabled ?? false'];
    const deps = ['selection', 'toggle', 'baseId', 'disabled'];
    if (navigation) {
      // Deliberately NOT `...nav`. `nav.onKeyDown` changes identity whenever the member list moves
      // and is used only on this component's own root, so putting it in the context would
      // re-render every member for nothing.
      fields.push(
        'register: nav.register',
        'unregister: nav.unregister',
        'isTabStop: nav.isTabStop',
      );
      deps.push('nav.register', 'nav.unregister', 'nav.isTabStop');
    }
    s.push(`  const contextValue = useMemo(`);
    s.push(`    () => ({ ${fields.join(', ')} }),`);
    s.push(`    [${deps.join(', ')}],`);
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
      const def = contract.states?.[what];
      const between = (activator?.node.activates ?? root.activates)?.between;
      if (def?.values && between) {
        // Any value outside the pair — a checkbox's `mixed` — resolves to the second, which is
        // what the APG specifies and what `between` exists to say.
        // Anything outside the pair falls to the SECOND value, not the first: a mixed
        // checkbox resolves to checked, which is what the APG specifies. Comparing against
        // between[1] rather than between[0] is the whole difference.
        s.push(
          `    const next = ${v}Value === '${between[1]}' ? '${between[0]}' : '${between[1]}';`,
        );
      } else if (def?.values) {
        assume(
          'activating a valued state with no `between`',
          'cycles through the declared values in order',
          'The contract declares more than two values and does not say which two a user may move between, so the emitter cycles. For a checkbox that would offer `mixed` as a click target, which is wrong.',
        );
        s.push(`    const order = [${def.values.map((x) => `'${x}'`).join(', ')}] as const;`);
        s.push(`    const next = order[(order.indexOf(${v}Value) + 1) % order.length]!;`);
      } else {
        s.push(`    const next = !${v}Value;`);
      }
      s.push(`    if (!${v}Controlled) set${pascal(what)}Internal(next);`);
      s.push(`    on${pascal(what)}Change?.(next);`);
      s.push(
        `  }, [${v}Controlled, ${v}Value, on${pascal(what)}Change${guards.length ? ', ' + guards.join(', ') : ''}]);`,
      );
    }
    s.push(``);
  }

  // ---- markup
  if (nativelyEdited) {
    const st = valueState.from;
    const v = camel(st);
    s.push(`  const handleChange = useCallback(`);
    s.push(`    (event: ChangeEvent<${elType}>) => {`);
    s.push(`      const next = event.target.value;`);
    s.push(`      if (!${v}Controlled) set${pascal(st)}Internal(next);`);
    s.push(`      on${pascal(st)}Change?.(next);`);
    s.push(`    },`);
    s.push(`    [${v}Controlled, on${pascal(st)}Change],`);
    s.push(`  );`);
    s.push(``);
  }

  s.push(`  return (`);
  const rootAttrs = [];
  rootAttrs.push(`{...rest}`);
  rootAttrs.push(platformModal ? `ref={setDialogRef}` : registers ? `ref={rootRef}` : `ref={ref}`);
  if (submitsByDefault(el, WEB)) rootAttrs.push(`type="button"`);
  // A <button> already IS role=button; restating it is noise the linters flag.
  if (rootRole && implicitRole(el, WEB) !== rootRole) {
    rootAttrs.push(`role="${rootRole}"`);
  }
  if (needsIds) rootAttrs.push(`id={baseId}`);
  for (const [st, def] of Object.entries(contract.states ?? {})) {
    const isShared = sharedStates.has(st);
    const isConsumer = consumerProps.some((p) => p.from === st);
    if (!isShared && !isConsumer) continue;
    const expr = isShared ? `${camel(st)}Value` : camel(st);
    void def;
    // Which channel this state reaches the DOM through is a WEB PLATFORM decision, not a React
    // one: it depends on the role, on whether the element bears one at all, and on whether the
    // attribute's `false` is meaningful. `channelFor` answers it, and the cases pinning that
    // answer down live in @ds/platform-web/conformance/aria-mapping.json.
    const decision = channelFor(
      {
        state: st,
        element: el,
        role: rootRole ?? null,
        hasValues: Boolean(def.values),
        hasValueType: Boolean(def.valueType),
        mustStayFocusable: st === 'disabled' && ariaDisabledOnly,
      },
      WEB,
    );
    // A valued state builds a ternary over its own words. The JSX shape stays here; the word
    // mapping is the platform's.
    if (def.values && decision.channel === 'aria') {
      const map = def.values
        .map((v) => `${expr} === '${v}' ? '${ariaValueFor(v, WEB)}'`)
        .join(' : ');
      rootAttrs.push(`${decision.attribute}={${map} : undefined}`);
      continue;
    }
    if (decision.channel === 'native' || decision.channel === 'aria') {
      rootAttrs.push(
        decision.rendersFalse
          ? `${decision.attribute}={${expr}}`
          : `${decision.attribute}={${expr} || undefined}`,
      );
    } else if (decision.channel === 'none') {
      // Deliberately nothing. A boolean or an enumerated state is a styling hook; free text is
      // CONTENT, and mirroring it into an attribute leaks whatever the person typed.
    } else if (def.values) rootAttrs.push(`data-${prefix}-state-${st}={${expr}}`);
    else rootAttrs.push(`data-${prefix}-state-${st}={${expr} || undefined}`);
  }
  // The state a member reflects is `internal`: no prop, so the loop above never sees it. It
  // still has to reach the DOM — a radio with no aria-checked is not a radio.
  if (member) {
    const declared = ariaAttributeFor(member.reflects, WEB);
    const attr = declared && ariaFitsRole(declared, rootRole ?? null, WEB) ? declared : null;
    if (declared && !attr) {
      assume(
        'a member state whose ARIA attribute its role does not support',
        `${member.reflects} does not reach ${declared} on role="${rootRole}" — emitted data-${prefix}-state-${member.reflects} instead`,
        `A tab panel reflects the same \`selected\` state its tab does, and ${declared} is defined for a tab and invalid on a tabpanel. The contract states the SHARED FACT and cannot know that one member's role accepts the attribute and the other's does not; the mapping is emitter knowledge, and until this check existed the emitter wrote the attribute onto whichever role it landed on.`,
      );
    }
    if (attr) {
      rootAttrs.push(
        rendersFalse(attr, WEB) ? `${attr}={selected}` : `${attr}={selected || undefined}`,
      );
    } else {
      // No ARIA mapping for this state name. Previously that emitted NOTHING at all, which is how
      // a tab shipped with no aria-selected: the table is a closed list and an unlisted name fell
      // through a branch with no else.
      rootAttrs.push(`data-${prefix}-state-${member.reflects}={selected || undefined}`);
      assume(
        'a member state outside the ARIA table',
        `emitted data-${prefix}-state-${member.reflects} instead`,
        'The state-to-attribute table is a closed list in the emitter. A state name it does not know reaches no ARIA attribute at all, and nothing detects that a component needs one.',
      );
    }
  }
  // The roving tab stop. Emitted for a member of a navigable collection REGARDLESS of whether its
  // element is natively focusable: a <button> is in the tab sequence by default, and for this
  // pattern all but one of them must be taken out of it.
  if (registers) {
    rootAttrs.push(`tabIndex={ctx.isTabStop(${member.identity}) ? 0 : -1}`);
  }
  // A range's `dragging` state is `control: internal` — no prop, so the loop above never sees it,
  // exactly as a member's reflected state does not. It exists to be styled and nothing else.
  if (range && contract.states?.dragging) {
    rootAttrs.push(`data-${prefix}-state-dragging={range.dragging || undefined}`);
  }
  // Something with a role that takes focus needs to be reachable. `semantics.focusable` says so
  // and nothing was reading it.
  if (
    !registers &&
    contract.semantics?.focusable &&
    !isNativelyFocusable(el, WEB) &&
    (root.role || contract.semantics?.role)
  ) {
    rootAttrs.push(`tabIndex={${disabledExpr ? `${disabledExpr} ? -1 : 0` : '0'}}`);
    assume(
      'focus order',
      'every focusable member is given tabIndex 0',
      'The contract declares `semantics.focusable` and nothing more. Where the collection also declares `collection.navigation` the emitter now generates a roving tab stop from it; this fallback fires only for a focusable component whose collection declares no keyboard model, and it puts every member in the Tab order.',
    );
  }
  // An axis has to be visible to CSS or a variant cannot be styled at all. Without CSS Modules
  // there is no class to hang it on, so it becomes an attribute — a THIRD attribute family
  // alongside part and state, invented here and documented nowhere.
  const axisNames = Object.keys(contract.axes ?? {});
  if (axisNames.length) {
    for (const axis of axisNames) rootAttrs.push(`data-${prefix}-${kebab(axis)}={${axis}}`);
    assume(
      'axis values in the DOM',
      `data-${prefix}-<axis>="<value>" on the root`,
      'An axis that reaches no attribute cannot be styled: there is no class to select in an unstyled library, so a declared variant would generate a prop that changes nothing. This is a third attribute family beside part and state, and nothing in the contract system defines it.',
    );
  }
  if (nativelyEdited) {
    rootAttrs.push(`value={${camel(valueState.from)}Value}`);
    rootAttrs.push(`onChange={handleChange}`);
    rootAttrs.push(`readOnly={readOnly}`);
  }
  // A slider's range is part of what it MEANS, and ARIA has attributes for exactly it.
  const ranged = Object.entries(contract.states ?? {}).find(([, d]) => d.valueType === 'number');
  if (ranged && rootRole) {
    const [rs, rd] = ranged;
    const expr = sharedStates.has(rs) ? `${camel(rs)}Value` : camel(rs);
    if (rd.min !== undefined) rootAttrs.push(`${WEB.range.min}={${rd.min}}`);
    if (rd.max !== undefined) rootAttrs.push(`${WEB.range.max}={${rd.max}}`);
    // Announce the value the contract says this component holds, not the one it was handed. A
    // controlled value may arrive off-step or out of range, and reporting it raw would have the
    // thumb drawn at one number and announced as another.
    rootAttrs.push(
      range && range.state === rs
        ? `${WEB.range.value}={snap(${expr}, RANGE)}`
        : `${WEB.range.value}={${expr}}`,
    );
  }
  // `visibleWhen` on the ROOT was handled only for child parts, so a panel that hides itself and a
  // dialog that appears were both rendered permanently visible.
  // NOT for a platform modal. A <dialog> hides itself when closed — `dialog:not([open])` is a UA
  // rule — and adding `hidden` on top would fight showModal() for control of the same thing.
  if (root.visibleWhen && !platformModal) {
    rootAttrs.push(`${WEB.visibility.attribute}={!(${stateExpr(root.visibleWhen, ctx)})}`);
  }
  // The root part's own references. Every one of these was handled for CHILD parts only, so a
  // component whose outermost node is the thing that points — a tab at its panel, a panel back at
  // its tab — generated nothing at all and nothing detected it.
  if (root.controls)
    rootAttrs.push(`${relationAttribute('controls', WEB)}={${refId(root.controls)}}`);
  if (root.namedBy) rootAttrs.push(`${relationAttribute('namedBy', WEB)}={${refId(root.namedBy)}}`);
  if ((root.describedBy ?? []).length) {
    rootAttrs.push(
      `${relationAttribute('describedBy', WEB)}={[${root.describedBy.map((d) => refId(d)).join(', ')}].filter(Boolean).join(' ') || undefined}`,
    );
  }
  if (range) {
    rootAttrs.push(`onKeyDown={range.onKeyDown}`);
    if (range.drag) {
      rootAttrs.push(`onPointerDown={range.onPointerDown}`);
      rootAttrs.push(`onPointerMove={range.onPointerMove}`);
      rootAttrs.push(`onPointerUp={range.onPointerUp}`);
      rootAttrs.push(`onPointerCancel={range.onPointerUp}`);
    }
    // The fill's length and the thumb's offset ARE the value, and neither is static CSS. The
    // component knows the number, so it hands it to CSS as a custom property rather than leaving
    // the consumer to compute it and pass it back in — which is what the sandbox had to do.
    // `rest.style` is spread FIRST so a consumer's own inline styles still land, and the property
    // last so a consumer cannot accidentally break the geometry with an unrelated style prop.
    rootAttrs.push(`style={{ ...rest.style, ['--${prefix}-fraction' as string]: range.fraction }}`);
  }
  if (navigation) rootAttrs.push(`onKeyDown={nav.onKeyDown}`);
  if (rootToggles) rootAttrs.push(`onClick={activate}`);
  rootAttrs.push(`data-${prefix}-component="${name}"`);
  rootAttrs.push(`data-${prefix}-part="${root.part}"`);
  rootAttrs.push(`className={className}`);

  const voidEl = isVoid(el, WEB);
  s.push(`    <${el}`);
  for (const a of rootAttrs) s.push(`      ${a}`);
  if (voidEl) {
    s.push(`    />`);
    s.push(`  );`);
    s.push(`});`);
    s.push(``);
    return s.join('\n');
  }
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
  if (takesChildren && !childrenPart) s.push(`      {children}`);
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
function emitStructure(name, contract, binding, prefix) {
  const root = contract.anatomy.root;
  const kids = Object.values(root.parts ?? {});
  // Does anything in this component hide itself? `visibleWhen` is the only way a contract says so.
  const hides = JSON.stringify(contract.anatomy).includes('"visibleWhen"');
  // A root the PLATFORM hides has the identical cascade problem under a different selector.
  const visibility = visibilityOf(binding.element, WEB);
  const platformHidden =
    visibility.mode === 'imperative' && root.visibleWhen ? visibility.hiddenSelector : null;

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

  // The one structural rule the emitter is willing to write, because it is not a guess about
  // layout: it is what makes a `visibleWhen` in the contract TRUE.
  //
  // `[hidden] { display: none }` comes from the browser's own stylesheet, and every rule in a
  // theme file outranks it. So a theme that gives a part a `display` — which any dialog, tooltip
  // or panel needs — silently cancels hiding, and the part is permanently visible however
  // correct the state behind it is. That is not hypothetical: it is what made the sandbox's
  // Dialog render open and unclosable, with its buttons working the whole time.
  //
  // `!important` is deliberate and is the point. Whether a part is SHOWING is a claim the
  // contract makes, not an appearance choice, so it is not the consumer's to override by
  // accident. A consumer who genuinely wants a hidden part visible should stop declaring
  // `visibleWhen`, not fight the cascade.
  if (hides) {
    L.push(`/* Hiding is a contract claim, not a style. See the note in the emitter. */`);
    if (platformHidden) L.push(`[data-${prefix}-component='${name}']${platformHidden},`);
    L.push(`[data-${prefix}-component='${name}'][hidden],`);
    L.push(`[data-${prefix}-component='${name}'] [hidden] {`);
    L.push(`  display: none !important;`);
    L.push(`}`);
    L.push(``);
    if (platformHidden) {
      L.push(`/*`);
      L.push(` * The first selector above is the SAME trap as [hidden], under a different name.`);
      L.push(` * \`dialog:not([open]) { display: none }\` is a browser-stylesheet rule, so any`);
      L.push(` * \`display\` a theme puts on this element outranks it and the closed dialog stays`);
      L.push(` * on screen with showModal() never having been called. Give the display to a part`);
      L.push(` * inside instead, or scope it to [open].`);
      L.push(` */`);
      L.push(``);
    }
  }
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
function stateSelector(base, spec, prefix) {
  const [state, value] = spec.includes('=') ? spec.split('=') : [spec, null];
  if (value !== null) {
    const isChild2 = base.includes('] [');
    const rootSel2 = isChild2 ? base.split('] [')[0] + ']' : base;
    const childSel2 = isChild2 ? '[' + base.split('] [')[1] : '';
    const on2 = `[data-${prefix}-state-${state}='${value}']`;
    return isChild2 ? `${rootSel2}${on2} ${childSel2}` : `${base}${on2}`;
  }
  const isChild = base.includes('] [');
  const rootSel = isChild ? base.split('] [')[0] + ']' : base;
  const childSel = isChild ? '[' + base.split('] [')[1] : '';
  let on;
  if (pseudoClassFor(state, WEB)) on = pseudoClassFor(state, WEB);
  else if (ariaAttributeFor(state, WEB)) on = `[${ariaAttributeFor(state, WEB)}='true']`;
  // The prefix is not optional and the operator is not `~=`. The TSX emits
  // `data-<prefix>-state-<name>` as a bare attribute, so an unprefixed `[data-state~=...]`
  // matches nothing at all — a dead rule that styles nothing and reports no error.
  else on = `[data-${prefix}-state-${state}]`;
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
      L.push(`${stateSelector(sel, state, prefix)} {`);
      for (const c of Object.keys(paints)) L.push(`  /* ${c}: ; */`);
      L.push(`}`);
      L.push(``);
    }
    for (const [key, paints] of Object.entries(p.node.whenAxis ?? {})) {
      const [axis, value] = key.includes('=') ? key.split('=') : [key, null];
      const attr = `[data-${prefix}-${kebab(axis)}='${value ?? 'true'}']`;
      const root = `[data-${prefix}-component='${name}']`;
      const selector =
        sel === root ? `${root}${attr}` : `${root}${attr} ${sel.slice(root.length + 1)}`;
      L.push(`/* ${axis} = ${value ?? 'true'} */`);
      L.push(`${selector} {`);
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
writeFileSync(
  join(outDir, `${name}.structure.css`),
  emitStructure(name, contract, binding, prefix),
  'utf8',
);

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
