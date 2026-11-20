#!/usr/bin/env node
// THE FOURTH BACKEND, and the first with no framework in it at all.
//
//   node packages/wc/src/emit/emit.mjs <Name> --out <dir>
//
// `class extends HTMLElement`, a shadow root, and the platform. Everything three frameworks
// supplied — a render model, reactivity, a component container, a way to compose event handlers —
// has to be written out here or done without.
//
// Deliberately NOT Lit. ADR 0002's table says web components should falsify "the contract assumes a
// virtual DOM and a component-function render model", and Lit has a render model. Vanilla has none,
// which makes it the only version that actually tests the claim. The Lit version is the realistic
// production recipe and is a different piece of work.

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

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
  relationAttribute,
  relationElementsProperty,
  rendersFalse,
  submitsByDefault,
  visibilityOf,
} from '@ds/platform-web';

const WEB = loadProfile();

import { emitFormMethods } from './form.mjs';
import {
  consumerNamedPart,
  formFor,
  loadPair,
  memberFacts,
  partsOf,
  ROOT_KEY,
  readJson,
  referencedByASibling,
  suppliedRelations,
} from '@ds/emit-web';
import { emitStructureShadow, emitThemeShadow } from './css-shadow.mjs';
import { crossMemberRelations, realizesRootOnHost } from './host-root.mjs';
import { camel, kebab, pascal, slotsFrom, surfaceFrom, tagFor } from './surface.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '../../../..');
const CONTRACTS = join(REPO_ROOT, 'packages/contracts');
const BINDINGS = join(REPO_ROOT, 'packages/wc/bindings');

const EMITTER_ASSUMPTIONS = [];
const assume = (topic, decision, why) => EMITTER_ASSUMPTIONS.push({ topic, decision, why });

