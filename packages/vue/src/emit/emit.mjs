#!/usr/bin/env node
// THE SECOND BACKEND. Same spike status as the React emitter, same rules, different framework.
//
// It exists to answer the question ADR 0002 is held at Draft waiting for: does a component contract
// compile to a framework that is not the one it was written beside, WITHOUT editing the contract?
// Everything it cannot derive from the contract it records in EMITTER_ASSUMPTIONS rather than
// quietly deciding, exactly as its React twin does, so the two lists can be diffed.
//
//   node packages/vue/src/emit/emit.mjs <Name> --out <dir>
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
const BINDINGS = join(REPO_ROOT, 'packages/vue/bindings');

// The WEB PLATFORM, as data. THE SAME PACKAGE THE REACT EMITTER READS, unchanged — which is the
// single most load-bearing line in this file. `@ds/platform-web` was extracted from the React
// emitter on the claim that eleven of its thirteen lookup tables were web knowledge rather than
// React knowledge, and that claim was untestable with one backend. This import is the test.
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

import { camel, pascal, slotsFrom, surfaceFrom } from './surface.mjs';

const EMITTER_ASSUMPTIONS = [];
const assume = (topic, decision, why) => EMITTER_ASSUMPTIONS.push({ topic, decision, why });

// Vue's key for a DOM event inside `$attrs`. NOT React's spelling, and the difference is a real
// source of silent bugs: Vue capitalises only the first letter after `on`, so `@keydown` arrives as
// `onKeydown` and NOT `onKeyDown`. Reading the React spelling here would find nothing, the
// consumer's handler would never be called, and no error would be produced anywhere.
const attrKeyFor = (event) => `on${event.charAt(0).toUpperCase()}${event.slice(1)}`;

// How a state name evaluates INSIDE A TEMPLATE.
//
// Vue unwraps a top-level ref in the template and does not unwrap one reached through an object, so
// the emitter's rule is that every value a template reads is a top-level binding in `<script setup>`
// and nothing else. That is why members get a local `isDisabled` computed instead of the React
// emitter's inline `disabled || ctx.disabled`: the inline form would have to say `ctx.disabled.value`
// in the template, which works but puts framework plumbing in the markup.
function stateExpr(spec, ctx) {
  const [state, value] = spec.includes('=') ? spec.split('=') : [spec, null];
  let base;
  if (ctx.memberReflects === state) base = 'selected';
  else base = camel(state);
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
    attrs.push(`:id="${idFor(key)}"`);
  }
  if (node.controls) attrs.push(`:${relationAttribute('controls', WEB)}="${refId(node.controls)}"`);
  if (node.namedBy) attrs.push(`:${relationAttribute('namedBy', WEB)}="${refId(node.namedBy)}"`);
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
      `:${relationAttribute('describedBy', WEB)}="[${pieces.join(', ')}].filter(Boolean).join(' ') || undefined"`,
    );
  }
  if (node.activates?.toggles) attrs.push(`@click="activate"`);
  if (node.activates?.toggles && node.role === 'button') attrs.push(`type="button"`);
  if (node.visibleWhen)
    attrs.push(`:${WEB.visibility.attribute}="!(${stateExpr(node.visibleWhen, ctx)})"`);
  if (node.role === 'button' && ctx.disabledExpr) attrs.push(`:disabled="${ctx.disabledExpr}"`);
  if (typeof node.controls === 'string') {
    const target = Object.entries(contract.anatomy.root.parts ?? {}).find(
      ([k]) => k === node.controls,
    );
    if (target && target[1].visibleWhen) {
      attrs.push(`:aria-expanded="${stateExpr(target[1].visibleWhen, ctx)}"`);
    }
  }
  // The part the contract names as the range's track is the box a pointer is measured against. A
  // Vue function ref takes the element directly; there is no callback-ref composition to write,
  // because a consumer's ref never lands on a part this deep.
  if (ctx.rangeTrack === key) attrs.push(`:ref="range.setTrack"`);
  attrs.push(`data-${prefix}-part="${node.part}"`);

  const kids = Object.entries(node.parts ?? {});
  const out = [];
  if (!kids.length && !slot && !takesChildrenHere) {
    out.push(`${pad}<${nodeEl} ${attrs.join(' ')} />`);
    return out;
  }
  out.push(`${pad}<${nodeEl} ${attrs.join(' ')}>`);
  if (slot) out.push(`${pad}  <slot name="${slot.name}" />`);
  if (takesChildrenHere) out.push(`${pad}  <slot />`);
  for (const [k, child] of kids) out.push(...renderPart(k, child, ctx, depth + 1));
  out.push(`${pad}</${nodeEl}>`);
  return out;
}

