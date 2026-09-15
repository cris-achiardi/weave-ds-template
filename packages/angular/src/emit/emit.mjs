#!/usr/bin/env node
// THE THIRD BACKEND. Same spike status as the other two, same rules, different framework.
//
//   node packages/angular/src/emit/emit.mjs <Name> --out <dir>
//
// Written after the Vue emitter and deliberately NOT by porting it. The value of a third backend is
// entirely in where it refuses to be the second one, and Angular refuses in one structural place:
// a component here does not RENDER its root element, it ATTACHES to one chosen by its selector. So
// a binding's `element` compiles into `selector: 'button[dsSwitch]'` and the consumer writes the
// element. Everything downstream of that — host bindings instead of markup attributes, no
// handler composition to write, no ref to forward — follows from that one fact.
//
// WHAT THIS FILE IS NOT. Reading a contract and emitting the two stylesheets used to be in here,
// identical in all three emitters. They moved to `@ds/emit-web` once what a second and third
// backend cost had been measured — see docs/research/0005 and packages/emit-web/README.md. What is
// left is this framework and nothing else.

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '../../../..');
const CONTRACTS = join(REPO_ROOT, 'packages/contracts');
const BINDINGS = join(REPO_ROOT, 'packages/angular/bindings');

// The WEB PLATFORM, as data. THE SAME PACKAGE THE OTHER TWO EMITTERS READ, unchanged.
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

// What every backend that emits into an HTML document shares. It was three identical copies until
// docs/research/0005 said the measurement they existed to protect was complete — reading a
// contract, and the two light-DOM stylesheets. See packages/emit-web/README.md, which is also
// explicit that the CSS half stops at the shadow boundary.
import {
  emitStructure,
  emitTheme,
  kebab,
  loadPair,
  memberFacts,
  partsOf,
  readJson,
  referencedByASibling,
} from '@ds/emit-web';

import { camel, pascal, selectorFor, slotsFrom, surfaceFrom } from './surface.mjs';

const EMITTER_ASSUMPTIONS = [];
const assume = (topic, decision, why) => EMITTER_ASSUMPTIONS.push({ topic, decision, why });

// Angular removes an attribute when the bound value is `null` and renders the STRING "false" when
// it is `false`. React's `|| undefined` and Vue's `|| undefined` both become `|| null` here, and
// getting it wrong produces `aria-readonly="false"` on every control — valid ARIA that means the
// opposite of nothing, with no error anywhere.
const orNull = (expr) => `${expr} || null`;

// How a state name evaluates inside a template or a host binding.
//
// EVERY READ IS A CALL, because every one of them is a signal. That is the consistent difference
// from the other two backends: React reads a plain variable, Vue reads an unwrapped ref, Angular
// invokes. A missed pair of parentheses binds the signal FUNCTION rather than its value and renders
// the source of the function into the DOM — which is visible, but only if you look.
function stateExpr(spec, ctx) {
  const [state, value] = spec.includes('=') ? spec.split('=') : [spec, null];
  const base = ctx.memberReflects === state ? 'selected()' : `${camel(state)}()`;
  return value === null ? base : `${base} === '${value}'`;
}