/** Escape a string for a `"`-quoted HTML attribute inside a template literal. */
const attrLit = (s) => String(s).replace(/"/g, '&quot;');

// ---------------------------------------------------------------------------------------
// the shadow template
// ---------------------------------------------------------------------------------------
//
// ONE template, cloned per instance, built once at module scope. That is the platform's own answer
// to "do not rebuild the DOM on every change" and it is the whole render model this backend has:
// clone once in the constructor, then mutate attributes in an `#update()`. There is no diffing and
// nothing recomputes structure, which is fine precisely because the contract's anatomy is STATIC —
// every part exists always, and `visibleWhen` hides rather than removes.
function renderPart(key, node, ctx, depth) {
  const { slots, contract } = ctx;
  const pad = '  '.repeat(depth + 2);
  const slot = slots.find((x) => (x.part ? x.part === key : x.name === key));
  const takesChildrenHere = ctx.childrenPart === key;
  const attrs = [`part="${node.part}"`];

  const nodeEl = defaultElement(node.activates?.toggles ? 'activatable' : 'container', WEB);
  if (node.role && implicitRole(nodeEl, WEB) !== node.role) attrs.push(`role="${node.role}"`);
  if (node.activates?.toggles && node.role === 'button') attrs.push(`type="button"`);

  const kids = Object.entries(node.parts ?? {});
  const out = [];
  const open = `${pad}<${nodeEl} ${attrs.join(' ')}>`;
  if (!kids.length && !slot && !takesChildrenHere) {
    out.push(`${open}</${nodeEl}>`);
    return out;
  }
  out.push(open);
  if (slot) out.push(`${pad}  <slot name="${slot.name}"></slot>`);
  if (takesChildrenHere) out.push(`${pad}  <slot></slot>`);
  for (const [k, child] of kids) out.push(...renderPart(k, child, ctx, depth + 1));
  out.push(`${pad}</${nodeEl}>`);
  void contract;
  return out;
}

// ---------------------------------------------------------------------------------------
// the component
// ---------------------------------------------------------------------------------------
export function emitComponent(name, contract, binding, prefix, { declareTagTypes = true } = {}) {
  const form = formFor(contract);
  const props = surfaceFrom(contract);
  const slots = slotsFrom(contract);
  const root = contract.anatomy.root;
  const el = binding.element;
  const rootRole = root.role ?? contract.semantics?.role;
  // Where the host's `aria-label` is forwarded: the part the contract names (namedByConsumer),
  // else the root when it carries a role. The semantic element is inside the shadow root either way,
  // so naming only the host misses it.
  const namedKey = consumerNamedPart(contract);
  const namedPartName = namedKey ? partsOf(root).find((p) => p.key === namedKey).part : null;
  // ADR 0008: a member whose root is the source or target of a cross-member relation carries the
  // root's role, state and focus on the HOST, so both ends of the relation are hosts in one tree.
  const hostRoot = realizesRootOnHost(name, contract, CONTRACTS);
  // A host-root component is its own semantic element, so the consumer's name already lands where
  // assistive technology reads it — there is nothing inside to forward it to.
  const acceptsLabel = !hostRoot && Boolean(namedKey || rootRole || implicitRole(el, WEB));
  const tag = tagFor(name, prefix);
  // THE CLASS IS NOT PREFIXED, and only the TAG is. A custom element name is required to contain a
  // hyphen, which is the platform reserving every single-word tag for itself — so `<ds-button>` has
  // to carry the prefix. A class has no such constraint, it is module-scoped, and React and Angular
  // both emit a bare `Button`.
  //
  // It was `DsButton` for one commit, and that was a latent half-rename: `pnpm init-ds` rewrites
  // `dsButton` (the Angular selector) but not `DsButton`, so a renamed repo kept 117 references to
  // a class the emitter would next produce as `WeaveButton`. It built green, and CI's straggler
  // grep does not look for it. Dropping the prefix removes the thing to rename rather than adding a
  // sixth rule to rename it.
  const className = name;

  const models = props.filter((p) => p.role === 'model');
  const stateModels = models.filter((p) => p.from !== 'selection');
  const inputs = props.filter((p) => p.role === 'input');
  const axes = props.filter((p) => p.role === 'axis');
  const identity = props.find((p) => p.role === 'identity');
  const namedSlots = slots.filter((s) => s.name !== 'default');
  const takesChildren = slots.some((s) => s.name === 'default');
  const childrenPart = contract.composition?.children?.part;

  const collection = contract.collection;
  const selShared = collection?.selection?.control === 'shared';
  const many = collection?.selection?.cardinality === 'many';
  const member = contract.member;

  let memberMany = false;
  let memberNav = null;
  if (member) {
    const facts = memberFacts(name, member, CONTRACTS);
    memberMany = facts.many;
    memberNav = facts.navigation;
    assume(
      'a member contract is not self-contained',
      `read ${member.of}.contract.json to learn the selection is ${memberMany ? 'a set' : 'a single value'}`,
      'Cardinality lives on the ancestor. FOUR backends now report this identically, which is as settled as anything in this repo gets.',
    );
  }

  const navigation = collection?.navigation ?? null;
  const registers = Boolean(memberNav && root.activates);
  const ariaDisabledOnly = registers && memberNav.disabledItems === 'focusable';

  const hasDisabled = inputs.some((p) => p.name === 'disabled');
  const hasReadOnly = inputs.some((p) => p.name === 'readOnly');
  const allParts = partsOf(root);
  const activator = allParts.find((p) => p.node.activates?.toggles);
  const rootToggles = root.activates?.toggles;
  const hasActivation = Boolean(activator || rootToggles);

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
      throw new Error(`${name}.range.state "${range.state}" must declare min, max and step.`);
    }
  }

  const platformModal =
    visibilityOf(el, WEB).mode === 'imperative' && root.visibleWhen ? root.visibleWhen : null;
  if (platformModal && !stateModels.find((x) => x.from === platformModal)) {
    throw new Error(
      `${name} renders a <dialog> whose visibility depends on "${platformModal}", but that state ` +
        `is not \`control: shared\`.`,
    );
  }

  const dismisses = contract.dismisses ?? null;
  let dismissCauses = [];
  if (dismisses) {
    if (!stateModels.find((x) => x.from === dismisses.state)) {
      throw new Error(
        `${name}.dismisses names state "${dismisses.state}", which is not \`control: shared\`.`,
      );
    }
    const supplied = visibilityOf(el, WEB).supplies ?? [];
    dismissCauses = dismisses.on.filter((c) => !supplied.includes(`${c}-to-dismiss`));
  }

  const editable = editsOwnValue(el, WEB);
  const valueState = stateModels.find(
    (x) => contract.states?.[x.from]?.valueType === 'string' && x.name === 'value',
  );
  const nativelyEdited = editable && valueState;
  const formModel = form && models.find((model) => model.name === form.property);
  const commitEditing = nativelyEdited && contract.states[valueState.from].editing === 'commit';

  // --- assumptions unique to this backend -----------------------------------------------
  if (!hostRoot)
    assume(
      'the element the contract names lives INSIDE the shadow root',
      `<${tag}> hosts a <${el} part="root">`,
      'A custom element carries no implicit role, no native focus, no native `disabled` and no form participation — @ds/platform-web records all four as facts about the element the contract names, and a host that replaced it would be compiling a different component. So the host is the API and the element is inside it. THE COST IS A SPLIT: the ARIA attribute has to go on the inner element, where assistive technology reads it, AND the same state has to be reflected onto the host, where CSS can select it. One fact, two places — which is exactly the duplication packages/react/src/emit/README.md §2 warns about, forced by the shadow boundary rather than chosen.',
    );
  assume(
    'a `shared` state needs three mechanisms',
    'an attribute, a property, and a `<prefix>-<name>-change` event',
    'React spends three props on this, Vue and Angular spend one binding each. The platform has no binding at all, so the component keeps an attribute and a property in step by hand and announces changes with an event. Closest in shape to React — and unlike React, each of the three is doing a genuinely different job rather than standing in for a missing feature.',
  );
  if (navigation) {
    assume(
      'how a collection moves focus between its members',
      'a member finds its collection with closest(), and listens for one event on it',
      'React context, Vue provide/inject, Angular DI — and here, the DOM. `closest()` is the platform answering the question three frameworks each answered with a container of their own, and it is the only one of the four that works across framework boundaries.',
    );
  }
  if (member) {
    assume(
      'how a member reaches its collection',
      `closest('${tagFor(member.of, prefix)}')`,
      'The contract says this component is a member of an ancestor collection; it does not and should not say HOW. This one is structural rather than injected, so a member placed outside its collection is a runtime null rather than a resolution failure.',
    );
  }
  assume(
    'ids are generated from a counter',
    'a module-level counter, as in Angular',
    'React has useId and Vue 3.5 has useId. The platform has neither. IT MATTERS LESS HERE THAN ANYWHERE: every id this component generates is scoped to its own shadow root, so a collision with the page is impossible and only a collision with itself would matter.',
  );

  // --- ids, references -------------------------------------------------------------------
  const refsOf = (node) => [
    ...(node.controls ? [node.controls] : []),
    ...(node.namedBy ? [node.namedBy] : []),
    ...(node.describedBy ?? []),
  ];
  const referencesParts = allParts.some((p) => refsOf(p.node).length);
  const referenced = new Set(
    allParts.flatMap((p) => refsOf(p.node)).filter((r) => typeof r === 'string'),
  );
  const refBySibling = referencedByASibling(name, member, CONTRACTS);
  const needsIds = Boolean(collection) || referencesParts || refBySibling;
  // Cross-member relations this backend CAN deliver: on a host-root member, from the root to a
  // sibling member's root. Both ends are hosts in one tree, linked by IDREFs between them.
  const linked = hostRoot
    ? crossMemberRelations(contract).filter(({ target }) => target.part === ROOT_KEY)
    : [];
  if (hostRoot && !rootRole) {
    throw new Error(
      `${name} realizes its root on the host (ADR 0008) but its root declares no role.`,
    );
  }
  if (hostRoot) {
    assume(
      'the root part is realized on the HOST',
      `<${tag}> carries role="${rootRole}", its states and its focus as HOST ATTRIBUTES; [part=root] is a presentational <div>`,
      'A sibling member references this root, or this root references a sibling (ADR 0008). An IDREF cannot cross a shadow boundary and element reflection rejects a target inside a sibling shadow root, so the semantic element has to be the host. The cost is what a native element gave for free: focusability, Enter/Space activation and a box, which the host now supplies itself.',
    );
  }
  const crossShadow = allParts.some((p) =>
    refsOf(p.node).some(
      (r) => typeof r !== 'string' && !(p.key === ROOT_KEY && linked.some((l) => l.target === r)),
    ),
  );
  if (crossShadow) {
    assume(
      'non-conforming cross-member relationships',
      'object-valued references are omitted; string references remain local',
      'Element-reference reflection cannot target a semantic part inside a sibling shadow root. See ADR 0005 and pnpm contract <Name> --backend wc for explicit gaps. A host reference would name a different target.',
    );
  }

  // Relations a slot-filled part declares go on the SLOTTED element (#35, #46). It is light DOM, so
  // its IDREFs can only resolve to other light-DOM elements: the slotted CONTENT of each target
  // part. A target part with no slot has no content in the consumer's tree to point at.
  const supplied = suppliedRelations(contract);
  const slotOfPart = (key) =>
    Object.entries(contract.composition?.slots ?? {}).find(([k, x]) => (x.part ?? k) === key)?.[0];
  for (const [key, rel] of supplied) {
    const targets = [...(rel.namedBy ? [rel.namedBy] : []), ...rel.describedBy];
    const unslotted = targets.filter((t) => !slotOfPart(t));
    if (unslotted.length)
      throw new Error(
        `${name}.${key} relates a supplied element to ${unslotted.join(', ')}, which no slot fills. ` +
          'Its content lives only in the shadow root, which an IDREF from light DOM cannot reach.',
      );
  }
  if (supplied.size)
    assume(
      'relations on a slotted element',
      'IDREFs from the slotted element to the slotted CONTENT of each target part',
      'An IDREF cannot cross a shadow boundary, and element reflection cannot point from light DOM into this shadow root (ADR 0005). The slotted control and the slotted label/description/error content are in the same tree, so plain IDREFs resolve in every engine. The relation therefore targets the slotted content of the part the contract names; ADR 0005 records that mapping. A slotted element that is itself a shadow host (ds-switch, ds-text-field) receives the relations on its host, not on its inner focusable element: a recorded gap.',
    );

  const ctx = {
    slots: namedSlots,
    contract,
    childrenPart,
    referenced,
  };

  // --- the template ----------------------------------------------------------------------
  // A host-root member's [part=root] is presentational: the host carries the role, so the inner
  // element is the platform's neutral container — never a second interactive or semantic element.
  const rootEl = hostRoot ? defaultElement('container', WEB) : el;
  const rootAttrs = [`part="${root.part}"`];
  if (!hostRoot && submitsByDefault(el, WEB)) rootAttrs.push(`type="button"`);
  if (!hostRoot && rootRole && implicitRole(el, WEB) !== rootRole)
    rootAttrs.push(`role="${rootRole}"`);

  const tpl = [];
  if (isVoid(rootEl, WEB)) {
    tpl.push(`    <${rootEl} ${rootAttrs.join(' ')} />`);
  } else {
    tpl.push(`    <${rootEl} ${rootAttrs.join(' ')}>`);
    for (const [k, node] of Object.entries(root.parts ?? {})) {
      tpl.push(...renderPart(k, node, ctx, 1));
    }
    const orphaned = namedSlots.filter(
      (x) => !allParts.some((p) => (x.part ? p.key === x.part : p.key === x.name)),
    );
    for (const o of orphaned) tpl.push(`      <slot name="${o.name}"></slot>`);
    // A children part keyed to the root (`anatomy.root`) is the root itself: renderPart only emits
    // the outlet for sub-parts, so the root needs it here. Compare KEYS, not the root's `part` name —
    // a sub-part may be keyed the same as the root's styling name.
    if (takesChildren && (!childrenPart || childrenPart === ROOT_KEY))
      tpl.push(`      <slot></slot>`);
    tpl.push(`    </${rootEl}>`);
  }

  // --- the file --------------------------------------------------------------------------
  const s = [];
  s.push(`// GENERATED from ${name}.contract.json + ${name}.wc.json. Do not edit by hand.`);
  s.push(`// Regenerate: node packages/wc/src/emit/emit.mjs ${name} --out <dir>`);
  s.push(`//`);
  s.push(`// ${contract.intent.purpose.replace(/\s+/g, ' ')}`);
  s.push(``);

  const behaviorImports = [];
  if (range) behaviorImports.push('snap', 'useRangeControl');
  if (dismissCauses.length) behaviorImports.push('useDismissal');
  if (navigation) behaviorImports.push('useLinearNavigation');
  if (supplied.size) behaviorImports.push('suppliedId', 'supplyRelations');
  if (hostRoot) behaviorImports.push('supplyRelations');
  if (behaviorImports.length) {
    const types = [];
    if (supplied.size) types.push('SuppliedRelations');
    if (range) types.push('RangeOptions');
    if (dismissCauses.length) types.push('DismissalOptions');
    if (navigation) types.push('NavigationOptions');
    s.push(`import { ${[...new Set(behaviorImports)].sort().join(', ')} } from '@ds/wc/behavior';`);
    s.push(`import type { ${types.sort().join(', ')} } from '@ds/wc/behavior';`);
  }
  if (member) {
    // The collection's change-event name is imported rather than re-derived, so a rename cannot
    // leave a member listening for something nothing fires.
    s.push(
      `import { ${member.of.toUpperCase()}_CHANGE, type ${member.of} } from '../${member.of}/${member.of}';`,
    );
  }
  s.push(``);
  s.push(
    `// THE ONE BUNDLER-SPECIFIC TOKEN IN THIS FILE. \`?inline\` asks Vite for the stylesheet as`,
  );
  s.push(
    `// a string so it can be adopted into the shadow root rather than injected into the page —`,
  );
  s.push(`// which is what a plain CSS import would do, and would put these rules where they can`);
  s.push(`// never match. The standard replacement is a CSS module script`);
  s.push(
    `// (\`import sheet from './x.css' with { type: 'css' }\`); it is not portable enough yet.`,
  );
  s.push(`import structureCss from './${name}.structure.css?inline';`);
  s.push(`import themeCss from './${name}.theme.css?inline';`);
  s.push(``);
  s.push(`const SHEET = new CSSStyleSheet();`);
  s.push(`SHEET.replaceSync(structureCss + '\\n' + themeCss);`);
  s.push(``);
  s.push(`// Built ONCE at module scope and cloned per instance. This is the whole render model:`);
  s.push(`// clone, then mutate attributes. It is enough because a contract's anatomy is STATIC —`);
  s.push(`// every part always exists, and \`visibleWhen\` hides rather than removes.`);
  s.push(`const TEMPLATE = document.createElement('template');`);
  s.push(`TEMPLATE.innerHTML = \``);
  for (const line of tpl) s.push(line);
  s.push(`\`;`);
  s.push(``);
  if (needsIds) {
    s.push(`// A counter, because the platform has no useId. It matters less here than anywhere:`);
    if (supplied.size) {
      s.push(
        `// most ids below are scoped to this element's own shadow root. The exception is an id`,
      );
      s.push(`// given to a SLOTTED element that has none, which lives in the consumer's tree.`);
    } else s.push(`// every id below is scoped to this element's own shadow root.`);
    s.push(`let nextId = 0;`);
    s.push(``);
  }
  if (dismissCauses.length) {
    s.push(`// Transcribed from ${name}.contract.json > dismisses. Cases in`);
    s.push(`// @ds/contracts/conformance/dismissal.json.`);
    if (dismissCauses.length !== dismisses.on.length) {
      const left = dismisses.on.filter((c) => !dismissCauses.includes(c));
      s.push(`// The contract also declares ${left.join(' and ')}, supplied by the platform.`);
    }
    s.push(
      `const DISMISSAL: DismissalOptions = { on: [${dismissCauses.map((c) => `'${c}'`).join(', ')}] };`,
    );
    s.push(``);
  }
  if (range) {
    s.push(`// Transcribed from ${name}.contract.json: the \`range\` block plus min/max/step.`);
    s.push(`const RANGE: RangeOptions = {`);
    s.push(`  min: ${rangeState.min},`);
    s.push(`  max: ${rangeState.max},`);
    s.push(`  step: ${rangeState.step},`);
    s.push(`  orientation: '${range.orientation}',`);
    if (range.pageStep !== undefined) s.push(`  pageStep: ${range.pageStep},`);
    s.push(`};`);
    s.push(``);
  }
  if (navigation) {
    s.push(`// Transcribed field for field from ${name}.contract.json > collection.navigation.`);
    s.push(`const NAVIGATION: NavigationOptions = {`);
    for (const [k, v] of Object.entries(navigation)) {
      s.push(`  ${k}: ${typeof v === 'string' ? `'${v}'` : String(v)},`);
    }
    s.push(`};`);
    s.push(``);
  }
  if (collection) {
    s.push(`/** Fired on the collection whenever the selection or the roster changes. */`);
    s.push(
      `export const ${name.toUpperCase()}_CHANGE = '${prefix}-${kebab(name)}-internal-change';`,
    );
    s.push(``);
  }

  // --- the class -------------------------------------------------------------------------
  const observed = [...inputs, ...axes, ...models, ...(identity ? [identity] : [])].map(
    (p) => p.attribute,
  );
  if (acceptsLabel) observed.push('aria-label');
  if (namedPartName) observed.push('aria-labelledby');
  // A sibling references this host BY ID, so a consumer changing it must re-pair the siblings.
  if (hostRoot && member) observed.push('id');
  s.push(`export class ${className} extends HTMLElement {`);
  s.push(`  static readonly tagName = '${tag}';`);
  if (form) s.push(`  static readonly formAssociated = true;`);
  if (observed.length) {
    s.push(`  static readonly observedAttributes = [${observed.map((a) => `'${a}'`).join(', ')}];`);
  }
  s.push(``);
  if (commitEditing) {
    s.push(`  #editingDraft = '';`);
    s.push(`  #draftSource: string | undefined;`);
  }
  if (form) s.push(`  readonly #internals = this.attachInternals();`);
  // ADR 0008: everything a host-root member writes onto its consumer-owned host goes
  // through the supplied-relations ownership policy, so consumer values survive and only ours leave.
  if (hostRoot) s.push(`  readonly #host = supplyRelations('${name}');`);
  if (form) {
    s.push(`  #formDisabled = false;`);
    s.push(`  #customValidity = '';`);
    s.push(`  #initialFormValue: ${formModel.type} | undefined;`);
  }
  s.push(`  readonly #root: HTMLElement;`);
  if (range) s.push(`  readonly #track: HTMLElement;`);
  if (needsIds) s.push(`  readonly #baseId = '${prefix}-${kebab(name)}-' + nextId++;`);
  if (member) s.push(`  #collection: ${member.of} | null = null;`);
  if (collection && form) s.push(`  #interactionVersion = 0;`);
  if (registers) s.push(`  #registeredValue: string | null = null;`);
  if (hasActivation) s.push(`  readonly #pendingActivations = new Set<number>();`);
  if (dismissCauses.length) s.push(`  readonly #dismissal;`);
  if (supplied.size) s.push(`  readonly #supplied = supplyRelations('${name}');`);
  if (range) s.push(`  readonly #range;`);
  if (navigation) s.push(`  readonly #nav;`);
  s.push(``);

  s.push(`  constructor() {`);
  s.push(`    super();`);
  // `delegatesFocus` — a platform feature where React needed `refTarget` to stand in for one.
  const delegates =
    registers || hostRoot
      ? false
      : (binding.delegatesFocus ??
        Boolean(contract.semantics?.focusable || rootToggles || activator));
  s.push(`    const shadow = this.attachShadow({ mode: 'open', delegatesFocus: ${delegates} });`);
  s.push(`    shadow.adoptedStyleSheets = [SHEET];`);
  s.push(`    shadow.append(TEMPLATE.content.cloneNode(true));`);
  s.push(`    this.#root = shadow.querySelector('[part="${root.part}"]')!;`);
  if (range) s.push(`    this.#track = shadow.querySelector('[part="${range.track}"]')!;`);
  s.push(``);
  if (dismissCauses.length) {
    const v = camel(dismisses.state);
    s.push(`    this.#dismissal = useDismissal(`);
    s.push(`      DISMISSAL,`);
    s.push(`      () => this.${v},`);
    if (platformModal === dismisses.state) {
      s.push(`      // A platform modal is closed BY THE ELEMENT, never by writing the state.`);
      s.push(`      () => (this.#root as HTMLDialogElement).${visibilityOf(el, WEB).hide}(),`);
    } else {
      s.push(`      () => {`);
      s.push(`        this.${v} = false;`);
      s.push(`        this.#emit('${kebab(dismisses.state)}-change', false);`);
      s.push(`      },`);
    }
    s.push(`    );`);
  }
  if (range) {
    const v = camel(range.state);
    s.push(`    this.#range = useRangeControl(`);
    s.push(`      RANGE,`);
    s.push(`      () => this.${v},`);
    s.push(`      (next: number) => {`);
    s.push(`        this.${v} = next;`);
    s.push(`        this.#emit('${kebab(range.state)}-change', next);`);
    s.push(`      },`);
    s.push(
      `      () => ${form ? 'this.disabled || this.#formDisabled' + (hasReadOnly ? ' || this.readOnly' : '') : hasDisabled ? 'this.disabled' : 'false'},`,
    );
    s.push(`      () => this.#track,`);
    s.push(`      () => this.#update(),`);
    s.push(`    );`);
  }
  if (navigation) {
    s.push(`    this.#nav = useLinearNavigation(`);
    s.push(`      NAVIGATION,`);
    s.push(`      () => this.value,`);
    s.push(`      (v: string) => this.toggle(v),`);
    s.push(`    );`);
  }
  s.push(``);
  // --- event wiring. NOTHING TO COMPOSE, and the reason is the DOM.
  if (namedSlots.length) {
    s.push(`    this.#watchSlots(shadow);`);
    s.push(``);
  }
  if (supplied.size) {
    s.push(
      `    // A replaced or removed slotted element is re-wired, and the old one handed back clean.`,
    );
    s.push(`    shadow.addEventListener('slotchange', () => this.#wireSupplied());`);
    for (const [key, rel] of supplied) {
      if (!rel.namedBy) continue;
      const labelPart = contract.anatomy.root.parts?.[rel.namedBy]?.part ?? rel.namedBy;
      s.push(
        `    // A native <label for> cannot reach across the shadow boundary, so clicking the`,
      );
      s.push(
        `    // ${rel.namedBy} part focuses the slotted ${key} directly. Focus only: a checkable`,
      );
      s.push(`    // control is not toggled the way a native label would toggle it.`);
      s.push(`    this.#part('${labelPart}')?.addEventListener('click', () => {`);
      s.push(`      const control = this.#supplied.single(this.#slot('${rel.slot}'));`);
      s.push(`      if (control instanceof HTMLElement) control.focus();`);
      s.push(`    });`);
    }
    s.push(``);
  }
  s.push(
    `    // Listeners are additive, but internal listeners run before host bubbling listeners.`,
  );
  if (hasActivation) {
    s.push(`    // Queue click activation so the consumer can cancel it before state changes.`);
  }
  const listeners = [];
  if (rootToggles || activator) {
    const target =
      activator && activator.key !== 'root'
        ? `[part="${activator.node.part}"]`
        : hostRoot
          ? 'host'
          : null;
    listeners.push([target, 'click', 'this.#queueActivation(event as MouseEvent)']);
    // The host is the control, so it supplies the keyboard activation a native button gave.
    if (target === 'host') {
      listeners.push(['host', 'keydown', 'this.#keyActivation(event as KeyboardEvent)']);
      listeners.push(['host', 'keypress', 'this.#keyActivation(event as KeyboardEvent)']);
      listeners.push(['host', 'keyup', 'this.#keyActivation(event as KeyboardEvent)']);
      // Focus leaving disarms a Space press, as it does on a native button.
      listeners.push(['host', 'blur', 'this.#spaceDown = null']);
    }
  }
  if (range) {
    listeners.push([null, 'keydown', 'this.#range.onKeyDown(event as KeyboardEvent)']);
    if (range.drag) {
      listeners.push([null, 'pointerdown', 'this.#range.onPointerDown(event as PointerEvent)']);
      listeners.push([null, 'pointermove', 'this.#range.onPointerMove(event as PointerEvent)']);
      listeners.push([null, 'pointerup', 'this.#range.onPointerUp(event as PointerEvent)']);
      listeners.push([null, 'pointercancel', 'this.#range.onPointerUp(event as PointerEvent)']);
    }
  }
  if (dismissCauses.includes('escape')) {
    listeners.push([null, 'keydown', 'this.#dismissal.onKeyDown(event as KeyboardEvent)']);
  }
  if (dismissCauses.includes('outside-press')) {
    listeners.push([null, 'pointerdown', 'this.#dismissal.onPointerDown(event as PointerEvent)']);
    listeners.push([null, 'pointercancel', 'this.#dismissal.onPointerCancel()']);
    listeners.push([null, 'click', 'this.#dismissal.onClick(event as MouseEvent)']);
  }
  if (navigation) listeners.push([null, 'keydown', 'this.#nav.onKeyDown(event as KeyboardEvent)']);
  if (nativelyEdited) {
    if (commitEditing)
      listeners.push([
        null,
        'input',
        'this.#editingDraft = (event.target as HTMLInputElement).value',
      ]);
    listeners.push([null, commitEditing ? 'blur' : 'input', 'this.#handleInput(event)']);
  }

  for (const [target, event, call] of listeners) {
    const on =
      target === 'host' ? 'this' : target ? `shadow.querySelector('${target}')!` : `this.#root`;
    // `() =>` when the call ignores the event. `noUnusedParameters` is on, and a declared-and-unused
    // parameter is an error rather than a style note.
    const arg = call.includes('event') ? '(event)' : '()';
    s.push(`    ${on}.addEventListener('${event}', ${arg} => ${call});`);
  }
  if (platformModal) {
    const vis = visibilityOf(el, WEB);
    s.push(``);
    s.push(`    // The dialog closes ITSELF on Escape, so this element is no longer the only`);
    s.push(`    // writer of its own state. Synced from the element's own \`${vis.reflects}\``);
    s.push(`    // attribute rather than a \`close\` event, which is measured unreliable.`);
    s.push(`    new MutationObserver(() => {`);
    s.push(`      // Disconnect closes presentation without changing the requested public state.`);
    s.push(`      if (!this.isConnected) return;`);
    s.push(
      `      if (!(this.#root as HTMLDialogElement).${vis.reflects} && this.${camel(platformModal)}) {`,
    );
    s.push(`        this.${camel(platformModal)} = false;`);
    s.push(`        this.#emit('${kebab(platformModal)}-change', false);`);
    s.push(`      }`);
    s.push(
      `    }).observe(this.#root, { attributes: true, attributeFilter: ['${vis.reflects}'] });`,
    );
  }
  s.push(`  }`);
  s.push(``);

  if (registers && !hostRoot) {
    s.push(
      `  /** Roving members focus the semantic root directly, including tabindex=-1 targets. */`,
    );
    s.push(`  override focus(options?: FocusOptions): void { this.#root.focus(options); }`);
    s.push(``);
  }
  // --- lifecycle
  if (namedSlots.length) {
    assume(
      'whether a named slot is filled',
      `reflected to the host as has-<slot>, updated on slotchange`,
      'THE LIGHT-DOM BACKENDS GET THIS FREE AND NEVER NOTICE. React renders `{iconStart}` and an unfilled slot leaves an EMPTY element, so `:empty { display: none }` works. A shadow root always contains a <slot> element whether or not anything is assigned to it, so `:empty` never matches and an unfilled icon box keeps its size. CSS cannot ask whether a slot has assigned nodes, so the component has to answer it: a `slotchange` listener per named slot, reflecting `has-<name>` onto the host. This is not an invention — it is what every shipping web-component library does, and it is a real obligation the contract creates and cannot express.',
    );
    s.push(`  /**`);
    s.push(`   * Reflect whether each named slot is filled.`);
    s.push(`   *`);
    s.push(
      `   * CSS cannot ask a <slot> whether anything was assigned to it, and a shadow root always`,
    );
    s.push(
      `   * contains the element whether or not it is filled — so \`:empty\`, which is how the`,
    );
    s.push(`   * light-DOM backends hide an unused icon box, never matches here.`);
    s.push(`   */`);
    s.push(`  #watchSlots(shadow: ShadowRoot): void {`);
    s.push(`    for (const slot of shadow.querySelectorAll<HTMLSlotElement>('slot[name]')) {`);
    s.push(`      const name = slot.getAttribute('name')!;`);
    s.push(`      const sync = () =>`);
    s.push(`        this.toggleAttribute('has-' + name, slot.assignedNodes().length > 0);`);
    s.push(`      slot.addEventListener('slotchange', sync);`);
    s.push(`      sync();`);
    s.push(`    }`);
    s.push(`  }`);
    s.push(``);
  }

  s.push(`  connectedCallback(): void {`);
  if (form) s.push(`    this.#initialFormValue ??= this.${form.property};`);
  if (member) {
    s.push(`    this.#collection = this.closest<${member.of}>(`);
    s.push(`      '${tagFor(member.of, prefix)}',`);
    s.push(`    );`);
    s.push(`    if (!this.#collection) {`);
    s.push(
      `      throw new Error('<${tag}> must be inside a <${tagFor(member.of, prefix)}>. There is no selection to compare against, and looking unselected would hide the mistake.');`,
    );
    s.push(`    }`);
    s.push(`    this.#collection.addEventListener(`);
    s.push(`      ${member.of.toUpperCase()}_CHANGE,`);
    s.push(`      this.#onCollectionChange,`);
    s.push(`    );`);
  }
  s.push(`    this.#update();`);
  if (linked.length || (hostRoot && member)) {
    s.push(`    // Joining changes who this member's siblings pair with (ADR 0008).`);
    s.push(`    this.#collection.relink();`);
  }
  s.push(`  }`);
  s.push(``);
  if (member || platformModal || hasActivation || supplied.size) {
    s.push(`  disconnectedCallback(): void {`);
    if (supplied.size) s.push(`    this.#supplied.release();`);
    if (hasActivation) {
      s.push(`    for (const timer of this.#pendingActivations) window.clearTimeout(timer);`);
      s.push(`    this.#pendingActivations.clear();`);
    }
    if (hasActivation && hostRoot && !(activator && activator.key !== ROOT_KEY)) {
      s.push(`    this.#spaceDown = null;`);
    }
    if (member && hostRoot) {
      // DETACH FIRST. Releasing the host writes attributes this element observes (`id`), and a
      // write that still saw the collection would re-register this leaving member with it.
      s.push(`    const collection = this.#collection;`);
      s.push(`    this.#collection = null;`);
      s.push(
        `    collection?.removeEventListener(${member.of.toUpperCase()}_CHANGE, this.#onCollectionChange);`,
      );
      if (registers) {
        s.push(`    const previous = this.#registeredValue;`);
        s.push(`    this.#registeredValue = null;`);
        s.push(`    if (previous !== null) collection?.unregister(previous);`);
      }
      s.push(
        `    // Leaving: give the consumer's host back exactly what it had before this component`,
      );
      s.push(`    // wrote to it, and let the siblings re-pair without this member.`);
      s.push(`    this.#host.release();`);
      s.push(`    collection?.relink();`);
    } else if (member) {
      s.push(`    this.#collection?.removeEventListener(`);
      s.push(`      ${member.of.toUpperCase()}_CHANGE,`);
      s.push(`      this.#onCollectionChange,`);
      s.push(`    );`);
      if (registers) {
        s.push(`    const previous = this.#registeredValue;`);
        s.push(`    this.#registeredValue = null;`);
        s.push(`    if (previous !== null) this.#collection?.unregister(previous);`);
      }
      s.push(`    this.#collection = null;`);
    }
    if (platformModal) {
      s.push(`    // Reset native presentation so reconnect can establish modality again.`);
      s.push(`    (this.#root as HTMLDialogElement).${visibilityOf(el, WEB).hide}();`);
    }
    s.push(`  }`);
    s.push(``);
  }
  if (member) {
    s.push(`  readonly #onCollectionChange = () => this.#update();`);
    s.push(``);
  }
  s.push(`  attributeChangedCallback(): void {`);
  s.push(`    // Cheap on purpose: every change re-writes every derived attribute. There is no`);
  s.push(`    // diffing here and none is wanted — the work is a handful of setAttribute calls.`);
  s.push(`    this.#update();`);
  if (collection) s.push(`    this.#announce();`);
  if (hostRoot && member) {
    s.push(`    // An identity change re-pairs this member and its siblings (ADR 0008).`);
    s.push(`    this.#collection?.relink();`);
  }
  s.push(`  }`);
  s.push(``);

  // --- the accessors, one per surface entry
  for (const p of [...inputs, ...axes, ...models, ...(identity ? [identity] : [])]) {
    const d = (p.description ?? '').replace(/\s+/g, ' ');
    s.push(`  /** ${d} */`);
    if (p.kind === 'boolean') {
      s.push(`  get ${p.name}(): boolean {`);
      s.push(`    return this.hasAttribute('${p.attribute}');`);
      s.push(`  }`);
      s.push(`  set ${p.name}(value: boolean) {`);
      s.push(`    this.toggleAttribute('${p.attribute}', Boolean(value));`);
      s.push(`  }`);
    } else if (p.kind === 'number') {
      s.push(`  get ${p.name}(): number {`);
      s.push(`    const raw = this.getAttribute('${p.attribute}');`);
      s.push(`    return raw === null ? ${p.default} : Number(raw);`);
      s.push(`  }`);
      s.push(`  set ${p.name}(value: number) {`);
      s.push(`    this.setAttribute('${p.attribute}', String(value));`);
      s.push(`  }`);
    } else if (p.kind === 'tokens') {
      s.push(`  get ${p.name}(): string[] {`);
      s.push(`    // Space separated, like every other token list the platform has — class, rel,`);
      s.push(`    // aria-describedby. An attribute is a string and something had to be chosen.`);
      s.push(
        `    return (this.getAttribute('${p.attribute}') ?? '').split(/\\s+/).filter(Boolean);`,
      );
      s.push(`  }`);
      s.push(`  set ${p.name}(value: string[]) {`);
      s.push(`    this.setAttribute('${p.attribute}', value.join(' '));`);
      s.push(`  }`);
    } else if (p.kind === 'enum') {
      const dflt = p.default ?? (p.type.split(' | ')[0] ?? "''").replace(/'/g, '');
      s.push(`  get ${p.name}(): ${p.type} {`);
      s.push(`    return (this.getAttribute('${p.attribute}') ?? '${dflt}') as ${p.type};`);
      s.push(`  }`);
      s.push(`  set ${p.name}(value: ${p.type}) {`);
      s.push(`    this.setAttribute('${p.attribute}', value);`);
      s.push(`  }`);
    } else {
      s.push(`  get ${p.name}(): string {`);
      s.push(
        `    return this.getAttribute('${p.attribute}') ?? ${JSON.stringify(p.default ?? '')};`,
      );
      s.push(`  }`);
      s.push(`  set ${p.name}(value: string) {`);
      s.push(`    this.setAttribute('${p.attribute}', value);`);
      s.push(`  }`);
    }
    s.push(``);
  }

  // `#isDisabled` only where something reads it. A TabPanel is a member that nothing activates and
  // nothing registers, so it has no use for one — and `noUnusedLocals` makes an unused private
  // member an error rather than dead weight.
  if (member && (registers || activator || rootToggles)) {
    s.push(`  get #isDisabled(): boolean {`);
    s.push(
      `    return ${hasDisabled ? 'this.disabled || ' : ''}Boolean(this.#collection?.hasAttribute('disabled') || this.#collection?.matches(':disabled'));`,
    );
    s.push(`  }`);
    s.push(``);
  }
  if (member) {
    s.push(`  get #selected(): boolean {`);
    s.push(
      `    return ${memberMany ? `Boolean(this.#collection?.value.includes(this.${member.identity}))` : `this.#collection?.value === this.${member.identity}`};`,
    );
    s.push(`  }`);
    s.push(``);
  }

  if (collection) {
    s.push(
      `  /** Internal member protocol: invalidate queued activation after a form lifecycle change. */`,
    );
    s.push(
      `  get interactionVersion(): number { return ${form ? 'this.#interactionVersion' : '0'}; }`,
    );
  }
  // --- the collection's API, called by members
  if (selShared) {
    const idn = collection.identity;
    s.push(`  /** Called by a member when it is activated. */`);
    s.push(`  toggle(member${pascal(idn)}: string): void {`);
    if (form)
      s.push(
        `    if (this.disabled || this.#formDisabled${hasReadOnly ? ' || this.readOnly' : ''}) return;`,
      );
    if (many) {
      s.push(`    const current = this.value;`);
      s.push(`    this.value = current.includes(member${pascal(idn)})`);
      s.push(`      ? current.filter((v) => v !== member${pascal(idn)})`);
      s.push(`      : [...current, member${pascal(idn)}];`);
    } else if (collection.selection.cardinality === 'at-most-one') {
      s.push(`    this.value = this.value === member${pascal(idn)} ? '' : member${pascal(idn)};`);
    } else {
      s.push(`    if (this.value === member${pascal(idn)}) return;`);
      s.push(`    this.value = member${pascal(idn)};`);
    }
    s.push(`    this.#emit('value-change', this.value);`);
    s.push(`    this.#announce();`);
    s.push(`  }`);
    s.push(``);
    s.push(`  /** The id root every member's parts hang off. */`);
    s.push(`  get baseId(): string {`);
    s.push(`    return this.#baseId;`);
    s.push(`  }`);
    s.push(``);
    if (navigation) {
      s.push(
        `  register(value: string, entry: { element: HTMLElement | null; disabled: boolean }) {`,
      );
      s.push(`    // ANNOUNCES ONLY WHEN SOMETHING MOVED. A member re-registers from its own`);
      s.push(`    // update, and an announcement is what makes every member update — so`);
      s.push(`    // announcing unconditionally is an infinite loop. It froze the tab.`);
      s.push(`    if (this.#nav.register(value, entry)) this.#announce();`);
      s.push(`  }`);
      s.push(``);
      s.push(`  unregister(value: string): void {`);
      s.push(`    if (this.#nav.unregister(value)) this.#announce();`);
      s.push(`  }`);
      s.push(``);
      s.push(`  isTabStop(value: string): boolean {`);
      s.push(`    return this.#nav.isTabStop(value);`);
      s.push(`  }`);
      s.push(``);
    }
    const pairsHosts = [collection.items]
      .flat()
      .some((item) =>
        realizesRootOnHost(
          item,
          readJson(join(CONTRACTS, 'components', item, `${item}.contract.json`)),
          CONTRACTS,
        ),
      );
    if (pairsHosts) {
      const idAttr = kebab(collection.identity);
      s.push(`  /**`);
      s.push(
        `   * The sibling member of kind \`kind\` that \`member\` is paired with, by identity`,
      );
      s.push(`   * (ADR 0008). Only the FIRST member of each kind with a given identity pairs, in`);
      s.push(
        `   * document order: a duplicate identity, or no sibling of that identity, pairs with`,
      );
      s.push(
        `   * nothing — a missing relation rather than one naming the wrong element. Members of a`,
      );
      s.push(`   * nested collection belong to it, not to this one.`);
      s.push(`   */`);
      s.push(`  pairOf(member: HTMLElement, kind: string): HTMLElement | null {`);
      s.push(`    const identity = member.getAttribute('${idAttr}') ?? '';`);
      s.push(`    const ofKind = (selector: string) =>`);
      s.push(`      [...this.querySelectorAll<HTMLElement>(selector)].filter(`);
      s.push(
        `        (el) => el.closest<HTMLElement>('${tag}') === this && (el.getAttribute('${idAttr}') ?? '') === identity,`,
      );
      s.push(`      );`);
      s.push(`    if (ofKind(member.localName)[0] !== member) return null;`);
      s.push(`    return ofKind(kind)[0] ?? null;`);
      s.push(`  }`);
      s.push(``);
      s.push(
        `  /** A member joined, left or changed identity: every member re-reads its pairing. */`,
      );
      s.push(`  relink(): void {`);
      s.push(`    this.#announce();`);
      s.push(`  }`);
      s.push(``);
    }
    s.push(`  /** Tell every member to re-read us. The DOM's answer to a re-render. */`);
    s.push(`  #announce(): void {`);
    s.push(`    this.dispatchEvent(new Event(${name.toUpperCase()}_CHANGE));`);
    s.push(`  }`);
    s.push(``);
  }

  // --- activation
  if (hasActivation) {
    const what = activator?.node.activates.toggles ?? rootToggles;
    const guards = [];
    if (member) guards.push('this.#isDisabled');
    else if (hasDisabled)
      guards.push(form ? 'this.disabled || this.#formDisabled' : 'this.disabled');
    if (hasReadOnly) guards.push('this.readOnly');
    s.push(`  #queueActivation(event: MouseEvent): void {`);
    s.push(`    if (!this.isConnected || event.defaultPrevented) return;`);
    if (guards.length) s.push(`    if (${guards.join(' || ')}) return;`);
    if (member) {
      s.push(`    const collection = this.#collection;`);
      s.push(`    const version = collection?.interactionVersion;`);
      s.push(`    const value = this.${member.identity};`);
    }
    s.push(`    // A task, not a microtask: trusted events can checkpoint between listeners.`);
    s.push(`    const timer = window.setTimeout(() => {`);
    s.push(`      this.#pendingActivations.delete(timer);`);
    s.push(`      if (!this.isConnected) return;`);
    if (member) {
      s.push(
        `      if (collection !== this.#collection || value !== this.${member.identity} || version !== collection?.interactionVersion) return;`,
      );
    }
    s.push(`      this.#activate(event);`);
    s.push(`    }, 0);`);
    s.push(`    this.#pendingActivations.add(timer);`);
    s.push(`  }`);
    s.push(``);
    s.push(`  #activate(event: MouseEvent): void {`);
    s.push(`    // Recheck cancellation and availability after every host listener has run.`);
    s.push(`    if (event.defaultPrevented) return;`);
    if (guards.length) s.push(`    if (${guards.join(' || ')}) return;`);
    if (what === 'member') {
      s.push(`    this.#collection?.toggle(this.${member.identity});`);
    } else {
      const v = camel(what);
      const def = contract.states?.[what];
      const between = (activator?.node.activates ?? root.activates)?.between;
      if (def?.values && between) {
        s.push(
          `    this.${v} = this.${v} === '${between[1]}' ? '${between[0]}' : '${between[1]}';`,
        );
      } else if (def?.values) {
        s.push(`    const order = [${def.values.map((x) => `'${x}'`).join(', ')}] as const;`);
        s.push(`    this.${v} = order[(order.indexOf(this.${v}) + 1) % order.length]!;`);
      } else {
        s.push(`    this.${v} = !this.${v};`);
      }
      s.push(`    this.#emit('${kebab(what)}-change', this.${v});`);
    }
    s.push(`  }`);
    s.push(``);
  }
  if (hasActivation && hostRoot && !(activator && activator.key !== ROOT_KEY)) {
    s.push(`  /**`);
    s.push(`   * What a native button did for free, now that the host is the control (ADR 0008):`);
    s.push(`   * Enter clicks on keydown, Space on keyup. The click is DISPATCHED, so it reaches`);
    s.push(`   * #queueActivation and every consumer click listener like a pointer click, and it`);
    s.push(`   * waits a task so a cancelled Enter keydown or Space keyup still cancels it.`);
    s.push(`   *`);
    s.push(`   * Space, as on a native button, activates only if its KEYDOWN was not cancelled.`);
    s.push(
      `   * That keydown is kept and read at keyup, when its dispatch is long complete, so every`,
    );
    s.push(
      `   * listener in every order — window listeners, stopPropagation included — has had its`,
    );
    s.push(
      `   * say. The page scroll a Space press causes is prevented on KEYPRESS, which leaves the`,
    );
    s.push(
      `   * keydown's defaultPrevented the consumer's alone. Measured in Chromium, Firefox and`,
    );
    s.push(
      `   * WebKit: the scroll is the keypress default action, and a cancelled keydown fires no`,
    );
    s.push(
      `   * keypress. keypress is deprecated; an engine that stopped firing it would scroll the`,
    );
    s.push(`   * page on Space, which is visible, rather than mis-activate.`);
    s.push(`   */`);
    s.push(`  #keyActivation(event: KeyboardEvent): void {`);
    s.push(
      `    if (event.target !== this || event.altKey || event.ctrlKey || event.metaKey) return;`,
    );
    s.push(`    if (event.key === ' ') {`);
    s.push(`      if (event.type === 'keypress') {`);
    s.push(`        event.preventDefault();`);
    s.push(`        return;`);
    s.push(`      }`);
    s.push(`      if (event.type === 'keydown') {`);
    s.push(`        this.#spaceDown = event;`);
    s.push(`        return;`);
    s.push(`      }`);
    s.push(`      const down = this.#spaceDown;`);
    s.push(`      this.#spaceDown = null;`);
    s.push(`      if (!down || down.defaultPrevented) return;`);
    s.push(`    } else if (!(event.type === 'keydown' && event.key === 'Enter')) return;`);
    s.push(`    const timer = window.setTimeout(() => {`);
    s.push(`      this.#pendingActivations.delete(timer);`);
    s.push(`      if (this.isConnected && !event.defaultPrevented) this.click();`);
    s.push(`    }, 0);`);
    s.push(`    this.#pendingActivations.add(timer);`);
    s.push(`  }`);
    s.push(``);
    s.push(
      `  /** The Space press in progress: its keydown, until keyup or focus leaving the host. */`,
    );
    s.push(`  #spaceDown: KeyboardEvent | null = null;`);
    s.push(``);
  }

  if (nativelyEdited) {
    const v = camel(valueState.from);
    s.push(`  #handleInput(event: Event): void {`);
    if (form)
      s.push(
        `    if (this.disabled || this.#formDisabled${hasReadOnly ? ' || this.readOnly' : ''}) return;`,
      );
    s.push(`    const next = (event.target as HTMLInputElement).value;`);
    if (commitEditing) s.push(`    if (next === this.${v}) return;`);
    s.push(`    this.${v} = next;`);
    s.push(`    this.#emit('${valueState.attribute}-change', this.${v});`);
    s.push(`  }`);
    s.push(``);
  }

  if (models.length && s.some((l) => l.includes('this.#emit('))) {
    s.push(`  /**`);
    s.push(`   * Announce a \`shared\` state changing.`);
    s.push(`   *`);
    s.push(
      `   * \`composed: true\` so it escapes this shadow root at all, and \`bubbles: true\` so a`,
    );
    s.push(`   * listener on an ancestor hears it. Both are opt-in: an event that crossed the`);
    s.push(`   * boundary by default would leak every internal click to the page.`);
    s.push(`   */`);
    s.push(`  #emit(type: string, detail: unknown): void {`);
    s.push(
      `    this.dispatchEvent(new CustomEvent('${prefix}-' + type, { detail, bubbles: true, composed: true }));`,
    );
    s.push(`  }`);
    s.push(``);
  }

  // --- #update: everything derived, rewritten
  // A RE-ENTRANCY GUARD, as a second line of defence behind the fix above. `#update()` writes
  // attributes, and writing one this element observes calls `attributeChangedCallback`, which calls
  // `#update()`. Most of those writes land on the inner element and are safe; a member also
  // re-registers with its collection from here, and one version of that recursed until the tab
  // stopped responding.
  const reflected = props.filter((p) => p.kind === 'enum' && p.default);

  s.push(`  #updating = false;`);
  s.push(``);
  s.push(`  #update(): void {`);
  s.push(
    `    // Writing an attribute this element observes re-enters here. The collection no longer`,
  );
  s.push(`    // announces unless something moved, which is the real fix; this is the cheap`);
  s.push(`    // guarantee that no future write can reintroduce the same shape.`);
  s.push(`    if (this.#updating) return;`);
  s.push(`    this.#updating = true;`);
  s.push(`    try {`);
  s.push(`      this.#write();`);
  s.push(`    } finally {`);
  s.push(`      this.#updating = false;`);
  s.push(`    }`);
  s.push(`  }`);
  s.push(``);
  s.push(`  #write(): void {`);
  s.push(`    const root = this.#root;`);
  if (hostRoot) {
    s.push(
      `    // The host IS this component's root: its role and states are attributes ON THE HOST,`,
    );
    s.push(
      `    // collected here and written at the end under the supplied-relations ownership policy.`,
    );
    s.push(`    const owned: Record<string, string | null> = { role: '${rootRole}' };`);
  }
  if (acceptsLabel) {
    s.push(
      `    // The semantic control is inside the shadow root; naming only the host misses it.`,
    );
    const target = namedPartName ? `this.#part('${namedPartName}')!` : 'root';
    s.push(`    const label = this.getAttribute('aria-label');`);
    s.push(`    if (label === null) ${target}.removeAttribute('aria-label');`);
    s.push(`    else ${target}.setAttribute('aria-label', label);`);
    if (namedPartName) {
      // ADR 0007 + 0008: aria-labelledby names ids in the CONSUMER's tree, which an IDREF cannot
      // reach from inside this shadow root. Resolve them in the host's own tree and link the
      // elements instead: element reflection keeps a target in a shadow-including ancestor tree.
      s.push(
        `    // aria-labelledby names ids in the consumer's tree, which no IDREF can reach from`,
      );
      s.push(
        `    // inside this shadow root. They are resolved HERE, in the host's own tree, and the`,
      );
      s.push(
        `    // elements are linked instead. Resolved when the attribute changes or the element`,
      );
      s.push(
        `    // connects: a label element inserted later is not picked up until one of those.`,
      );
      s.push(
        `    // Detached, the root node is this element itself, which has no getElementById: link`,
      );
      s.push(`    // nothing then — connectedCallback writes again and resolves in the real tree.`);
      s.push(`    const scope = this.getRootNode();`);
      s.push(
        `    const tree = scope instanceof Document || scope instanceof ShadowRoot ? scope : null;`,
      );
      s.push(`    const labels = (tree ? (this.getAttribute('aria-labelledby') ?? '') : '')`);
      s.push(`      .split(/\\s+/)`);
      s.push(`      .filter(Boolean)`);
      s.push(`      .map((id) => tree!.getElementById(id))`);
      s.push(`      .filter((el): el is HTMLElement => el !== null);`);
      s.push(
        `    ${target}.${relationElementsProperty('namedBy', WEB)} = labels.length ? labels : null;`,
      );
    }
  }
  if (reflected.length) {
    assume(
      'an axis default has to be written into the DOM',
      `reflected on connect: ${reflected.map((p) => `${p.attribute}="${p.default}"`).join(', ')}`,
      'THE DEFAULT LIVED ONLY IN JAVASCRIPT AND CSS COULD NOT SEE IT. A property getter can fall back to the contract default — getAttribute(hierarchy) ?? secondary — and every script that reads it gets the right answer. A stylesheet cannot: :host([hierarchy=secondary]) matches an ATTRIBUTE, and an unset button had none, so it rendered with no variant styling at all. React, Vue and Angular never meet this, because a framework prop with a default flows into the rendered attribute on the way past. Here the component has to write it down itself.',
    );
    s.push(
      `    // Write enumerated defaults into the DOM. A getter can fall back to the contract's`,
    );
    s.push(`    // default and every script sees the right value; CSS cannot, because`);
    s.push(`    // \`:host([hierarchy='secondary'])\` matches an ATTRIBUTE. Idempotent, and the`);
    s.push(`    // re-entrancy guard above absorbs the callback each write causes.`);
    for (const p of reflected) {
      s.push(
        `    if (!this.hasAttribute('${p.attribute}')) this.setAttribute('${p.attribute}', '${p.default}');`,
      );
    }
    s.push(``);
  }

  for (const [st, def] of Object.entries(contract.states ?? {})) {
    const asModel = models.find((m) => m.from === st);
    const asInput = inputs.find((p) => p.from === st);
    if (!asModel && !asInput) continue;
    const expr =
      st === 'disabled' && form
        ? '(this.disabled || this.#formDisabled)'
        : st === 'disabled' && member && (registers || activator || rootToggles)
          ? 'this.#isDisabled'
          : `this.${camel(st)}`;
    const decision = channelFor(
      {
        state: st,
        element: hostRoot ? rootEl : el,
        role: rootRole ?? null,
        hasValues: Boolean(def.values),
        hasValueType: Boolean(def.valueType),
        mustStayFocusable: st === 'disabled' && ariaDisabledOnly,
      },
      WEB,
    );
    if (def.values && decision.channel === 'aria') {
      const map = def.values
        .map((v) => `${expr} === '${v}' ? '${ariaValueFor(v, WEB)}'`)
        .join(' : ');
      // `: ''` would have written an empty attribute for a value outside the declared set, which
      // is the same defect as above wearing a ternary.
      s.push(`    {`);
      s.push(`      const next = ${map} : null;`);
      if (hostRoot) {
        s.push(`      owned['${decision.attribute}'] = next;`);
      } else {
        s.push(`      if (next === null) root.removeAttribute('${decision.attribute}');`);
        s.push(`      else root.setAttribute('${decision.attribute}', next);`);
      }
      s.push(`    }`);
      continue;
    }
    if (decision.channel === 'native' && hostRoot) {
      throw new Error(
        `${name}: state "${st}" resolves to the native "${decision.attribute}" attribute, which a host-root component (ADR 0008) does not have.`,
      );
    }
    if (decision.channel === 'native') {
      // `toggleAttribute` is RIGHT here and only here: a native boolean attribute is presence-only,
      // which is what @ds/platform-web's `native` table records.
      s.push(`    root.toggleAttribute('${decision.attribute}', ${expr});`);
    } else if (decision.channel === 'aria') {
      // AN ARIA STATE IS NOT A PRESENCE-ONLY BOOLEAN, and `rendersFalse: false` does not make it
      // one. It says only that the FALSE value is not worth writing. The true value is still the
      // string "true", and `toggleAttribute` wrote `aria-invalid=""` — which WAI-ARIA treats as
      // invalid, so the attribute's default applies and an invalid field announced as valid.
      //
      // The other three backends never had it: React's `aria-invalid={x || undefined}`, Vue's
      // `:aria-invalid="x || undefined"` and Angular's `[attr.aria-invalid]="x() || null"` all
      // stringify a `true` on the way out. This backend writes the DOM by hand, so it had to say so.
      if (hostRoot) {
        // Host-root: the state goes where the role is — on the host, as an owned attribute.
        s.push(
          decision.rendersFalse
            ? `    owned['${decision.attribute}'] = String(${expr});`
            : `    owned['${decision.attribute}'] = ${expr} ? 'true' : null;`,
        );
      } else if (decision.rendersFalse) {
        s.push(`    root.setAttribute('${decision.attribute}', String(${expr}));`);
      } else {
        s.push(`    if (${expr}) root.setAttribute('${decision.attribute}', 'true');`);
        s.push(`    else root.removeAttribute('${decision.attribute}');`);
      }
    }
    // The `data` and `none` channels write nothing to the inner element: the host already carries
    // the attribute a consumer set, and that is what the stylesheet selects.
  }
  if (member) {
    const declared = ariaAttributeFor(member.reflects, WEB);
    const attr = declared && ariaFitsRole(declared, rootRole ?? null, WEB) ? declared : null;
    if (attr) {
      // Same rule as above: the true value is the string "true", never an empty attribute.
      if (hostRoot) {
        s.push(
          rendersFalse(attr, WEB)
            ? `    owned['${attr}'] = String(this.#selected);`
            : `    owned['${attr}'] = this.#selected ? 'true' : null;`,
        );
      } else if (rendersFalse(attr, WEB)) {
        s.push(`    root.setAttribute('${attr}', String(this.#selected));`);
      } else {
        s.push(`    if (this.#selected) root.setAttribute('${attr}', 'true');`);
        s.push(`    else root.removeAttribute('${attr}');`);
      }
    }
    s.push(`    // The host carries it too, because CSS cannot select inside a shadow root from`);
    s.push(`    // outside and cannot append an attribute selector to ::part(). One fact, two`);
    s.push(`    // places — forced by the boundary, not chosen.`);
    if (hostRoot) {
      // Owned like every other host write: nothing while detached, released on disconnect.
      s.push(`    owned['${kebab(member.reflects)}'] = this.#selected ? '' : null;`);
    } else {
      s.push(`    this.toggleAttribute('${kebab(member.reflects)}', this.#selected);`);
    }
    if (registers) {
      s.push(`    if (this.#collection) {`);
      s.push(`      const value = this.${identity.name};`);
      s.push(`      const previous = this.#registeredValue;`);
      s.push(`      // Record before notifying: collection announcements are synchronous.`);
      s.push(`      this.#registeredValue = value;`);
      s.push(
        `      if (previous !== null && previous !== value) this.#collection.unregister(previous);`,
      );
      s.push(
        `      this.#collection.register(value, { element: this, disabled: this.#isDisabled });`,
      );
      s.push(`    }`);
      if (hostRoot) {
        s.push(
          `    owned['tabindex'] = this.#collection?.isTabStop(this.${identity.name}) ? '0' : '-1';`,
        );
      } else {
        s.push(`    root.setAttribute(`);
        s.push(`      'tabindex',`);
        s.push(`      this.#collection?.isTabStop(this.${identity.name}) ? '0' : '-1',`);
        s.push(`    );`);
      }
    }
  }
  // The supplied-relations key each contract relation is written under.
  const RELATION_KEY = { controls: 'controls', namedBy: 'labelledBy', describedBy: 'describedBy' };
  if (linked.length) {
    s.push(
      `    // Cross-member relations, as IDREFs between HOSTS in one tree. The collection pairs`,
    );
    s.push(
      `    // this member with the sibling of the same identity; a missing sibling, or a duplicate`,
    );
    s.push(
      `    // identity after the first, links nothing rather than something wrong. The sibling's`,
    );
    s.push(
      `    // id is whatever it carries — the consumer's own, or the fallback it assigned itself.`,
    );
    for (const { relation, target } of linked) {
      s.push(
        `    const ${RELATION_KEY[relation]}Pair = this.#collection?.pairOf(this, '${tagFor(target.member, prefix)}') ?? null;`,
      );
    }
  }
  if (range) {
    s.push(`    root.setAttribute('${WEB.range.min}', '${rangeState.min}');`);
    s.push(`    root.setAttribute('${WEB.range.max}', '${rangeState.max}');`);
    s.push(
      `    root.setAttribute('${WEB.range.value}', String(snap(this.${camel(range.state)}, RANGE)));`,
    );
    s.push(`    root.style.setProperty('--${prefix}-fraction', String(this.#range.fraction));`);
    s.push(`    this.toggleAttribute('dragging', this.#range.dragging);`);
  }
  if (hostRoot && contract.semantics?.focusable && !registers) {
    s.push(`    // Focusable by contract, and the host is the element that takes focus.`);
    s.push(`    owned['tabindex'] = '0';`);
  }
  if (!member && contract.semantics?.focusable && !registers && !isNativelyFocusable(el, WEB)) {
    s.push(
      `    root.setAttribute('tabindex', ${hasDisabled ? (form ? "(this.disabled || this.#formDisabled) ? '-1' : '0'" : "this.disabled ? '-1' : '0'") : "'0'"});`,
    );
  }
  if (nativelyEdited) {
    if (commitEditing) {
      s.push(`    if (this.#draftSource !== this.${camel(valueState.from)}) {`);
      s.push(`      this.#draftSource = this.${camel(valueState.from)};`);
      s.push(`      this.#editingDraft = this.${camel(valueState.from)};`);
      s.push(`    }`);
    }
    s.push(
      `    (root as HTMLInputElement).value = ${commitEditing ? 'this.#editingDraft' : `this.${camel(valueState.from)}`};`,
    );
    if (hasReadOnly) s.push(`    root.toggleAttribute('readonly', this.readOnly);`);
  }
  if (needsIds) {
    for (const p of allParts) {
      const relates = refsOf(p.node).length && !supplied.has(p.key);
      if (!(p.node.role || relates || referenced.has(p.key))) continue;
      // A host-root member is referenced through its host, not an inner id (ADR 0008).
      if (hostRoot && p.key === ROOT_KEY) continue;
      const target = p.key === 'root' ? 'root' : `this.#part('${p.node.part}')`;
      const id = p.key === 'root' ? `this.#baseId` : `this.#baseId + '-${p.key}'`;
      s.push(`    ${target}?.setAttribute('id', ${id});`);
    }
    for (const p of allParts) {
      const node = p.node;
      const target = p.key === 'root' ? 'root' : `this.#part('${node.part}')`;
      const idOf = (k) => (k === 'root' ? `this.#baseId` : `this.#baseId + '-${k}'`);
      if (typeof node.controls === 'string') {
        s.push(
          `    ${target}?.setAttribute('${relationAttribute('controls', WEB)}', ${idOf(node.controls)});`,
        );
        const t = Object.entries(root.parts ?? {}).find(([k]) => k === node.controls);
        if (t && t[1].visibleWhen) {
          s.push(
            `    ${target}?.setAttribute('aria-expanded', String(${stateRead(t[1].visibleWhen, member)}));`,
          );
        }
      }
      if (supplied.has(p.key)) continue;
      if (typeof node.namedBy === 'string') {
        s.push(
          `    ${target}?.setAttribute('${relationAttribute('namedBy', WEB)}', ${idOf(node.namedBy)});`,
        );
      }
      if ((node.describedBy ?? []).filter((d) => typeof d === 'string').length) {
        const pieces = node.describedBy
          .filter((d) => typeof d === 'string')
          .map((d) => {
            const t = Object.entries(root.parts ?? {}).find(([k]) => k === d);
            return t && t[1].visibleWhen
              ? `(${stateRead(t[1].visibleWhen, member)} ? ${idOf(d)} : '')`
              : idOf(d);
          });
        s.push(
          `    ${target}?.setAttribute('${relationAttribute('describedBy', WEB)}', [${pieces.join(', ')}].filter(Boolean).join(' '));`,
        );
      }
      if (node.visibleWhen && p.key !== 'root') {
        s.push(
          `    ${target}?.toggleAttribute('hidden', !(${stateRead(node.visibleWhen, member)}));`,
        );
      }
    }
  } else {
    for (const p of allParts) {
      if (p.key !== 'root' && p.node.visibleWhen) {
        s.push(
          `    this.#part('${p.node.part}')?.toggleAttribute('hidden', !(${stateRead(p.node.visibleWhen, member)}));`,
        );
      }
    }
  }
  if (supplied.size) s.push(`    this.#wireSupplied();`);
  if (form) {
    if (!contract.semantics?.focusable) s.push(`    root.setAttribute('tabindex', '-1');`);
    s.push(`    this.#syncForm();`);
  }
  if (root.visibleWhen && !platformModal) {
    s.push(
      hostRoot
        ? `    owned['hidden'] = !(${stateRead(root.visibleWhen, member)}) ? '' : null;`
        : `    this.toggleAttribute('hidden', !(${stateRead(root.visibleWhen, member)}));`,
    );
  }
  if (hostRoot) {
    const keyed = Object.fromEntries(linked.map(({ relation }) => [RELATION_KEY[relation], true]));
    s.push(
      `    // Nothing is written onto the consumer's host while it is detached: wiring happens on`,
    );
    s.push(`    // connect, and disconnectedCallback takes back exactly what was written.`);
    s.push(`    if (this.isConnected)`);
    s.push(`      this.#host.write([`);
    s.push(`        [`);
    s.push(`          this,`);
    s.push(`          {`);
    s.push(`            id: this.#baseId,`);
    for (const key of ['labelledBy', 'describedBy', 'controls'])
      if (keyed[key]) s.push(`            ${key}: [${key}Pair?.getAttribute('id')],`);
    s.push(`            attributes: owned,`);
    s.push(`          },`);
    s.push(`        ],`);
    s.push(`      ]);`);
  }
  if (platformModal) {
    const vis = visibilityOf(el, WEB);
    const v = camel(platformModal);
    s.push(
      `    // Properties may be assigned before insertion; showing needs a connected document.`,
    );
    s.push(`    if (!this.isConnected) return;`);
    s.push(
      `    // A <dialog> is opened by CALLING ${vis.show}(), never by rendering an attribute.`,
    );
    s.push(`    const dlg = root as HTMLDialogElement;`);
    s.push(`    if (this.${v} && !dlg.${vis.reflects}) dlg.${vis.show}();`);
    s.push(`    else if (!this.${v} && dlg.${vis.reflects}) dlg.${vis.hide}();`);
  }
  s.push(`  }`);
  s.push(``);
  if (form)
    s.push(
      emitFormMethods(form, formModel, {
        range: rangeState,
        hasInvalid: inputs.some((p) => p.name === 'invalid'),
        commitEditing,
        hasReadOnly,
        hasActivation,
      }),
    );
  if (supplied.size) {
    s.push(`  /**`);
    s.push(
      `   * Write each slot-filled part's relations onto the element the consumer slotted in.`,
    );
    s.push(`   *`);
    s.push(
      `   * IDREFs between LIGHT-DOM elements: the slotted control points at the slotted content of`,
    );
    s.push(
      `   * each target part, giving that content an id if it has none. Consumer ids and tokens`,
    );
    s.push(`   * are never removed; an element that left its slot gets back exactly what it had.`);
    s.push(`   */`);
    s.push(`  #wireSupplied(): void {`);
    s.push(
      `    // A slotchange queued before a disconnect still fires after it, and an attribute can`,
    );
    s.push(
      `    // change while detached. Wiring then would re-take what disconnectedCallback just`,
    );
    s.push(
      `    // handed back, on elements nobody will release again. connectedCallback re-wires.`,
    );
    s.push(`    if (!this.isConnected) return;`);
    s.push(`    const entries: [Element, SuppliedRelations][] = [];`);
    s.push(`    const content = (slot: string, key: string): string[] =>`);
    s.push(`      (this.#slot(slot)?.assignedElements({ flatten: true }) ?? []).map((el, i) => {`);
    s.push(`        const id = suppliedId(el, this.#baseId + '-' + key + '-' + i);`);
    s.push(`        entries.push([el, { id }]);`);
    s.push(`        return id;`);
    s.push(`      });`);
    const parts = Object.fromEntries(allParts.map((p) => [p.key, p.node]));
    for (const [, rel] of supplied) {
      const v = camel(rel.slot);
      s.push(`    const ${v} = this.#supplied.single(this.#slot('${rel.slot}'));`);
      s.push(`    if (${v}) {`);
      const fields = [];
      if (rel.namedBy)
        fields.push(`labelledBy: content('${slotOfPart(rel.namedBy)}', '${rel.namedBy}')`);
      if (rel.describedBy.length) {
        const pieces = rel.describedBy.map((d) => {
          const read = `content('${slotOfPart(d)}', '${d}')`;
          return parts[d]?.visibleWhen
            ? `...(${stateRead(parts[d].visibleWhen, member)} ? ${read} : [])`
            : `...${read}`;
        });
        fields.push(`describedBy: [${pieces.join(', ')}]`);
      }
      if (rel.invalidWhen) fields.push(`invalid: ${stateRead(rel.invalidWhen, member)}`);
      s.push(`      entries.push([`);
      s.push(`        ${v},`);
      // No id on the slotted element itself: nothing in its tree points AT it. The label part
      // cannot use <label for> across the boundary, which is why it focuses by click instead.
      s.push(`        { ${fields.join(', ')} },`);
      s.push(`      ]);`);
      s.push(`    }`);
    }
    s.push(`    this.#supplied.write(entries);`);
    s.push(`  }`);
    s.push(``);
    s.push(`  #slot(name: string): HTMLSlotElement | null {`);
    s.push(
      `    return this.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="' + name + '"]');`,
    );
    s.push(`  }`);
    s.push(``);
  }
  // Emitted only when something calls it: `noUnusedLocals` treats an unused private member as
  // an error, so a helper written unconditionally would fail the typecheck on half the library.
  if (s.some((l) => l.includes('this.#part('))) {
    s.push(`  #part(name: string): HTMLElement | null {`);
    s.push(`    return this.shadowRoot!.querySelector<HTMLElement>('[part="' + name + '"]');`);
    s.push(`  }`);
  } else {
    while (s.length && s[s.length - 1] === '') s.pop();
  }
  s.push(`}`);
  s.push(``);
  s.push(`if (!customElements.get(${className}.tagName)) {`);
  s.push(`  customElements.define(${className}.tagName, ${className});`);
  s.push(`}`);
  s.push(``);
  if (declareTagTypes) {
    s.push(`declare global {`);
    s.push(`  interface HTMLElementTagNameMap {`);
    s.push(`    '${tag}': ${className};`);
    s.push(`  }`);
    s.push(`}`);
    s.push(``);
  }

  void attrLit;
  // A host-root member (ADR 0008) can leave the inner root, its local alias in #write, and the id
  // root with no reader. `noUnusedLocals` makes each an error, so each is emitted only when read —
  // the same rule `#part` follows.
  const reads = (needle, skip) => s.filter((l, i) => !skip.includes(i) && l.includes(needle));
  const drop = (indexes) => indexes.sort((a, b) => b - a).forEach((i) => s.splice(i, 1));
  const aliasAt = s.indexOf(`    const root = this.#root;`);
  // A read of the LOCAL `root`: `root.x`, `root?.x`, `root as T`, or `root` as an argument.
  const localRoot = /(^|[^#\w'"-])root(\.|\?\.|\s+as\b|\s*[,)])/;
  const code = (l) => !/^\s*(\/\/|\*|\/\*)/.test(l);
  if (aliasAt !== -1 && !s.some((l, i) => i !== aliasAt && code(l) && localRoot.test(l)))
    drop([aliasAt]);
  const rootDecl = s.indexOf(`  readonly #root: HTMLElement;`);
  const rootInit = s.findIndex((l) => l.startsWith(`    this.#root = shadow.querySelector(`));
  if (rootDecl !== -1 && !reads('this.#root', [rootDecl, rootInit]).length)
    drop([rootDecl, rootInit]);
  const idDecl = s.findIndex((l) => l.startsWith(`  readonly #baseId = `));
  if (idDecl !== -1 && !reads('this.#baseId', [idDecl]).length) drop([idDecl]);
  // The module-level counter feeds only #baseId; with no id root it goes too, with its comment.
  const counter = s.indexOf(`let nextId = 0;`);
  if (counter !== -1 && !reads('nextId++', []).length) {
    let first = counter;
    while (first > 0 && s[first - 1].startsWith('// ')) first--;
    const blankAfter = s[counter + 1] === '' ? [counter + 1] : [];
    drop([...Array.from({ length: counter - first + 1 }, (_, k) => first + k), ...blankAfter]);
  }
  return s.join('\n');
}

/** How a state name reads inside the class body. */
function stateRead(spec, member) {
  const [state, value] = spec.includes('=') ? spec.split('=') : [spec, null];
  const base = member && member.reflects === state ? 'this.#selected' : `this.${camel(state)}`;
  return value === null ? base : `${base} === '${value}'`;
}

// ---------------------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------------------
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const name = process.argv[2];
  const outIdx = process.argv.indexOf('--out');
  if (!name || outIdx === -1) {
    console.error('usage: node emit.mjs <Name> --out <dir>');
    process.exit(1);
  }
  const outDir = resolve(process.cwd(), process.argv[outIdx + 1], name);

  const { contract, binding } = loadPair({
    name,
    contractsDir: CONTRACTS,
    bindingsDir: BINDINGS,
    suffix: '.wc.json',
  });
  const prefix = readJson(join(REPO_ROOT, 'ds.config.json')).dataPrefix;

  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, `${name}.ts`), emitComponent(name, contract, binding, prefix), 'utf8');
  writeFileSync(
    join(outDir, `${name}.structure.css`),
    emitStructureShadow(name, contract, prefix, assume),
    'utf8',
  );

  const themePath = join(outDir, `${name}.theme.css`);
  if (existsSync(themePath)) {
    console.log(`  kept   ${name}.theme.css (yours — never regenerated)`);
  } else {
    writeFileSync(themePath, emitThemeShadow(name, contract, WEB), 'utf8');
  }

  writeFileSync(join(outDir, 'index.ts'), `export { ${name} } from './${name}';\n`, 'utf8');

  const surface = surfaceFrom(contract);
  console.log(`\nemitted ${name} -> ${outDir}`);
  console.log(`  tag:    <${tagFor(name, prefix)}>`);
  console.log(`  attrs:  ${surface.map((p) => p.attribute).join(', ') || '(none)'}`);
  console.log(
    `  events: ${
      surface
        .filter((p) => p.event)
        .map((p) => `${prefix}-${p.event}`)
        .join(', ') || '(none)'
    }`,
  );
  console.log(
    `  slots:  ${
      slotsFrom(contract)
        .map((x) => x.name)
        .join(', ') || '(none)'
    }`,
  );
  console.log(
    `\n${EMITTER_ASSUMPTIONS.length} thing(s) the contract could not tell the emitter:\n`,
  );
  for (const a of EMITTER_ASSUMPTIONS) {
    console.log(`  ${a.topic}`);
    console.log(`      chose: ${a.decision}`);
    console.log(`      why:   ${a.why}\n`);
  }
}
