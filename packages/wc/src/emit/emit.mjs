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
import { fileURLToPath } from 'node:url';

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
  rendersFalse,
  submitsByDefault,
  visibilityOf,
} from '@ds/platform-web';

const WEB = loadProfile();

import { loadPair, memberFacts, partsOf, readJson, referencedByASibling } from '@ds/emit-web';
import { emitStructureShadow, emitThemeShadow } from './css-shadow.mjs';
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
function emitComponent(name, contract, binding, prefix) {
  const props = surfaceFrom(contract);
  const slots = slotsFrom(contract);
  const root = contract.anatomy.root;
  const el = binding.element;
  const rootRole = root.role ?? contract.semantics?.role;
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

  // --- assumptions unique to this backend -----------------------------------------------
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
  if (nativelyEdited) {
    assume(
      'what changes a natively edited value',
      "wired the DOM's own `input` event on the inner element",
      "Three of four backends now agree on `input`; React's synthetic `onChange` is the outlier. Here it is not even a choice — there is no synthetic layer to choose from.",
    );
  }
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
  const crossShadow = allParts.some((p) => refsOf(p.node).some((r) => typeof r !== 'string'));
  if (crossShadow) {
    assume(
      'AN ARIA REFERENCE CANNOT CROSS A SHADOW BOUNDARY',
      'the id is written anyway, and it resolves to nothing',
      "THE ONE THING THIS BACKEND CANNOT DO. A tab points at its panel with aria-controls, and the two live in different shadow roots — so the id names an element that, from the tab's root, does not exist. This is not an emitter shortcut: `aria-controls`, `aria-labelledby` and `aria-describedby` take IDREFs, and an IDREF is resolved within a single tree. The platform answer is ariaControlsElements (the ARIA reflection API, element references rather than ids), which ships in Chrome and Safari and not yet in Firefox. Recorded rather than worked around, because every workaround — moving the reference to light DOM, duplicating the panel, dropping the relationship — changes what the contract says.",
    );
  }

  const ctx = {
    slots: namedSlots,
    contract,
    childrenPart,
    referenced,
  };

  // --- the template ----------------------------------------------------------------------
  const rootAttrs = [`part="${root.part}"`];
  if (submitsByDefault(el, WEB)) rootAttrs.push(`type="button"`);
  if (rootRole && implicitRole(el, WEB) !== rootRole) rootAttrs.push(`role="${rootRole}"`);

  const tpl = [];
  if (isVoid(el, WEB)) {
    tpl.push(`    <${el} ${rootAttrs.join(' ')} />`);
  } else {
    tpl.push(`    <${el} ${rootAttrs.join(' ')}>`);
    for (const [k, node] of Object.entries(root.parts ?? {})) {
      tpl.push(...renderPart(k, node, ctx, 1));
    }
    const orphaned = namedSlots.filter(
      (x) => !allParts.some((p) => (x.part ? p.key === x.part : p.key === x.name)),
    );
    for (const o of orphaned) tpl.push(`      <slot name="${o.name}"></slot>`);
    if (takesChildren && !childrenPart) tpl.push(`      <slot></slot>`);
    tpl.push(`    </${el}>`);
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
  if (behaviorImports.length) {
    const types = [];
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
    s.push(`// every id below is scoped to this element's own shadow root.`);
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
  s.push(`export class ${className} extends HTMLElement {`);
  s.push(`  static readonly tagName = '${tag}';`);
  if (observed.length) {
    s.push(`  static readonly observedAttributes = [${observed.map((a) => `'${a}'`).join(', ')}];`);
  }
  s.push(``);
  s.push(`  readonly #root: HTMLElement;`);
  if (range) s.push(`  readonly #track: HTMLElement;`);
  if (needsIds) s.push(`  readonly #baseId = '${prefix}-${kebab(name)}-' + nextId++;`);
  if (member) s.push(`  #collection: ${member.of} | null = null;`);
  if (dismissCauses.length) s.push(`  readonly #dismissal;`);
  if (range) s.push(`  readonly #range;`);
  if (navigation) s.push(`  readonly #nav;`);
  s.push(``);

  s.push(`  constructor() {`);
  s.push(`    super();`);
  // `delegatesFocus` — a platform feature where React needed `refTarget` to stand in for one.
  const delegates =
    binding.delegatesFocus ?? Boolean(contract.semantics?.focusable || rootToggles || activator);
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
    s.push(`      () => ${hasDisabled ? 'this.disabled' : 'false'},`);
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
  s.push(`    // NO HANDLER COMPOSITION. \`addEventListener\` is additive by definition, so a`);
  s.push(`    // consumer's listener on this element and the ones below both run — the problem`);
  s.push(`    // React and Vue each solve with a hand-written chain does not exist here.`);
  const listeners = [];
  if (rootToggles || activator) {
    const target = activator && activator.key !== 'root' ? `[part="${activator.node.part}"]` : null;
    listeners.push([target, 'click', 'this.#activate(event as MouseEvent)']);
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
  if (nativelyEdited) listeners.push([null, 'input', 'this.#handleInput(event)']);

  for (const [target, event, call] of listeners) {
    const on = target ? `shadow.querySelector('${target}')!` : `this.#root`;
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
    if (registers) {
      s.push(`    this.#collection.register(this.${identity.name}, {`);
      s.push(`      element: this,`);
      s.push(`      disabled: this.#isDisabled,`);
      s.push(`    });`);
    }
  }
  s.push(`    this.#update();`);
  s.push(`  }`);
  s.push(``);
  if (member) {
    s.push(`  disconnectedCallback(): void {`);
    s.push(`    this.#collection?.removeEventListener(`);
    s.push(`      ${member.of.toUpperCase()}_CHANGE,`);
    s.push(`      this.#onCollectionChange,`);
    s.push(`    );`);
    if (registers) s.push(`    this.#collection?.unregister(this.${identity.name});`);
    s.push(`    this.#collection = null;`);
    s.push(`  }`);
    s.push(``);
    s.push(`  readonly #onCollectionChange = () => this.#update();`);
    s.push(``);
  }
  s.push(`  attributeChangedCallback(): void {`);
  s.push(`    // Cheap on purpose: every change re-writes every derived attribute. There is no`);
  s.push(`    // diffing here and none is wanted — the work is a handful of setAttribute calls.`);
  s.push(`    this.#update();`);
  if (collection) s.push(`    this.#announce();`);
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
      s.push(`    return this.getAttribute('${p.attribute}') ?? '';`);
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
      `    return ${hasDisabled ? 'this.disabled || ' : ''}Boolean(this.#collection?.hasAttribute('disabled'));`,
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

  // --- the collection's API, called by members
  if (selShared) {
    const idn = collection.identity;
    s.push(`  /** Called by a member when it is activated. */`);
    s.push(`  toggle(member${pascal(idn)}: string): void {`);
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
    s.push(`  /** Tell every member to re-read us. The DOM's answer to a re-render. */`);
    s.push(`  #announce(): void {`);
    s.push(`    this.dispatchEvent(new Event(${name.toUpperCase()}_CHANGE));`);
    s.push(`  }`);
    s.push(``);
  }

  // --- activation
  if (activator || rootToggles) {
    const what = activator?.node.activates.toggles ?? rootToggles;
    s.push(`  #activate(event?: { defaultPrevented: boolean }): void {`);
    s.push(`    // Guards, because this runs on a CLICK and the platform guards there too.`);
    s.push(`    if (event?.defaultPrevented) return;`);
    const guards = [];
    if (member) guards.push('this.#isDisabled');
    else if (hasDisabled) guards.push('this.disabled');
    if (hasReadOnly) guards.push('this.readOnly');
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

  if (nativelyEdited) {
    const v = camel(valueState.from);
    s.push(`  #handleInput(event: Event): void {`);
    s.push(`    this.${v} = (event.target as HTMLInputElement).value;`);
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
    const expr = `this.${camel(st)}`;
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
    if (def.values && decision.channel === 'aria') {
      const map = def.values
        .map((v) => `${expr} === '${v}' ? '${ariaValueFor(v, WEB)}'`)
        .join(' : ');
      // `: ''` would have written an empty attribute for a value outside the declared set, which
      // is the same defect as above wearing a ternary.
      s.push(`    {`);
      s.push(`      const next = ${map} : null;`);
      s.push(`      if (next === null) root.removeAttribute('${decision.attribute}');`);
      s.push(`      else root.setAttribute('${decision.attribute}', next);`);
      s.push(`    }`);
      continue;
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
      if (decision.rendersFalse) {
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
      if (rendersFalse(attr, WEB)) {
        s.push(`    root.setAttribute('${attr}', String(this.#selected));`);
      } else {
        s.push(`    if (this.#selected) root.setAttribute('${attr}', 'true');`);
        s.push(`    else root.removeAttribute('${attr}');`);
      }
    }
    s.push(`    // The host carries it too, because CSS cannot select inside a shadow root from`);
    s.push(`    // outside and cannot append an attribute selector to ::part(). One fact, two`);
    s.push(`    // places — forced by the boundary, not chosen.`);
    s.push(`    this.toggleAttribute('${kebab(member.reflects)}', this.#selected);`);
    if (registers) {
      s.push(`    root.setAttribute(`);
      s.push(`      'tabindex',`);
      s.push(`      this.#collection?.isTabStop(this.${identity.name}) ? '0' : '-1',`);
      s.push(`    );`);
      s.push(`    this.#collection?.register(this.${identity.name}, {`);
      s.push(`      element: this,`);
      s.push(`      disabled: this.#isDisabled,`);
      s.push(`    });`);
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
  if (!member && contract.semantics?.focusable && !registers && !isNativelyFocusable(el, WEB)) {
    s.push(
      `    root.setAttribute('tabindex', ${hasDisabled ? "this.disabled ? '-1' : '0'" : "'0'"});`,
    );
  }
  if (nativelyEdited) {
    s.push(`    (root as HTMLInputElement).value = this.${camel(valueState.from)};`);
    if (hasReadOnly) s.push(`    root.toggleAttribute('readonly', this.readOnly);`);
  }
  if (needsIds) {
    for (const p of allParts) {
      if (!(p.node.role || refsOf(p.node).length || referenced.has(p.key))) continue;
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
  if (root.visibleWhen && !platformModal) {
    s.push(`    this.toggleAttribute('hidden', !(${stateRead(root.visibleWhen, member)}));`);
  }
  if (platformModal) {
    const vis = visibilityOf(el, WEB);
    const v = camel(platformModal);
    s.push(
      `    // A <dialog> is opened by CALLING ${vis.show}(), never by rendering an attribute.`,
    );
    s.push(`    const dlg = root as HTMLDialogElement;`);
    s.push(`    if (this.${v} && !dlg.${vis.reflects}) dlg.${vis.show}();`);
    s.push(`    else if (!this.${v} && dlg.${vis.reflects}) dlg.${vis.hide}();`);
  }
  s.push(`  }`);
  s.push(``);
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
  s.push(`declare global {`);
  s.push(`  interface HTMLElementTagNameMap {`);
  s.push(`    '${tag}': ${className};`);
  s.push(`  }`);
  s.push(`}`);
  s.push(``);

  void attrLit;
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
console.log(`\n${EMITTER_ASSUMPTIONS.length} thing(s) the contract could not tell the emitter:\n`);
for (const a of EMITTER_ASSUMPTIONS) {
  console.log(`  ${a.topic}`);
  console.log(`      chose: ${a.decision}`);
  console.log(`      why:   ${a.why}\n`);
}