// ---------------------------------------------------------------------------------------
// the single-file component
// ---------------------------------------------------------------------------------------
function emitSfc(name, contract, binding, prefix) {
  const props = surfaceFrom(contract);
  const slots = slotsFrom(contract);
  const root = contract.anatomy.root;
  const el = binding.element;
  const rootRole = root.role ?? contract.semantics?.role;

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

  // A member contract is NOT self-contained: whether its selection is a set or a single value lives
  // in the ancestor's contract. Identical to the React emitter, because it is a fact about the
  // CONTRACT SET and not about either framework — the second backend hitting the same wall in the
  // same place is evidence the wall is real.
  let memberMany = false;
  let memberNav = null;
  if (member) {
    const facts = memberFacts(name, member, CONTRACTS);
    memberMany = facts.many;
    memberNav = facts.navigation;
    assume(
      'a member contract is not self-contained',
      `read ${member.of}.contract.json to learn the selection is ${memberMany ? 'a set' : 'a single value'}`,
      'Cardinality lives on the ancestor, so this component cannot be compiled from its own contract alone. The React emitter reports the same thing, which is what makes it a property of the contract set rather than of a backend.',
    );
  }

  const navigation = collection?.navigation ?? null;
  const registers = Boolean(memberNav && root.activates);
  const ariaDisabledOnly = registers && memberNav.disabledItems === 'focusable';

  const hasDisabled = inputs.some((p) => p.name === 'disabled');
  const hasReadOnly = inputs.some((p) => p.name === 'readOnly');
  // Every member gets a local `isDisabled`, because a member's disabled state is the union of its
  // own prop and its collection's, and the template may only read top-level bindings.
  const disabledExpr = member ? 'isDisabled' : hasDisabled ? 'disabled' : null;
  const disabledScript = member ? 'isDisabled.value' : hasDisabled ? 'props.disabled' : null;

  const allParts = partsOf(root);
  const activator = allParts.find((p) => p.node.activates?.toggles);
  const rootToggles = root.activates?.toggles;

  assume(
    'how a state reaches the DOM',
    'ARIA attribute where one is conventional AND the element has a role, native attribute for disabled, otherwise data-<prefix>-state',
    'Resolved by @ds/platform-web, NOT by this emitter — which is the whole point of the extraction. This backend added no table of its own and changed none of the profile.',
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
      `wired @input, NOT @change, because the binding renders <${el}>`,
      "THE BACKENDS DISAGREE HERE AND BOTH ARE RIGHT. React wires this to `onChange`, which is React's SYNTHETIC event and fires per keystroke; the DOM's own `change` event fires on blur. Vue has no synthetic layer, so the DOM applies and the per-keystroke event is `input`. The contract says only that the element edits its own value — correctly, because naming either event would have baked one framework's runtime into the specification.",
    );
  }
  if (range) {
    assume(
      'how a pointer becomes a number',
      `measured against the "${range.track}" part's box, with pointer capture on the root`,
      'The contract names the track and the axis and stops there. Everything after is this backend, and it reached the same answer as the React one: getBoundingClientRect, setPointerCapture, jump to the pressed point. Same conformance cases, so the two inventions are held equivalent rather than assumed to be.',
    );
  }
  if (platformModal) {
    assume(
      'how a modal opens and closes',
      'a post-flush watcher calls showModal()/close(), and a MutationObserver on the `open` attribute keeps the model in sync',
      "The React emitter needed its first useEffect here; this one needs its first `flush: 'post'` watcher, for the identical reason — a <dialog> cannot be opened by rendering an attribute, so the call has to happen after the DOM exists. The framework primitive differs, the platform obligation does not. @ds/platform-web supplied both the method names and the fact that the platform answers Escape.",
    );
  }
  if (dismisses) {
    const skipped = dismisses.on.filter((c) => !dismissCauses.includes(c));
    assume(
      'what a platform already supplies of a dismissal',
      dismissCauses.length
        ? `generated ${dismissCauses.join(' and ')}${skipped.length ? `; ${skipped.join(' and ')} left to the platform` : ''}`
        : `nothing generated — the platform supplies ${skipped.join(' and ')}`,
      'Read straight out of @ds/platform-web > visibility.supplies, with no Vue-specific reasoning at any point.',
    );
  }
  if (navigation) {
    assume(
      'how a collection moves focus between its members',
      'a member registration protocol over provide/inject, plus useLinearNavigation from @ds/vue/behavior',
      'The React emitter logged this assumption predicting that "Vue would use provide/inject". It does. The contract declares WHAT the keyboard does and says nothing about how a backend learns which DOM nodes its members are, which is exactly the room the two protocols needed.',
    );
  }
  if (member) {
    assume(
      'how a member reaches its collection',
      'provide/inject, with the injection key exported from the ancestor SFC',
      'The contract says this component is a member of an ancestor collection; it does not and should not say HOW. React uses context; this uses an InjectionKey exported from a non-setup <script> block, because a <script setup> block cannot export a binding.',
    );
  }

  const idFor = (key) => (key === 'root' ? 'baseId' : '`${baseId}-' + key + '`');
  const refId = (spec) => {
    if (typeof spec === 'string') return idFor(spec);
    if (!member) {
      throw new Error(
        `${name} references member "${spec.member}" but is not itself a member of any collection, ` +
          `so there is no shared ancestor to resolve the reference against.`,
      );
    }
    // `collection`, not `ctx`: `ctx` is the nullable result of inject() and TypeScript's
    // narrowing from the throw above does not reach a template expression.
    const base = '`${collection.baseId}-' + spec.member + '-${props.' + member.identity + '}`';
    return spec.part === 'root' ? base : base.slice(0, -1) + '-' + spec.part + '`';
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

  const ctx = {
    prefix,
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
  // <script> — the block that can export. Props type, and a collection's injection key.
  // -------------------------------------------------------------------------------------
  const head = [];
  head.push(`<!--`);
  head.push(`  GENERATED from ${name}.contract.json + ${name}.vue.json. Do not edit by hand.`);
  head.push(`  Regenerate: node packages/vue/src/emit/emit.mjs ${name} --out <dir>`);
  head.push(``);
  head.push(`  ${contract.intent.purpose.replace(/\s+/g, ' ')}`);
  head.push(`-->`);
  head.push(``);

  const declaredProps = [...inputs, ...axes, ...(identity ? [identity] : [])];
  const exportsSomething = declaredProps.length > 0 || Boolean(collection);

  if (exportsSomething) {
    head.push(`<script lang="ts">`);
    const typeImports = [];
    if (collection) typeImports.push('ComputedRef', 'InjectionKey');
    if (typeImports.length) head.push(`import type { ${typeImports.join(', ')} } from 'vue';`);
    if (collection && navigation) {
      head.push(`import type { MemberRegistration } from '@ds/vue/behavior';`);
    }
    if (typeImports.length) head.push(``);

    if (declaredProps.length) {
      head.push(
        `/** What a consumer may pass. \`v-model\` bindings are declared separately below. */`,
      );
      head.push(`export interface ${name}Props {`);
      for (const p of declaredProps) {
        const d = (p.description ?? '').replace(/\s+/g, ' ');
        head.push(
          `  /** ${d}${p.role === 'axis' && p.default ? ` Defaults to \`${p.default}\`.` : ''} */`,
        );
        head.push(`  ${p.name}${p.required ? '' : '?'}: ${p.type};`);
      }
      head.push(`}`);
      head.push(``);
    }

    if (collection) {
      const t = many ? 'string[]' : 'string';
      head.push(`/** Published to every member through provide/inject. */`);
      head.push(`export interface ${name}ContextValue {`);
      head.push(`  /** The current selection, by member ${collection.identity}. */`);
      head.push(`  selection: ComputedRef<${t}>;`);
      head.push(`  /** Called by a member when it is activated. */`);
      head.push(`  toggle: (${collection.identity}: string) => void;`);
      head.push(`  /** Shared id root, so a member's parts can reference one another. */`);
      head.push(`  baseId: string;`);
      head.push(`  /** True when the whole collection is disabled. */`);
      head.push(`  disabled: ComputedRef<boolean>;`);
      if (navigation) {
        head.push(`  /** A member announces its DOM node, so the collection can move focus. */`);
        head.push(
          `  register: (${collection.identity}: string, entry: MemberRegistration) => void;`,
        );
        head.push(`  unregister: (${collection.identity}: string) => void;`);
        head.push(`  /** True for the one member that sits in the page's tab sequence. */`);
        head.push(`  isTabStop: (${collection.identity}: string) => boolean;`);
      }
      head.push(`}`);
      head.push(``);
      head.push(`/**`);
      head.push(` * The injection key. Exported from THIS block and not from \`<script setup>\`,`);
      head.push(
        ` * because a setup block compiles to a render function and cannot export a binding.`,
      );
      head.push(` */`);
      head.push(`export const ${name}Key: InjectionKey<${name}ContextValue> = Symbol('${name}');`);
    }
    head.push(`</script>`);
    head.push(``);
  }

  // -------------------------------------------------------------------------------------
  // <script setup>
  // -------------------------------------------------------------------------------------
  const s = [];
  const vueImports = new Set(['computed', 'useAttrs']);
  if (needsIds && !member) vueImports.add('useId');
  if (collection) vueImports.add('provide');
  if (member) vueImports.add('inject');
  // ONE NAME PER CALL. `Set.add` takes a single argument and silently ignores the rest, so the
  // multi-argument form emitted a component that used `watchEffect` without importing it — and
  // the emitter reported success, because nothing it does resolves an import.
  if (registers) for (const i of ['ref', 'watch', 'onBeforeUnmount']) vueImports.add(i);
  if (platformModal) {
    for (const i of ['ref', 'watchEffect', 'onMounted', 'onBeforeUnmount']) vueImports.add(i);
  }

  s.push(`<script setup lang="ts">`);
  s.push(`import { ${[...vueImports].sort().join(', ')} } from 'vue';`);
  const behaviorImports = [];
  if (range) behaviorImports.push('snap', 'useRangeControl');
  if (dismissCauses.length) behaviorImports.push('useDismissal');
  if (navigation) behaviorImports.push('useLinearNavigation');
  if (behaviorImports.length) {
    const types = [];
    if (range) types.push('RangeOptions');
    if (dismissCauses.length) types.push('DismissalOptions');
    if (navigation) types.push('NavigationOptions');
    s.push(`import { ${behaviorImports.sort().join(', ')} } from '@ds/vue/behavior';`);
    s.push(`import type { ${types.sort().join(', ')} } from '@ds/vue/behavior';`);
  }
  if (member) {
    s.push(
      `import { ${member.of}Key, type ${member.of}ContextValue } from '../${member.of}/${member.of}.vue';`,
    );
  }
  s.push(`import './${name}.structure.css';`);
  s.push(`import './${name}.theme.css';`);
  s.push(``);

  // `inheritAttrs: false` is NOT a style choice. Vue's default is to drop every unrecognised
  // attribute onto the root AFTER the element's own bindings, which would let a consumer replace
  // `role`, `type` or `id` from outside — the exact thing emit/README.md §4 forbids. Turning it off
  // and binding `$attrs` FIRST reproduces React's `{...rest}`-before-identity ordering.
  s.push(`// \`inheritAttrs: false\` so a consumer cannot overwrite the attributes that make this`);
  s.push(`// component what it is. See packages/vue/src/emit/README.md §4.`);
  s.push(`defineOptions({ name: '${name}', inheritAttrs: false });`);
  s.push(``);

  // A SENTINEL, patched at the end of this function. Whether the declaration needs to be bound to
  // a `props` const depends on whether anything generated AFTER this point reads one, and
  // `noUnusedLocals` turns an unbound guess into a failed typecheck in either direction.
  const PROPS_DECL = '@@props-decl@@';
  if (declaredProps.length) s.push(PROPS_DECL);

  // ---- the models. ONE declaration per shared state, where React needs three props.
  for (const m of models) {
    const def = m.from === 'selection' ? null : contract.states[m.from];
    const d = def ? def.description.replace(/\s+/g, ' ') : m.description;
    // AN ARRAY DEFAULT MUST BE A FACTORY. Vue shares one props object across every instance of a
    // component, so a literal `[]` would be one array that every accordion on the page mutated in
    // common — which is why Vue's types reject it outright rather than letting it ship.
    const dflt =
      m.default === '' ? `''` : Array.isArray(m.default) ? '() => []' : JSON.stringify(m.default);
    s.push(``);
    s.push(`/** ${d} Two-way: \`v-model:${kebab(m.name)}\`. */`);
    s.push(`const ${m.name} = defineModel<${m.type}>('${m.name}', { default: ${dflt} });`);
  }
  if (models.length) s.push(``);

  if (slots.length) {
    s.push(`defineSlots<{`);
    for (const sl of slots) {
      s.push(`  /** ${(sl.description ?? 'Slot content.').replace(/\s+/g, ' ')} */`);
      s.push(`  ${sl.name}${sl.required ? '' : '?'}(): unknown;`);
    }
    s.push(`}>();`);
    s.push(``);
  }

  // ---- attribute fallthrough, minus the events this component composes by hand
  const composedEvents = new Set();
  const handlers = {};
  let styleComputed = null;
  const onEvent = (event, expr, takesEvent = true) => {
    composedEvents.add(event);
    (handlers[event] ??= []).push({ expr, takesEvent });
  };

  // ---- member: read the ancestor's context
  if (member) {
    s.push(`const ctx = inject<${member.of}ContextValue | null>(${member.of}Key, null);`);
    s.push(`if (!ctx) {`);
    s.push(
      `  throw new Error('${name} must be rendered inside a ${member.of}. There is no selection to compare against, and looking unselected would hide the mistake.');`,
    );
    s.push(`}`);
    s.push(`const collection = ctx;`);
    s.push(``);
    s.push(
      `const selected = computed(() => ${memberMany ? `collection.selection.value.includes(props.${member.identity})` : `collection.selection.value === props.${member.identity}`});`,
    );
    s.push(
      `const isDisabled = computed(() => ${hasDisabled ? 'Boolean(props.disabled) || ' : ''}collection.disabled.value);`,
    );
    if (needsIds) {
      s.push(
        `const baseId = computed(() => \`\${collection.baseId}-${name}-\${props.${member.identity}}\`);`,
      );
    }
    s.push(``);
  } else if (needsIds) {
    s.push(`const baseId = useId();`);
    s.push(``);
  }

  if (registers) {
    s.push(`// The collection moves focus between its members, so each one announces its element.`);
    s.push(`// Vue's template ref plus a watcher replaces React's composed callback ref — and`);
    s.push(`// needs no composition, because a consumer's own ref reaches this component through`);
    s.push(`// \`$el\` rather than through anything the emitter has to thread.`);
    s.push(`const rootEl = ref<HTMLElement | null>(null);`);
    s.push(`let registeredValue: string | null = null;`);
    s.push(`// Explicit sources keep registry notifications out of this watcher's dependencies.`);
    s.push(
      `watch([rootEl, () => props.${member.identity}, isDisabled], ([node, value, disabled]) => {`,
    );
    s.push(`  if (registeredValue !== null && (!node || registeredValue !== value)) {`);
    s.push(`    collection.unregister(registeredValue);`);
    s.push(`    registeredValue = null;`);
    s.push(`  }`);
    s.push(`  if (node) {`);
    s.push(`    registeredValue = value;`);
    s.push(`    collection.register(value, { element: node, disabled });`);
    s.push(`  }`);
    s.push(`});`);
    s.push(`onBeforeUnmount(() => {`);
    s.push(`  if (registeredValue !== null) collection.unregister(registeredValue);`);
    s.push(`});`);
    s.push(``);
  }

  // ---- a platform modal
  if (platformModal) {
    const v = camel(platformModal);
    const vis = visibilityOf(el, WEB);
    s.push(
      `// A <dialog> is opened by CALLING ${vis.show}(), never by rendering an attribute. The`,
    );
    s.push(`// watcher is \`flush: 'post'\` so the element exists when it runs; the React emitter`);
    s.push(`// reaches for useEffect at exactly this point and for exactly this reason.`);
    s.push(`const dialogEl = ref<HTMLDialogElement | null>(null);`);
    s.push(``);
    s.push(`watchEffect(`);
    s.push(`  () => {`);
    s.push(`    const node = dialogEl.value;`);
    s.push(`    if (!node) return;`);
    s.push(
      `    // \`${vis.reflects}\` reflects ${vis.show}() having been called, so it is also the guard`,
    );
    s.push(`    // against calling it twice.`);
    s.push(`    if (${v}.value && !node.${vis.reflects}) node.${vis.show}();`);
    s.push(`    else if (!${v}.value && node.${vis.reflects}) node.${vis.hide}();`);
    s.push(`  },`);
    s.push(`  { flush: 'post' },`);
    s.push(`);`);
    s.push(``);
    s.push(`// The dialog closes ITSELF on Escape, so this component is no longer the only writer`);
    s.push(
      `// of its own state. Without this the platform would hide the element while \`${platformModal}\``,
    );
    s.push(`// stayed true, and the next open would be a no-op.`);
    s.push(`//`);
    s.push(
      `// Synced from the ELEMENT's own \`${vis.reflects}\` attribute, not from a \`close\` event —`,
    );
    s.push(`// measured unreliable in Chrome and documented as such by a11y-dialog. Observing the`);
    s.push(`// attribute reads what is TRUE and catches every way the platform can close this`);
    s.push(`// element behind the component's back.`);
    s.push(`function handleClose() {`);
    s.push(
      `  // Guarded, or a close that has already been recorded emits \`update:${kebab(v)}\` a`,
    );
    s.push(`  // second time and a consumer counting dismissals counts two.`);
    s.push(`  if (${v}.value) ${v}.value = false;`);
    s.push(`}`);
    s.push(``);
    s.push(`let openObserver: MutationObserver | null = null;`);
    s.push(`onMounted(() => {`);
    s.push(`  const node = dialogEl.value;`);
    s.push(`  if (!node) return;`);
    s.push(`  openObserver = new MutationObserver(() => {`);
    s.push(`    if (!node.${vis.reflects}) handleClose();`);
    s.push(`  });`);
    s.push(
      `  openObserver.observe(node, { attributes: true, attributeFilter: ['${vis.reflects}'] });`,
    );
    s.push(`});`);
    s.push(`onBeforeUnmount(() => openObserver?.disconnect());`);
    s.push(``);
  }

  // ---- dismissal
  if (dismissCauses.length) {
    const v = camel(dismisses.state);
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
    if (platformModal === dismisses.state) {
      s.push(
        `// A platform modal is closed BY THE ELEMENT, never by writing the state: writing it`,
      );
      s.push(`// would run the watcher, which calls close(), which the observer sees — two`);
      s.push(`// notifications for one dismissal. One close path, one place to look.`);
      s.push(
        `const dismiss${pascal(dismisses.state)} = () => dialogEl.value?.${visibilityOf(el, WEB).hide}();`,
      );
    } else {
      s.push(`const dismiss${pascal(dismisses.state)} = () => {`);
      s.push(`  ${v}.value = false;`);
      s.push(`};`);
    }
    s.push(
      `const dismissal = useDismissal(DISMISSAL, () => ${v}.value, dismiss${pascal(dismisses.state)});`,
    );
    s.push(``);
  }

  // ---- range
  if (range) {
    const v = camel(range.state);
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
    s.push(`const range = useRangeControl(`);
    s.push(`  RANGE,`);
    s.push(`  () => ${v}.value,`);
    s.push(`  (next: number) => {`);
    s.push(`    ${v}.value = next;`);
    s.push(`  },`);
    s.push(`  () => ${disabledScript ? `Boolean(${disabledScript})` : 'false'},`);
    s.push(`);`);
    s.push(``);
  }

  // ---- the collection's own selection
  if (selShared) {
    // THE PARAMETER MAY NOT BE NAMED FOR THE MEMBER IDENTITY.
    //
    // `collection.identity` is `value` in all three collections, and so is the selection model —
    // which in Vue is a REAL BINDING called `value`, not React's `valueInternal` behind a
    // `selection` alias. Naming the parameter `value` shadowed the model inside the function, so
    // `value.value = value` read the parameter's own `.value` (undefined on a string) and wrote it
    // back. It compiled, it ran, and selecting a tab did nothing.
    const memberArg = `member${pascal(collection.identity)}`;
    s.push(
      `// \`${memberArg}\`, not \`${collection.identity}\`: the selection model is a binding of that name.`,
    );
    s.push(`function toggle(${memberArg}: string) {`);
    if (many) {
      s.push(`  value.value = value.value.includes(${memberArg})`);
      s.push(`    ? value.value.filter((v) => v !== ${memberArg})`);
      s.push(`    : [...value.value, ${memberArg}];`);
    } else if (collection.selection.cardinality === 'at-most-one') {
      s.push(`  value.value = value.value === ${memberArg} ? '' : ${memberArg};`);
    } else {
      s.push(`  if (value.value === ${memberArg}) return;`);
      s.push(`  value.value = ${memberArg};`);
    }
    s.push(`}`);
    s.push(``);
    if (navigation) {
      s.push(`// Transcribed field for field from ${name}.contract.json > collection.navigation.`);
      s.push(`// The cases this commits us to are in`);
      s.push(`// @ds/contracts/conformance/linear-navigation.json.`);
      s.push(`const NAVIGATION: NavigationOptions = {`);
      for (const [k, val] of Object.entries(navigation)) {
        s.push(`  ${k}: ${typeof val === 'string' ? `'${val}'` : String(val)},`);
      }
      s.push(`};`);
      s.push(``);
      s.push(
        `// \`toggle\` is the selection setter, and \`followsFocus\` is what decides whether the`,
      );
      s.push(`// primitive calls it. With followsFocus false it is never called from here and`);
      s.push(`// arrowing only moves focus.`);
      s.push(`const nav = useLinearNavigation(NAVIGATION, () => value.value, toggle);`);
      s.push(``);
    }
    s.push(`provide(${name}Key, {`);
    s.push(`  selection: computed(() => value.value),`);
    s.push(`  toggle,`);
    s.push(`  baseId,`);
    s.push(`  disabled: computed(() => ${hasDisabled ? 'Boolean(props.disabled)' : 'false'}),`);
    if (navigation) {
      s.push(`  register: nav.register,`);
      s.push(`  unregister: nav.unregister,`);
      s.push(`  isTabStop: nav.isTabStop,`);
    }
    s.push(`});`);
    s.push(``);
  }

  // ---- activation
  if (activator || rootToggles) {
    const what = activator?.node.activates.toggles ?? rootToggles;
    s.push(`function activate(event?: { defaultPrevented: boolean }) {`);
    s.push(`  // Guards, because this runs on a CLICK and the platform guards there too: calling`);
    s.push(`  // preventDefault() in a click handler is what cancels a native checkbox's toggle.`);
    s.push(`  if (event?.defaultPrevented) return;`);
    const guards = [];
    if (disabledScript) guards.push(disabledScript);
    if (hasReadOnly) guards.push('props.readOnly');
    if (guards.length) s.push(`  if (${guards.join(' || ')}) return;`);
    if (what === 'member') {
      s.push(`  collection.toggle(props.${member.identity});`);
    } else {
      const v = camel(what);
      const def = contract.states?.[what];
      const between = (activator?.node.activates ?? root.activates)?.between;
      if (def?.values && between) {
        s.push(
          `  ${v}.value = ${v}.value === '${between[1]}' ? '${between[0]}' : '${between[1]}';`,
        );
      } else if (def?.values) {
        assume(
          'activating a valued state with no `between`',
          'cycles through the declared values in order',
          'The contract declares more than two values and does not say which two a user may move between, so the emitter cycles. Same choice the React emitter makes, and wrong in the same way for a checkbox.',
        );
        s.push(`  const order = [${def.values.map((x) => `'${x}'`).join(', ')}] as const;`);
        s.push(`  ${v}.value = order[(order.indexOf(${v}.value) + 1) % order.length]!;`);
      } else {
        s.push(`  ${v}.value = !${v}.value;`);
      }
    }
    s.push(`}`);
    s.push(``);
  }

  // ---- natively edited value
  if (nativelyEdited) {
    const v = camel(valueState.from);
    s.push(`function handleInput(event: Event) {`);
    s.push(`  ${v}.value = (event.target as HTMLInputElement).value;`);
    s.push(`}`);
    s.push(``);
  }

  // -------------------------------------------------------------------------------------
  // root attributes
  // -------------------------------------------------------------------------------------
  const rootAttrs = [];
  rootAttrs.push(`v-bind="fallthrough"`);
  if (platformModal) rootAttrs.push(`ref="dialogEl"`);
  else if (registers) rootAttrs.push(`ref="rootEl"`);
  if (submitsByDefault(el, WEB)) rootAttrs.push(`type="button"`);
  if (rootRole && implicitRole(el, WEB) !== rootRole) rootAttrs.push(`role="${rootRole}"`);
  if (needsIds) rootAttrs.push(`:id="baseId"`);

  for (const [st, def] of Object.entries(contract.states ?? {})) {
    const asModel = models.find((m) => m.from === st);
    const asInput = inputs.find((p) => p.from === st);
    if (!asModel && !asInput) continue;
    const expr = camel(st);
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
      rootAttrs.push(`:${decision.attribute}="${map} : undefined"`);
      continue;
    }
    if (decision.channel === 'native' || decision.channel === 'aria') {
      rootAttrs.push(
        decision.rendersFalse
          ? `:${decision.attribute}="${expr}"`
          : `:${decision.attribute}="${expr} || undefined"`,
      );
    } else if (decision.channel === 'none') {
      // Deliberately nothing. Free text is CONTENT, and mirroring it into an attribute leaks
      // whatever the person typed.
    } else if (def.values) rootAttrs.push(`:data-${prefix}-state-${st}="${expr}"`);
    else rootAttrs.push(`:data-${prefix}-state-${st}="${expr} || undefined"`);
  }

  if (member) {
    const declared = ariaAttributeFor(member.reflects, WEB);
    const attr = declared && ariaFitsRole(declared, rootRole ?? null, WEB) ? declared : null;
    if (declared && !attr) {
      assume(
        'a member state whose ARIA attribute its role does not support',
        `${member.reflects} does not reach ${declared} on role="${rootRole}" — emitted data-${prefix}-state-${member.reflects} instead`,
        'Answered by @ds/platform-web > aria, not by this emitter. The React backend reports the identical decision for the identical component, which is what the shared profile exists to guarantee.',
      );
    }
    if (attr) {
      rootAttrs.push(
        rendersFalse(attr, WEB) ? `:${attr}="selected"` : `:${attr}="selected || undefined"`,
      );
    } else {
      rootAttrs.push(`:data-${prefix}-state-${member.reflects}="selected || undefined"`);
      assume(
        'a member state outside the ARIA table',
        `emitted data-${prefix}-state-${member.reflects} instead`,
        'The state-to-attribute table is a closed list in @ds/platform-web. A state name it does not know reaches no ARIA attribute at all, and nothing detects that a component needs one.',
      );
    }
  }

  // The roving tab stop. Vue spells the attribute `tabindex`, all lower case — it is the DOM
  // attribute, not React's `tabIndex` property alias.
  if (registers) {
    rootAttrs.push(`:tabindex="collection.isTabStop(${identity.name}) ? 0 : -1"`);
  }
  if (range && contract.states?.dragging) {
    rootAttrs.push(`:data-${prefix}-state-dragging="range.dragging || undefined"`);
  }
  if (
    !registers &&
    contract.semantics?.focusable &&
    !isNativelyFocusable(el, WEB) &&
    (root.role || contract.semantics?.role)
  ) {
    rootAttrs.push(`:tabindex="${disabledExpr ? `${disabledExpr} ? -1 : 0` : '0'}"`);
    assume(
      'focus order',
      'every focusable member is given tabindex 0',
      'The contract declares `semantics.focusable` and nothing more. Same fallback the React emitter applies, for a component whose collection declares no keyboard model.',
    );
  }

  const axisNames = Object.keys(contract.axes ?? {});
  if (axisNames.length) {
    for (const axis of axisNames) rootAttrs.push(`:data-${prefix}-${kebab(axis)}="${axis}"`);
    assume(
      'axis values in the DOM',
      `data-${prefix}-<axis>="<value>" on the root`,
      'An axis that reaches no attribute cannot be styled. This is a third attribute family beside part and state, invented by the React emitter and copied here because the emitted CSS is shared between the two backends — which is itself the finding: the attribute contract is real and is written down nowhere.',
    );
  }

  if (nativelyEdited) {
    rootAttrs.push(`:value="${camel(valueState.from)}"`);
    if (hasReadOnly) rootAttrs.push(`:readonly="readOnly"`);
    onEvent('input', 'handleInput');
  }

  const ranged = Object.entries(contract.states ?? {}).find(([, d]) => d.valueType === 'number');
  if (ranged && rootRole) {
    const [rs, rd] = ranged;
    const expr = camel(rs);
    if (rd.min !== undefined) rootAttrs.push(`:${WEB.range.min}="${rd.min}"`);
    if (rd.max !== undefined) rootAttrs.push(`:${WEB.range.max}="${rd.max}"`);
    rootAttrs.push(
      range && range.state === rs
        ? `:${WEB.range.value}="snap(${expr}, RANGE)"`
        : `:${WEB.range.value}="${expr}"`,
    );
  }

  if (root.visibleWhen && !platformModal) {
    rootAttrs.push(`:${WEB.visibility.attribute}="!(${stateExpr(root.visibleWhen, ctx)})"`);
  }
  if (root.controls)
    rootAttrs.push(`:${relationAttribute('controls', WEB)}="${refId(root.controls)}"`);
  if (root.namedBy)
    rootAttrs.push(`:${relationAttribute('namedBy', WEB)}="${refId(root.namedBy)}"`);
  if ((root.describedBy ?? []).length) {
    rootAttrs.push(
      `:${relationAttribute('describedBy', WEB)}="[${root.describedBy.map((d) => refId(d)).join(', ')}].filter(Boolean).join(' ') || undefined"`,
    );
  }

  if (range) {
    onEvent('keydown', 'range.onKeyDown');
    if (range.drag) {
      onEvent('pointerdown', 'range.onPointerDown');
      onEvent('pointermove', 'range.onPointerMove');
      onEvent('pointerup', 'range.onPointerUp');
      onEvent('pointercancel', 'range.onPointerUp');
    }
    // The fill's length and the thumb's offset ARE the value. An ARRAY style binding, because a
    // `v-bind` object and a `:style` on one element do not merge — the later simply wins — and a
    // consumer's own inline style has to survive.
    // Computed in the SCRIPT, not inline in the template. A Vue template expression is parsed by
    // the SFC compiler rather than by TypeScript, so an `as` cast there is a parse error even in a
    // `lang="ts"` block.
    styleComputed = `const rootStyle = computed(() => [attrs.style as never, { '--${prefix}-fraction': range.fraction }]);`;
    rootAttrs.push(`:style="rootStyle"`);
  }
  if (dismissCauses.includes('escape')) onEvent('keydown', 'dismissal.onKeyDown');
  if (dismissCauses.includes('outside-press')) {
    onEvent('pointerdown', 'dismissal.onPointerDown');
    onEvent('pointercancel', 'dismissal.onPointerCancel', false);
    onEvent('click', 'dismissal.onClick');
  }
  if (navigation) onEvent('keydown', 'nav.onKeyDown');
  if (rootToggles) onEvent('click', 'activate');

  rootAttrs.push(`data-${prefix}-component="${name}"`);
  rootAttrs.push(`data-${prefix}-part="${root.part}"`);

  // ---- the fallthrough computed, now that every composed event is known
  const EVENT_ARG = {
    click: 'MouseEvent',
    keydown: 'KeyboardEvent',
    input: 'Event',
    pointerdown: 'PointerEvent',
    pointermove: 'PointerEvent',
    pointerup: 'PointerEvent',
    pointercancel: 'PointerEvent',
  };
  const excluded = [...composedEvents].sort().map(attrKeyFor);
  if (range) excluded.push('style');
  s.push(`const attrs = useAttrs();`);
  if (excluded.length) {
    s.push(`// Everything a consumer passed that this component does not compose by hand. The`);
    s.push(`// composed ones are pulled out here and called FIRST inside each handler below, so a`);
    s.push(`// consumer can preventDefault() and win — the ordering emit/README.md §5 requires.`);
    s.push(`const fallthrough = computed(() => {`);
    s.push(`  const rest: Record<string, unknown> = { ...attrs };`);
    for (const k of excluded) s.push(`  delete rest['${k}'];`);
    s.push(`  return rest;`);
    s.push(`});`);
  } else {
    s.push(`const fallthrough = computed(() => ({ ...attrs }));`);
  }
  if (styleComputed) {
    s.push(``);
    s.push(
      `// The fill's length and the thumb's offset ARE the value, and a consumer's own inline`,
    );
    s.push(`// style still has to land — hence the array form, which merges where a second`);
    s.push(`// \`:style\` would simply win.`);
    s.push(styleComputed);
  }
  s.push(``);

  for (const [event, exprs] of Object.entries(handlers)) {
    const arg = EVENT_ARG[event] ?? 'Event';
    const key = attrKeyFor(event);
    s.push(`function onRoot${pascal(event)}(event: ${arg}) {`);
    s.push(`  (attrs['${key}'] as ((e: ${arg}) => void) | undefined)?.(event);`);
    for (const e of exprs) s.push(`  ${e.expr}(${e.takesEvent ? 'event' : ''});`);
    s.push(`}`);
    s.push(``);
  }
  for (const event of Object.keys(handlers)) {
    rootAttrs.push(`@${event}="onRoot${pascal(event)}"`);
  }

  s.push(`</script>`);
  s.push(``);

  if (declaredProps.length) {
    const usesProps = s.some((l) => l !== PROPS_DECL && l.includes('props.'));
    const defaults = axes.filter((a) => a.default).map((a) => `${a.name}: '${a.default}'`);
    const lhs = usesProps ? 'const props = ' : '';
    const decl = defaults.length
      ? [
          `${lhs}withDefaults(defineProps<${name}Props>(), {`,
          ...defaults.map((d) => `  ${d},`),
          `});`,
        ]
      : [`${lhs}defineProps<${name}Props>();`];
    s.splice(s.indexOf(PROPS_DECL), 1, ...decl);
  }

  // -------------------------------------------------------------------------------------
  // <template>
  // -------------------------------------------------------------------------------------
  const t = [];
  t.push(`<template>`);
  t.push(`  <${el}`);
  for (const a of rootAttrs) t.push(`    ${a}`);
  if (isVoid(el, WEB)) {
    t.push(`  />`);
    t.push(`</template>`);
    return [...head, ...s, ...t].join('\n') + '\n';
  }
  t.push(`  >`);
  const kids = Object.entries(root.parts ?? {});
  for (const [k, node] of kids) t.push(...renderPart(k, node, ctx, 1));

  const orphaned = namedSlots.filter(
    (x) => !allParts.some((p) => (x.part ? p.key === x.part : p.key === x.name)),
  );
  if (orphaned.length) {
    assume(
      'slots with no anatomy part',
      `rendered bare: ${orphaned.map((o) => o.name).join(', ')}`,
      'The contract declares these slots but names no part for them, so there is no described region to put them in and no way to style where they land.',
    );
    for (const o of orphaned) t.push(`    <slot name="${o.name}" />`);
  }
  if (takesChildren && !childrenPart) t.push(`    <slot />`);
  t.push(`  </${el}>`);
  t.push(`</template>`);

  return [...head, ...s, ...t].join('\n') + '\n';
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
  suffix: '.vue.json',
});
const prefix = readJson(join(REPO_ROOT, 'ds.config.json')).dataPrefix;

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, `${name}.vue`), emitSfc(name, contract, binding, prefix), 'utf8');
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

const declared = surfaceFrom(contract).filter((p) => p.role !== 'model' || p.from === 'selection');
void declared;
const exportsType = surfaceFrom(contract).some((p) =>
  ['input', 'axis', 'identity'].includes(p.role),
);
writeFileSync(
  join(outDir, 'index.ts'),
  exportsType
    ? `export { default as ${name} } from './${name}.vue';\nexport type { ${name}Props } from './${name}.vue';\n`
    : `export { default as ${name} } from './${name}.vue';\n`,
  'utf8',
);

const surface = surfaceFrom(contract);
console.log(`\nemitted ${name} -> ${outDir}`);
console.log(
  `  props:  ${
    surface
      .filter((p) => p.role !== 'model')
      .map((p) => p.name)
      .join(', ') || '(none)'
  }`,
);
console.log(
  `  models: ${
    surface
      .filter((p) => p.role === 'model')
      .map((p) => `${p.name} (v-model:${kebab(p.name)})`)
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