// ---------------------------------------------------------------------------------------
// the template: one anatomy part and everything under it
// ---------------------------------------------------------------------------------------
function renderPart(key, node, ctx, depth) {
  const { prefix, slots, contract, idFor, refId } = ctx;
  const pad = '  '.repeat(depth + 1);
  const slot = slots.find((x) => (x.part ? x.part === key : x.name === key));
  const takesChildrenHere = ctx.childrenPart === key;
  const attrs = [];

  const nodeEl = defaultElement(node.activates?.toggles ? 'activatable' : 'container', WEB);
  if (node.role && implicitRole(nodeEl, WEB) !== node.role) attrs.push(`role="${node.role}"`);
  if (
    node.role ||
    node.controls ||
    node.namedBy ||
    (node.describedBy ?? []).length ||
    ctx.referenced.has(key)
  ) {
    attrs.push(`[attr.id]="${idFor(key)}"`);
  }
  if (node.controls) {
    attrs.push(`[attr.${relationAttribute('controls', WEB)}]="${refId(node.controls)}"`);
  }
  if (node.namedBy) {
    attrs.push(`[attr.${relationAttribute('namedBy', WEB)}]="${refId(node.namedBy)}"`);
  }
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
    // `ids(...)`, NOT `[...].filter(Boolean)`. An Angular template expression can only reference
    // members of the component, so `Boolean` resolves to `undefined` and `.filter(undefined)`
    // throws — and it throws inside change detection, which aborts the WHOLE pass. The visible
    // symptom is not a broken tooltip: it is every other component on the page silently freezing.
    // Both the React and Vue emitters write the inline form and neither can reach this.
    ctx.needsIdsHelper.value = true;
    attrs.push(`[attr.${relationAttribute('describedBy', WEB)}]="ids(${pieces.join(', ')})"`);
  }
  if (node.activates?.toggles) attrs.push(`(click)="activate($event)"`);
  if (node.activates?.toggles && node.role === 'button') attrs.push(`type="button"`);
  if (node.visibleWhen) {
    attrs.push(
      `[attr.${WEB.visibility.attribute}]="${stateExpr(node.visibleWhen, ctx)} ? null : ''"`,
    );
  }
  if (node.role === 'button' && ctx.disabledExpr) {
    attrs.push(`[attr.disabled]="${orNull(ctx.disabledExpr)}"`);
  }
  if (typeof node.controls === 'string') {
    const target = Object.entries(contract.anatomy.root.parts ?? {}).find(
      ([k]) => k === node.controls,
    );
    if (target && target[1].visibleWhen) {
      attrs.push(`[attr.aria-expanded]="${stateExpr(target[1].visibleWhen, ctx)}"`);
    }
  }
  // A `viewChild` query needs a template reference variable to find. No callback ref, no function
  // ref: the query is declared on the class and resolves after the view is created.
  if (ctx.rangeTrack === key) attrs.push(`#track`);
  attrs.push(`data-${prefix}-part="${node.part}"`);

  const kids = Object.entries(node.parts ?? {});
  const out = [];
  const open = `${pad}<${nodeEl} ${attrs.join(' ')}>`;
  if (!kids.length && !slot && !takesChildrenHere) {
    // Angular templates have no void-element shorthand for a non-void element, and an unclosed
    // <div> silently swallows everything after it.
    out.push(`${open}</${nodeEl}>`);
    return out;
  }
  out.push(open);
  if (slot) out.push(`${pad}  <ng-content select="[slot=${slot.name}]" />`);
  if (takesChildrenHere) out.push(`${pad}  <ng-content />`);
  for (const [k, child] of kids) out.push(...renderPart(k, child, ctx, depth + 1));
  out.push(`${pad}</${nodeEl}>`);
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
  const selector = selectorFor(el, name, prefix);

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
      'Cardinality lives on the ancestor. THREE backends now report this identically, which promotes it from "an emitter had to open another file" to a settled property of the contract set.',
    );
  }

  const navigation = collection?.navigation ?? null;
  const registers = Boolean(memberNav && root.activates);
  const ariaDisabledOnly = registers && memberNav.disabledItems === 'focusable';

  const hasDisabled = inputs.some((p) => p.name === 'disabled');
  const hasReadOnly = inputs.some((p) => p.name === 'readOnly');
  const disabledExpr = member ? 'isDisabled()' : hasDisabled ? 'disabled()' : null;
  const disabledScript = member ? 'this.isDisabled()' : hasDisabled ? 'this.disabled()' : null;

  const allParts = partsOf(root);
  const activator = allParts.find((p) => p.node.activates?.toggles);
  const rootToggles = root.activates?.toggles;

  assume(
    'how a state reaches the DOM',
    'resolved entirely by @ds/platform-web',
    'The third backend to add no table of its own and change nothing in profile.json.',
  );

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
    const keys = allParts.map((x) => x.key);
    if (range.track !== 'root' && !keys.includes(range.track)) {
      throw new Error(
        `${name}.range.track names part "${range.track}", which this component's anatomy does not ` +
          `render. A pointer would have nothing to measure against.`,
      );
    }
  }

  // Angular's selector is STATIC, so a root element that changes with a prop cannot be expressed.
  // Refuse rather than render a wrapper and pretend, because a wrapper is a different DOM and the
  // contract's `semantics.role` would land on the wrong node.
  if (binding.elementByProp) {
    throw new Error(
      `${name} declares elementByProp, which this backend cannot compile: an Angular selector is ` +
        `fixed at declaration, so a component cannot attach to a different element per input. ` +
        `Two components with two selectors is the Angular answer, and that is a contract decision ` +
        `rather than something an emitter may invent.`,
    );
  }

  const platformModal =
    visibilityOf(el, WEB).mode === 'imperative' && root.visibleWhen ? root.visibleWhen : null;
  const modalModel = platformModal ? stateModels.find((x) => x.from === platformModal) : null;
  if (platformModal && !modalModel) {
    throw new Error(
      `${name} renders a <dialog> whose visibility depends on "${platformModal}", but that state is ` +
        `not \`control: shared\` — nothing could open it and nothing could hear it close.`,
    );
  }

  const dismisses = contract.dismisses ?? null;
  let dismissCauses = [];
  if (dismisses) {
    const dismissModel = stateModels.find((x) => x.from === dismisses.state);
    if (!dismissModel) {
      throw new Error(
        `${name}.dismisses names state "${dismisses.state}", which is not \`control: shared\` — ` +
          `a dismissal writes it, so something outside has to be able to hear that.`,
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
  if (nativelyEdited) {
    assume(
      'what changes a natively edited value',
      `wired the DOM's own (input) event because the binding attaches to <${el}>`,
      "TWO OF THREE BACKENDS AGREE. Angular and Vue both reach the DOM's `input` event; React's `onChange` is React's synthetic per-keystroke invention and the odd one out. The contract says only that the element edits its own value — which is right, and which also means it cannot currently express 'as the user types' versus 'when they are done'.",
    );
  }
  if (range) {
    assume(
      'how a pointer becomes a number',
      `measured against the "${range.track}" part's box, reached with a viewChild query`,
      'The contract names the track and the axis and stops there. Three backends, three ways of getting hold of the element (a callback ref, a function ref, a signal query) and one identical set of conformance cases holding the arithmetic equal.',
    );
  }
  if (platformModal) {
    assume(
      'how a modal opens and closes',
      'an effect() calls showModal()/close(), and a MutationObserver on the `open` attribute keeps the model in sync',
      'React needs useEffect, Vue needs a post-flush watcher, Angular needs effect(). Three primitives, one platform obligation, and @ds/platform-web supplied the method names to all three.',
    );
  }
  if (dismisses) {
    const skipped = dismisses.on.filter((c) => !dismissCauses.includes(c));
    assume(
      'what a platform already supplies of a dismissal',
      dismissCauses.length
        ? `generated ${dismissCauses.join(' and ')}${skipped.length ? `; ${skipped.join(' and ')} left to the platform` : ''}`
        : `nothing generated — the platform supplies ${skipped.join(' and ')}`,
      'Read straight out of @ds/platform-web > visibility.supplies.',
    );
  }
  if (navigation) {
    assume(
      'how a collection moves focus between its members',
      'a member registration protocol over the hierarchical injector, plus useLinearNavigation from @ds/angular/behavior',
      'React context, Vue provide/inject, Angular DI. The contract declares WHAT the keyboard does and nothing about how a backend learns which DOM nodes its members are — which is exactly the room three different protocols needed.',
    );
  }
  if (member) {
    assume(
      'how a member reaches its collection',
      'inject() against an InjectionToken the ancestor provides with useExisting',
      'The contract says this component is a member of an ancestor collection; it does not and should not say HOW.',
    );
  }
  assume(
    'the component attaches to an element rather than rendering one',
    `selector: '${selector}' — the consumer writes <${el} ${prefix}${name}>`,
    "UNIQUE TO THIS BACKEND, and not a spelling difference. An Angular component has no root node of its own, so the binding's `element` becomes a selector and every root attribute becomes a host binding. The alternative — an element selector like `" +
      prefix +
      '-' +
      name +
      '` — was rejected because the host would then be a custom element, losing native focus, native `disabled`, the implicit role and form participation, all four of which @ds/platform-web records as facts about the element the contract named.',
  );
  if (!member) {
    assume(
      'a stable id root',
      'a module-level counter',
      'React has useId and Vue 3.5 has useId. Angular has neither, so the emitter invented one. It is fine in a browser and wrong under server rendering with hydration, which nothing in this repo exercises — recorded rather than solved.',
    );
  }

  // Members derive their ID from a signal. IDs and references must read it identically.
  const baseIdRead = member ? 'baseId()' : 'baseId';
  const idFor = (key) => (key === 'root' ? baseIdRead : `${baseIdRead} + '-${key}'`);
  const refId = (spec) => {
    if (typeof spec === 'string') return idFor(spec);
    if (!member) {
      throw new Error(
        `${name} references member "${spec.member}" but is not itself a member of any collection, ` +
          `so there is no shared ancestor to resolve the reference against.`,
      );
    }
    const base = `collection.baseId + '-${spec.member}-' + ${member.identity}()`;
    return spec.part === 'root' ? base : `${base} + '-${spec.part}'`;
  };
  const refsOf = (node) => [
    ...(node.controls ? [node.controls] : []),
    ...(node.namedBy ? [node.namedBy] : []),
    ...(node.describedBy ?? []),
  ];
  const referencesParts = allParts.some((p) => refsOf(p.node).length);
  const referenced = new Set(
    allParts.flatMap((p) => refsOf(p.node)).filter((r) => typeof r === 'string'),
  );
  const referencedBySibling = referencedByASibling(name, member, CONTRACTS);
  const needsIds = Boolean(collection) || referencesParts || referencedBySibling;

  const needsIdsHelper = { value: false };

  const ctx = {
    prefix,
    needsIdsHelper,
    slots: namedSlots,
    contract,
    idFor,
    childrenPart,
    memberReflects: member?.reflects,
    rangeTrack: range && range.track !== 'root' ? range.track : null,
    referenced,
    refId,
    disabledExpr,
  };

  // -------------------------------------------------------------------------------------
  // host bindings — everything that would be a root attribute in the other two backends
  // -------------------------------------------------------------------------------------
  const host = [];
  const hostEvents = {};
  const onEvent = (event, call) => (hostEvents[event] ??= []).push(call);

  if (submitsByDefault(el, WEB)) host.push([`type`, `'button'`, true]);
  if (rootRole && implicitRole(el, WEB) !== rootRole) host.push([`attr.role`, `'${rootRole}'`]);
  if (needsIds) host.push([`attr.id`, baseIdRead]);

  for (const [st, def] of Object.entries(contract.states ?? {})) {
    const asModel = models.find((m) => m.from === st);
    const asInput = inputs.find((p) => p.from === st);
    if (!asModel && !asInput) continue;
    const expr = `${camel(st)}()`;
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
      host.push([`attr.${decision.attribute}`, `${map} : null`]);
      continue;
    }
    if (decision.channel === 'native' || decision.channel === 'aria') {
      // `rendersFalse` is read as written on BOTH channels now. It used to be ignored on the native
      // channel because @ds/platform-web hardcoded it to `true`, which was false as a statement
      // about the platform: an HTML boolean attribute is presence-only. The profile carries the
      // answer in its own `native` table since that was fixed, so this backend no longer has to
      // disagree with it.
      host.push([`attr.${decision.attribute}`, decision.rendersFalse ? expr : orNull(expr)]);
    } else if (decision.channel === 'none') {
      // Deliberately nothing. Free text is CONTENT, and mirroring it into an attribute leaks
      // whatever the person typed.
    } else if (def.values) host.push([`attr.data-${prefix}-state-${st}`, expr]);
    else host.push([`attr.data-${prefix}-state-${st}`, orNull(expr)]);
  }

  if (member) {
    const declared = ariaAttributeFor(member.reflects, WEB);
    const attr = declared && ariaFitsRole(declared, rootRole ?? null, WEB) ? declared : null;
    if (declared && !attr) {
      assume(
        'a member state whose ARIA attribute its role does not support',
        `${member.reflects} does not reach ${declared} on role="${rootRole}" — emitted data-${prefix}-state-${member.reflects} instead`,
        'Answered by @ds/platform-web > aria. All three backends report the identical decision for the identical component.',
      );
    }
    if (attr) {
      // An ARIA attribute, so `rendersFalse` is read as written — an `aria-selected="false"` is a
      // meaningful statement where a native `disabled="false"` is not.
      host.push([`attr.${attr}`, rendersFalse(attr, WEB) ? 'selected()' : orNull('selected()')]);
    } else {
      host.push([`attr.data-${prefix}-state-${member.reflects}`, orNull('selected()')]);
      assume(
        'a member state outside the ARIA table',
        `emitted data-${prefix}-state-${member.reflects} instead`,
        'The state-to-attribute table is a closed list in @ds/platform-web. A state name it does not know reaches no ARIA attribute at all.',
      );
    }
  }

  if (registers) {
    host.push([`attr.tabindex`, `collection.isTabStop(${identity.name}()) ? 0 : -1`]);
  }
  if (range && contract.states?.dragging) {
    host.push([`attr.data-${prefix}-state-dragging`, orNull('range.dragging()')]);
  }
  if (
    !registers &&
    contract.semantics?.focusable &&
    !isNativelyFocusable(el, WEB) &&
    (root.role || contract.semantics?.role)
  ) {
    host.push([`attr.tabindex`, disabledExpr ? `${disabledExpr} ? -1 : 0` : `0`]);
    assume(
      'focus order',
      'every focusable member is given tabindex 0',
      'The contract declares `semantics.focusable` and nothing more. Same fallback all three backends apply.',
    );
  }

  const axisNames = Object.keys(contract.axes ?? {});
  if (axisNames.length) {
    for (const axis of axisNames) host.push([`attr.data-${prefix}-${kebab(axis)}`, `${axis}()`]);
  }

  if (nativelyEdited) {
    // A PROPERTY BINDING, NOT `[attr.value]`. HTML copies the value ATTRIBUTE into the live value
    // only while the input's dirty-value flag is false — that is, until the user types. After that
    // the attribute and the value are decoupled, so `[attr.value]` updates a default nobody sees:
    // type into the field, then reset the model to '', and the box keeps the typed text.
    //
    // The other three backends all set the property. React's `value={…}` is one by definition,
    // Vue's runtime sets `value` on an <input> as a property, and the web-components backend
    // assigns `HTMLInputElement.value` directly. Angular is the only one where `[attr.]` and `[]`
    // are a visible choice, and the first draft chose the wrong one.
    host.push([`value`, `${camel(valueState.from)}()`]);
    if (hasReadOnly) host.push([`attr.readonly`, orNull('readOnly()')]);
    onEvent('input', 'handleInput($event)');
  }

  const ranged = Object.entries(contract.states ?? {}).find(([, d]) => d.valueType === 'number');
  let announced = null;
  if (ranged && rootRole) {
    const [rs, rd] = ranged;
    if (rd.min !== undefined) host.push([`attr.${WEB.range.min}`, String(rd.min)]);
    if (rd.max !== undefined) host.push([`attr.${WEB.range.max}`, String(rd.max)]);
    if (range && range.state === rs) {
      // A computed rather than an inline `snap(...)`: a host binding is evaluated in the class's
      // context and cannot see a module import.
      announced = `readonly announcedValue = computed(() => snap(this.${camel(rs)}(), RANGE));`;
      host.push([`attr.${WEB.range.value}`, 'announcedValue()']);
    } else {
      host.push([`attr.${WEB.range.value}`, `${camel(rs)}()`]);
    }
  }

  if (root.visibleWhen && !platformModal) {
    host.push([
      `attr.${WEB.visibility.attribute}`,
      `${stateExpr(root.visibleWhen, ctx)} ? null : ''`,
    ]);
  }
  if (root.controls) {
    host.push([`attr.${relationAttribute('controls', WEB)}`, refId(root.controls)]);
  }
  if (root.namedBy) host.push([`attr.${relationAttribute('namedBy', WEB)}`, refId(root.namedBy)]);
  if ((root.describedBy ?? []).length) {
    needsIdsHelper.value = true;
    host.push([
      `attr.${relationAttribute('describedBy', WEB)}`,
      `ids(${root.describedBy.map((d) => refId(d)).join(', ')})`,
    ]);
  }

  if (range) {
    onEvent('keydown', 'range.onKeyDown($event)');
    if (range.drag) {
      onEvent('pointerdown', 'range.onPointerDown($event)');
      onEvent('pointermove', 'range.onPointerMove($event)');
      onEvent('pointerup', 'range.onPointerUp($event)');
      onEvent('pointercancel', 'range.onPointerUp($event)');
    }
    // The fill's length and the thumb's offset ARE the value. A style binding on the host, which
    // Angular merges with whatever the consumer put in their own `style` attribute rather than
    // replacing it — so unlike Vue there is no array form to write.
    host.push([`style.--${prefix}-fraction`, 'range.fraction()']);
  }
  if (dismissCauses.includes('escape')) onEvent('keydown', 'dismissal.onKeyDown($event)');
  if (dismissCauses.includes('outside-press')) {
    onEvent('pointerdown', 'dismissal.onPointerDown($event)');
    onEvent('pointercancel', 'dismissal.onPointerCancel()');
    onEvent('click', 'dismissal.onClick($event)');
  }
  if (navigation) onEvent('keydown', 'nav.onKeyDown($event)');
  if (rootToggles) onEvent('click', 'activate($event)');

  host.push([`data-${prefix}-component`, `'${name}'`, true]);
  host.push([`data-${prefix}-part`, `'${root.part}'`, true]);

  // -------------------------------------------------------------------------------------
  // the file
  // -------------------------------------------------------------------------------------
  const s = [];
  s.push(`// GENERATED from ${name}.contract.json + ${name}.angular.json. Do not edit by hand.`);
  s.push(`// Regenerate: node packages/angular/src/emit/emit.mjs ${name} --out <dir>`);
  s.push(`//`);
  s.push(`// ${contract.intent.purpose.replace(/\s+/g, ' ')}`);
  s.push(``);

  // ONE CONDITION PER IMPORT, each naming what actually emits it.
  //
  // The first version bundled them — "a collection needs InjectionToken, computed, forwardRef and
  // signal" — and was wrong in both directions at once: `signal` is only reached by a collection
  // with NO `disabled` input, and `Signal` (the type) is used by every collection's context
  // interface rather than only a navigable one. `noUnusedLocals` catches the first kind; a missing
  // type import is a hard error. Both were found by `pnpm typecheck`, which is the entire reason
  // generated output is typechecked.
  const ngImports = new Set(['Component', 'ViewEncapsulation']);
  const need = (cond, ...names) => {
    if (cond) for (const n of names) ngImports.add(n);
  };
  need(inputs.length || axes.length || identity, 'input');
  need(models.length, 'model');
  need(member, 'computed', 'inject');
  need(collection, 'InjectionToken', 'forwardRef');
  // `computed` only where one is actually written: a collection's `collectionDisabled` is a
  // computed when it has a `disabled` input and a frozen signal when it does not.
  need(selShared && hasDisabled, 'computed');
  need(selShared && !hasDisabled, 'signal');
  need(Boolean(announced), 'computed');
  need(registers, 'DestroyRef', 'ElementRef', 'effect', 'inject');
  need(platformModal, 'DestroyRef', 'ElementRef', 'afterNextRender', 'effect', 'inject');
  need(range, 'viewChild', 'ElementRef');
  // The context interface a collection exports is typed with `Signal`, whether or not the
  // collection declares a keyboard model. A MEMBER references no Angular type at all.
  need(collection, 'Signal');

  const typeOnly = new Set(['Signal']);
  const valueImports = [...ngImports].filter((x) => !typeOnly.has(x)).sort();
  const typeImports = [...ngImports].filter((x) => typeOnly.has(x)).sort();
  s.push(`import { ${valueImports.join(', ')} } from '@angular/core';`);
  if (typeImports.length) {
    s.push(`import type { ${typeImports.join(', ')} } from '@angular/core';`);
  }

  const behaviorValues = [];
  const behaviorTypes = [];
  if (range) {
    behaviorValues.push('snap', 'useRangeControl');
    behaviorTypes.push('RangeOptions');
  }
  if (dismissCauses.length) {
    behaviorValues.push('useDismissal');
    behaviorTypes.push('DismissalOptions');
  }
  if (navigation) {
    behaviorValues.push('useLinearNavigation');
    behaviorTypes.push('NavigationOptions');
  }
  if (collection && navigation) behaviorTypes.push('MemberRegistration');
  if (behaviorValues.length) {
    s.push(`import { ${behaviorValues.sort().join(', ')} } from '@ds/angular/behavior';`);
  }
  if (behaviorTypes.length) {
    s.push(`import type { ${behaviorTypes.sort().join(', ')} } from '@ds/angular/behavior';`);
  }
  if (member) {
    s.push(
      `import { ${member.of.toUpperCase()}, type ${member.of}Context } from '../${member.of}/${member.of}';`,
    );
  }
  s.push(``);

  // ---- module-level declarations
  if (dismissCauses.length) {
    s.push(`// Transcribed from ${name}.contract.json > dismisses. The cases this commits us to`);
    s.push(`// are in @ds/contracts/conformance/dismissal.json.`);
    if (dismissCauses.length !== dismisses.on.length) {
      const left = dismisses.on.filter((c) => !dismissCauses.includes(c));
      s.push(`//`);
      s.push(`// The contract also declares ${left.join(' and ')}, which is NOT generated: the`);
      s.push(`// platform supplies it for a <${el}>. See @ds/platform-web > visibility.supplies.`);
    }
    s.push(`const DISMISSAL: DismissalOptions = {`);
    s.push(`  on: [${dismissCauses.map((c) => `'${c}'`).join(', ')}],`);
    s.push(`};`);
    s.push(``);
  }
  if (range) {
    s.push(
      `// Transcribed from ${name}.contract.json: the \`range\` block, plus min/max/step from`,
    );
    s.push(`// the \`${range.state}\` state. The cases this commits us to are in`);
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
  if (navigation) {
    s.push(`// Transcribed field for field from ${name}.contract.json > collection.navigation.`);
    s.push(`// The cases this commits us to are in`);
    s.push(`// @ds/contracts/conformance/linear-navigation.json.`);
    s.push(`const NAVIGATION: NavigationOptions = {`);
    for (const [k, v] of Object.entries(navigation)) {
      s.push(`  ${k}: ${typeof v === 'string' ? `'${v}'` : String(v)},`);
    }
    s.push(`};`);
    s.push(``);
  }
  if (needsIds && !member) {
    s.push(`// Angular has no useId. React does and Vue 3.5 does; this counter is the emitter's`);
    s.push(`// own invention, and it is wrong under server rendering with hydration — which`);
    s.push(`// nothing in this repo exercises. Recorded rather than solved.`);
    s.push(`let nextId = 0;`);
    s.push(``);
  }

  // ---- the collection's published context
  if (collection) {
    const t = many ? 'string[]' : 'string';
    s.push(`/** Published to every member through the injector. */`);
    s.push(`export interface ${name}Context {`);
    s.push(`  /** The current selection, by member ${collection.identity}. */`);
    s.push(`  readonly selection: Signal<${t}>;`);
    s.push(`  /** Called by a member when it is activated. */`);
    s.push(`  toggle(${collection.identity}: string): void;`);
    s.push(`  /** Shared id root, so a member's parts can reference one another. */`);
    s.push(`  readonly baseId: string;`);
    s.push(`  /** True when the whole collection is disabled. */`);
    s.push(`  readonly collectionDisabled: Signal<boolean>;`);
    if (navigation) {
      s.push(`  /** A member announces its DOM node, so the collection can move focus. */`);
      s.push(`  register(${collection.identity}: string, entry: MemberRegistration): void;`);
      s.push(`  unregister(${collection.identity}: string): void;`);
      s.push(`  /** True for the one member that sits in the page's tab sequence. */`);
      s.push(`  isTabStop(${collection.identity}: string): boolean;`);
    }
    s.push(`}`);
    s.push(``);
    s.push(`/**`);
    s.push(` * The injection token. A member asks the injector for its collection, which is`);
    s.push(` * Angular's answer to React context and Vue's provide/inject — the contract declares`);
    s.push(` * that a membership exists and says nothing about the protocol.`);
    s.push(` */`);
    s.push(`export const ${name.toUpperCase()} = new InjectionToken<${name}Context>('${name}');`);
    s.push(``);
  }

  // ---- the decorator
  s.push(`@Component({`);
  s.push(
    `  // The binding's \`element\` becomes a SELECTOR, because an Angular component attaches`,
  );
  s.push(
    `  // to an element rather than rendering one. A consumer writes <${el} ${prefix}${name}>.`,
  );
  s.push(`  selector: '${selector}',`);
  s.push(`  exportAs: '${prefix}${name}',`);
  s.push(
    `  // ViewEncapsulation.None IS LOAD-BEARING. Angular's default rewrites every selector in`,
  );
  s.push(
    `  // these stylesheets to include a generated _ngcontent attribute, which would scope them`,
  );
  s.push(
    `  // to this component and break the one property the whole system rests on: that a theme`,
  );
  s.push(
    `  // file selecting on [data-${prefix}-component] dresses the React, Vue and Angular builds`,
  );
  s.push(
    `  // alike. It fails silently — the CSS loads, matches nothing, and the component renders`,
  );
  s.push(`  // unstyled.`);
  s.push(`  encapsulation: ViewEncapsulation.None,`);
  s.push(`  styleUrls: ['./${name}.structure.css', './${name}.theme.css'],`);
  if (collection) {
    s.push(
      `  providers: [{ provide: ${name.toUpperCase()}, useExisting: forwardRef(() => ${name}) }],`,
    );
  }
  s.push(`  host: {`);
  for (const [key, expr, isStatic] of host) {
    if (isStatic) s.push(`    '${key}': ${expr},`);
    else s.push(`    '[${key}]': ${JSON.stringify(expr)},`);
  }
  for (const [event, calls] of Object.entries(hostEvents)) {
    // NO COMPOSITION TO WRITE, and this is the only backend where that is true. Angular attaches
    // host listeners with addEventListener rather than assigning a prop, so a consumer's own
    // (click) and this one both fire. React composes by hand; Vue composes by hand after
    // disabling attribute fallthrough.
    s.push(`    '(${event})': ${JSON.stringify(calls.join('; '))},`);
  }
  s.push(`  },`);

  const t = [];
  if (isVoid(el, WEB)) {
    s.push(`  // A void element has no content model, so there is no template at all.`);
    s.push(`  template: '',`);
  } else {
    const kids = Object.entries(root.parts ?? {});
    for (const [k, node] of kids) t.push(...renderPart(k, node, ctx, 1));
    const orphaned = namedSlots.filter(
      (x) => !allParts.some((p) => (x.part ? p.key === x.part : p.key === x.name)),
    );
    if (orphaned.length) {
      assume(
        'slots with no anatomy part',
        `projected bare: ${orphaned.map((o) => o.name).join(', ')}`,
        'The contract declares these slots but names no part for them, so there is no described region to put them in and no way to style where they land.',
      );
      for (const o of orphaned) t.push(`    <ng-content select="[slot=${o.name}]" />`);
    }
    if (takesChildren && !childrenPart) t.push(`    <ng-content />`);
    s.push(`  template: \``);
    for (const line of t) s.push(line);
    s.push(`  \`,`);
  }
  s.push(`})`);

  // ---- the class
  const implementsList = collection ? ` implements ${name}Context` : '';
  s.push(`export class ${name}${implementsList} {`);

  for (const p of [...inputs, ...axes]) {
    const d = (p.description ?? '').replace(/\s+/g, ' ');
    const dflt =
      p.role === 'axis'
        ? `'${p.default}'`
        : p.default === ''
          ? `''`
          : JSON.stringify(p.default ?? false);
    s.push(
      `  /** ${d}${p.role === 'axis' && p.default ? ` Defaults to \`${p.default}\`.` : ''} */`,
    );
    s.push(`  readonly ${p.name} = input<${p.type}>(${dflt});`);
  }
  if (identity) {
    s.push(`  /** ${identity.description.replace(/\s+/g, ' ')} */`);
    s.push(`  readonly ${identity.name} = input.required<string>();`);
  }
  for (const m of models) {
    const def = m.from === 'selection' ? null : contract.states[m.from];
    const d = def ? def.description.replace(/\s+/g, ' ') : m.description;
    const dflt =
      m.default === '' ? `''` : Array.isArray(m.default) ? '[]' : JSON.stringify(m.default);
    s.push(`  /** ${d} Two-way: \`[(${m.name})]\`. */`);
    s.push(`  readonly ${m.name} = model<${m.type}>(${dflt});`);
  }
  if (inputs.length || axes.length || identity || models.length) s.push(``);

  if (needsIds && !member) {
    s.push(`  readonly baseId = '${prefix}-${kebab(name)}-' + nextId++;`);
    s.push(``);
  }

  if (member) {
    s.push(
      `  private readonly collectionRef = inject<${member.of}Context>(${member.of.toUpperCase()});`,
    );
    s.push(`  protected readonly collection = this.collectionRef;`);
    s.push(
      `  protected readonly selected = computed(() => ${memberMany ? `this.collection.selection().includes(this.${member.identity}())` : `this.collection.selection() === this.${member.identity}()`});`,
    );
    s.push(
      `  protected readonly isDisabled = computed(() => ${hasDisabled ? 'this.disabled() || ' : ''}this.collection.collectionDisabled());`,
    );
    if (needsIds) {
      s.push(
        `  protected readonly baseId = computed(() => this.collection.baseId + '-${name}-' + this.${member.identity}());`,
      );
    }
    s.push(``);
  }

  if (registers || platformModal || range) {
    if (registers || platformModal) {
      s.push(
        `  private readonly host = inject<ElementRef<HTML${platformModal ? 'Dialog' : ''}Element>>(ElementRef);`,
      );
    }
    if (range) {
      s.push(`  private readonly track = viewChild<ElementRef<HTMLElement>>('track');`);
    }
    s.push(``);
  }

  if (announced) {
    s.push(`  /** Announce the value the contract says this holds, not the one it was handed: a`);
    s.push(`   *  controlled value may arrive off-step, and the thumb would be drawn at one`);
    s.push(`   *  number and announced as another. */`);
    s.push(`  protected ${announced}`);
    s.push(``);
  }

  if (range) {
    s.push(`  protected readonly range = useRangeControl(`);
    s.push(`    RANGE,`);
    s.push(`    () => this.${camel(range.state)}(),`);
    s.push(`    (next: number) => this.${camel(range.state)}.set(next),`);
    s.push(`    () => ${disabledScript ? `Boolean(${disabledScript})` : 'false'},`);
    s.push(`    () => this.track()?.nativeElement ?? null,`);
    s.push(`  );`);
    s.push(``);
  }

  if (selShared) {
    s.push(`  readonly selection = this.value.asReadonly();`);
    s.push(
      `  readonly collectionDisabled = ${hasDisabled ? 'computed(() => Boolean(this.disabled()))' : 'signal(false).asReadonly()'};`,
    );
    s.push(``);
    s.push(
      `  // \`member${pascal(collection.identity)}\`, not \`${collection.identity}\`: the selection model is a member of`,
    );
    s.push(`  // this class under that name, and a parameter shadowing it reads as the string.`);
    s.push(`  toggle(member${pascal(collection.identity)}: string): void {`);
    const arg = `member${pascal(collection.identity)}`;
    if (many) {
      s.push(`    const current = this.value();`);
      s.push(`    this.value.set(`);
      s.push(
        `      current.includes(${arg}) ? current.filter((v) => v !== ${arg}) : [...current, ${arg}],`,
      );
      s.push(`    );`);
    } else if (collection.selection.cardinality === 'at-most-one') {
      s.push(`    this.value.set(this.value() === ${arg} ? '' : ${arg});`);
    } else {
      s.push(`    if (this.value() === ${arg}) return;`);
      s.push(`    this.value.set(${arg});`);
    }
    s.push(`  }`);
    s.push(``);
    if (navigation) {
      s.push(
        `  // \`toggle\` is the selection setter, and \`followsFocus\` is what decides whether`,
      );
      s.push(`  // the primitive calls it. With followsFocus false it is never called from here`);
      s.push(`  // and arrowing only moves focus.`);
      s.push(`  private readonly nav = useLinearNavigation(NAVIGATION, () => this.value(), (v) =>`);
      s.push(`    this.toggle(v),`);
      s.push(`  );`);
      s.push(`  register = this.nav.register;`);
      s.push(`  unregister = this.nav.unregister;`);
      s.push(`  isTabStop = this.nav.isTabStop;`);
      s.push(`  protected readonly navHandlers = this.nav;`);
      s.push(``);
    }
  }

  if (dismissCauses.length) {
    const v = camel(dismisses.state);
    if (platformModal === dismisses.state) {
      s.push(`  // A platform modal is closed BY THE ELEMENT, never by writing the state: writing`);
      s.push(`  // it would run the effect, which calls close(), which the observer sees — two`);
      s.push(`  // notifications for one dismissal. One close path, one place to look.`);
      s.push(`  protected readonly dismissal = useDismissal(DISMISSAL, () => this.${v}(), () =>`);
      s.push(`    this.host.nativeElement.${visibilityOf(el, WEB).hide}(),`);
      s.push(`  );`);
    } else {
      s.push(`  protected readonly dismissal = useDismissal(DISMISSAL, () => this.${v}(), () =>`);
      s.push(`    this.${v}.set(false),`);
      s.push(`  );`);
    }
    s.push(``);
  }

  // ---- constructor
  const ctor = [];
  if (registers) {
    ctor.push(`    // The collection moves focus between its members, so each one announces its`);
    ctor.push(
      `    // element. \`inject(ElementRef)\` reaches the host directly — there is no ref to`,
    );
    ctor.push(`    // forward and no template ref to declare, because the host is the consumer's`);
    ctor.push(`    // own element.`);
    ctor.push(`    let registeredValue: string | null = null;`);
    ctor.push(`    effect(() => {`);
    ctor.push(`      const value = this.${member.identity}();`);
    ctor.push(`      if (registeredValue !== null && registeredValue !== value) {`);
    ctor.push(`        this.collection.unregister(registeredValue);`);
    ctor.push(`      }`);
    ctor.push(`      registeredValue = value;`);
    ctor.push(`      this.collection.register(value, {`);
    ctor.push(`        element: this.host.nativeElement,`);
    ctor.push(`        disabled: this.isDisabled(),`);
    ctor.push(`      });`);
    ctor.push(`    });`);
    ctor.push(`    inject(DestroyRef).onDestroy(() => {`);
    ctor.push(`      if (registeredValue !== null) this.collection.unregister(registeredValue);`);
    ctor.push(`    });`);
  }
  if (platformModal) {
    const v = camel(platformModal);
    const vis = visibilityOf(el, WEB);
    ctor.push(
      `    // A <dialog> is opened by CALLING ${vis.show}(), never by rendering an attribute.`,
    );
    ctor.push(
      `    // React reaches for useEffect here and Vue for a post-flush watcher; Angular's`,
    );
    ctor.push(`    // effect() runs after the view is created, which is the same requirement met`);
    ctor.push(`    // by a third primitive.`);
    ctor.push(`    effect(() => {`);
    ctor.push(`      const node = this.host.nativeElement;`);
    ctor.push(
      `      // \`${vis.reflects}\` reflects ${vis.show}() having been called, so it is also the`,
    );
    ctor.push(`      // guard against calling it twice.`);
    ctor.push(`      if (this.${v}() && !node.${vis.reflects}) node.${vis.show}();`);
    ctor.push(`      else if (!this.${v}() && node.${vis.reflects}) node.${vis.hide}();`);
    ctor.push(`    });`);
    ctor.push(``);
    ctor.push(`    // The dialog closes ITSELF on Escape, so this component is no longer the only`);
    ctor.push(`    // writer of its own state. Synced from the ELEMENT's own \`${vis.reflects}\``);
    ctor.push(`    // attribute, not from a \`close\` event — measured unreliable in Chrome.`);
    ctor.push(
      `    // Without this the platform would hide the element while \`${platformModal}\` stayed`,
    );
    ctor.push(`    // true, and the next open would be a no-op.`);
    // `destroyRef` IS CAPTURED HERE, NOT INSIDE THE CALLBACK. `inject()` only works in an
    // injection context, and an afterNextRender callback runs long after the constructor has
    // returned — calling it in there throws NG0203 at the first render and takes the whole page
    // down with it. The constructor IS an injection context, so `afterNextRender` also needs no
    // explicit injector.
    ctor.push(`    const destroyRef = inject(DestroyRef);`);
    ctor.push(`    afterNextRender(() => {`);
    ctor.push(`      const node = this.host.nativeElement;`);
    ctor.push(`      const observer = new MutationObserver(() => {`);
    ctor.push(`        // Guarded, or a close already recorded emits ${v}Change a second time.`);
    ctor.push(`        if (!node.${vis.reflects} && this.${v}()) this.${v}.set(false);`);
    ctor.push(`      });`);
    ctor.push(
      `      observer.observe(node, { attributes: true, attributeFilter: ['${vis.reflects}'] });`,
    );
    ctor.push(`      destroyRef.onDestroy(() => observer.disconnect());`);
    ctor.push(`    });`);
  }
  if (ctor.length) {
    s.push(`  constructor() {`);
    for (const line of ctor) s.push(line);
    s.push(`  }`);
    s.push(``);
  }

  // ---- activation
  if (activator || rootToggles) {
    const what = activator?.node.activates.toggles ?? rootToggles;
    s.push(`  protected activate(event?: { defaultPrevented: boolean }): void {`);
    s.push(
      `    // Guards, because this runs on a CLICK and the platform guards there too: calling`,
    );
    s.push(
      `    // preventDefault() in a click handler is what cancels a native checkbox's toggle.`,
    );
    s.push(`    if (event?.defaultPrevented) return;`);
    const guards = [];
    if (disabledScript) guards.push(disabledScript);
    if (hasReadOnly) guards.push('this.readOnly()');
    if (guards.length) s.push(`    if (${guards.join(' || ')}) return;`);
    if (what === 'member') {
      s.push(`    this.collection.toggle(this.${member.identity}());`);
    } else {
      const v = camel(what);
      const def = contract.states?.[what];
      const between = (activator?.node.activates ?? root.activates)?.between;
      if (def?.values && between) {
        s.push(
          `    this.${v}.set(this.${v}() === '${between[1]}' ? '${between[0]}' : '${between[1]}');`,
        );
      } else if (def?.values) {
        assume(
          'activating a valued state with no `between`',
          'cycles through the declared values in order',
          'The contract declares more than two values and does not say which two a user may move between. Same choice all three backends make, and wrong in the same way for a checkbox.',
        );
        s.push(`    const order = [${def.values.map((x) => `'${x}'`).join(', ')}] as const;`);
        s.push(`    this.${v}.set(order[(order.indexOf(this.${v}()) + 1) % order.length]!);`);
      } else {
        s.push(`    this.${v}.set(!this.${v}());`);
      }
    }
    s.push(`  }`);
    s.push(``);
  }

  if (nativelyEdited) {
    const v = camel(valueState.from);
    s.push(`  protected handleInput(event: Event): void {`);
    s.push(`    this.${v}.set((event.target as HTMLInputElement).value);`);
    s.push(`  }`);
    s.push(``);
  }

  if (navigation) {
    s.push(`  protected readonly nav2 = this.navHandlers;`);
    s.push(``);
  }

  if (needsIdsHelper.value) {
    s.push(`  /**`);
    s.push(`   * Join the ids that are present, or null.`);
    s.push(`   *`);
    s.push(`   * A METHOD, because the inline form the other two emitters write —`);
    s.push(
      `   * \`[a, b].filter(Boolean).join(' ') || null\` — cannot work in an Angular template.`,
    );
    s.push(
      `   * Template expressions see only members of this class, so \`Boolean\` is undefined and`,
    );
    s.push(
      `   * \`.filter(undefined)\` throws DURING CHANGE DETECTION, which aborts the whole pass:`,
    );
    s.push(`   * every other component on the page stops updating and nothing says why.`);
    s.push(`   */`);
    s.push(`  protected ids(...parts: (string | null)[]): string | null {`);
    s.push(`    return parts.filter(Boolean).join(' ') || null;`);
    s.push(`  }`);
    s.push(``);
  }

  // Trim a trailing blank line so the class does not end with one.
  while (s.length && s[s.length - 1] === '') s.pop();
  s.push(`}`);
  s.push(``);
  return s.join('\n');
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
  suffix: '.angular.json',
});
const prefix = readJson(join(REPO_ROOT, 'ds.config.json')).dataPrefix;

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, `${name}.ts`), emitComponent(name, contract, binding, prefix), 'utf8');
writeFileSync(
  join(outDir, `${name}.structure.css`),
  emitStructure(name, contract, binding.element, prefix, WEB, assume),
  'utf8',
);

const themePath = join(outDir, `${name}.theme.css`);
if (existsSync(themePath)) {
  console.log(`  kept   ${name}.theme.css (yours — never regenerated)`);
} else {
  writeFileSync(themePath, emitTheme(name, contract, prefix, WEB), 'utf8');
}

const hasContext = Boolean(contract.collection);
writeFileSync(
  join(outDir, 'index.ts'),
  hasContext
    ? `export { ${name}, ${name.toUpperCase()}, type ${name}Context } from './${name}';\n`
    : `export { ${name} } from './${name}';\n`,
  'utf8',
);

const surface = surfaceFrom(contract);
console.log(`\nemitted ${name} -> ${outDir}`);
console.log(`  selector: ${selectorFor(binding.element, name, prefix)}`);
console.log(
  `  inputs:   ${
    surface
      .filter((p) => p.role !== 'model')
      .map((p) => p.name)
      .join(', ') || '(none)'
  }`,
);
console.log(
  `  models:   ${
    surface
      .filter((p) => p.role === 'model')
      .map((p) => `${p.name} ([(${p.name})])`)
      .join(', ') || '(none)'
  }`,
);
console.log(
  `  slots:    ${
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
