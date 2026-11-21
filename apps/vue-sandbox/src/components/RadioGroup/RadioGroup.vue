<!--
  GENERATED from RadioGroup.contract.json + RadioGroup.vue.json. Do not edit by hand.
  Regenerate: node packages/vue/src/emit/emit.mjs RadioGroup --out <dir>

  Holds one choice from a small set of mutually exclusive options, all visible at once. It exists so the chosen option has exactly one home: the items compare against it rather than each holding a copy.
-->

<script lang="ts">
import type { ComputedRef, InjectionKey } from 'vue';
import type { MemberRegistration } from '@ds/vue/behavior';

/** What a consumer may pass. `v-model` bindings are declared separately below. */
export interface RadioGroupProps {
  /** The whole group ignores interaction. Cascades to every item. */
  disabled?: boolean;
  /** The selection cannot be changed, but the group stays readable and focusable. Distinct from disabled, which removes it from the focus order. */
  readOnly?: boolean;
  /** Name of the submitted answer. An empty name contributes nothing. */
  name?: string;
  /** Whether an answer is required for form validation. */
  required?: boolean;
  /** The id of the form that owns this answer, when it is not an ancestor form. */
  form?: string;
}

/** Published to every member through provide/inject. */
export interface RadioGroupContextValue {
  /** The current selection, by member value. */
  selection: ComputedRef<string>;
  /** Called by a member when it is activated. */
  toggle: (value: string) => void;
  /** Shared id root, so a member's parts can reference one another. */
  baseId: string;
  /** True when the whole collection is disabled. */
  disabled: ComputedRef<boolean>;
  /** A member announces its DOM node, so the collection can move focus. */
  register: (value: string, entry: MemberRegistration) => void;
  unregister: (value: string) => void;
  /** True for the one member that sits in the page's tab sequence. */
  isTabStop: (value: string) => boolean;
}

/**
 * The injection key. Exported from THIS block and not from `<script setup>`,
 * because a setup block compiles to a render function and cannot export a binding.
 */
export const RadioGroupKey: InjectionKey<RadioGroupContextValue> = Symbol('RadioGroup');
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, provide, ref, useAttrs, useId, watch } from 'vue';
import { useLinearNavigation } from '@ds/vue/behavior';
import type { NavigationOptions } from '@ds/vue/behavior';
import './RadioGroup.structure.css';
import './RadioGroup.theme.css';

// `inheritAttrs: false` so a consumer cannot overwrite the attributes that make this
// component what it is. See packages/vue/src/emit/README.md §4.
defineOptions({ name: 'RadioGroup', inheritAttrs: false });

const props = defineProps<RadioGroupProps>();

// Effective disabled: the consumer's prop, or a disabled <fieldset> around the control.
// Everything below reads this one; the prop itself is never written.
const formDisabled = ref(false);
const effectiveDisabled = computed(() => Boolean(props.disabled) || formDisabled.value);

/** The current selection, by member identity. Two-way: `v-model:value`. */
const value = defineModel<string>('value', { default: '' });

defineSlots<{
  /** The options, in order. A radio group with one option is a checkbox with extra steps. */
  default?(): unknown;
}>();

const baseId = useId();

// `memberValue`, not `value`: the selection model is a binding of that name.
function toggle(memberValue: string) {
  if (value.value === memberValue) return;
  value.value = memberValue;
}

// Transcribed field for field from RadioGroup.contract.json > collection.navigation.
// The cases this commits us to are in
// @ds/contracts/conformance/linear-navigation.json.
const NAVIGATION: NavigationOptions = {
  orientation: 'both',
  wrap: true,
  followsFocus: true,
  disabledItems: 'skip',
};

// `toggle` is the selection setter, and `followsFocus` is what decides whether the
// primitive calls it. With followsFocus false it is never called from here and
// arrowing only moves focus.
const nav = useLinearNavigation(NAVIGATION, () => value.value, toggle);

provide(RadioGroupKey, {
  selection: computed(() => value.value),
  toggle,
  baseId,
  disabled: computed(() => effectiveDisabled.value),
  register: nav.register,
  unregister: nav.unregister,
  isTabStop: nav.isTabStop,
});

// One observer per DOCUMENT, shared by every generated control on it and refcounted, notifying
// only the controls a record can affect. Generated from packages/emit-web/form-disabled.mjs.
function watchFormDisabled(proxy: HTMLInputElement, sync: () => void): () => void {
  type Watcher = { proxy: HTMLInputElement; sync: () => void };
  type Registry = { observer: MutationObserver; watchers: Set<Watcher> };
  const doc = proxy.ownerDocument;
  const key = Symbol.for('ds.form-disabled');
  const host = doc as unknown as Record<symbol, Registry | undefined>;
  let registry = host[key];
  if (!registry) {
    const watchers = new Set<Watcher>();
    // ONE pass over the records, each tested cheaply before any subscriber is: a record on a
    // fieldset re-asks everything inside it, and an insertion elsewhere matters only if it holds
    // an <input>, since every proxy is one. Unrelated mutations cost a tag check, not a walk.
    const observer = new MutationObserver((records) => {
      const due = new Set<Watcher>();
      const collect = (root: Node) => {
        for (const watcher of watchers) if (root.contains(watcher.proxy)) due.add(watcher);
      };
      for (const record of records) {
        // A fieldset's own `disabled`, OR its children changing: which <legend> is first decides
        // whether the controls inside that legend are exempt, so adding or removing a child of a
        // fieldset can change the state of descendants that never moved.
        if (record.target.nodeName === 'FIELDSET') collect(record.target);
        if (record.type === 'attributes') continue;
        const added = record.addedNodes;
        for (let i = 0; i < added.length; i++) {
          const node = added[i] as Element;
          if (node.nodeType !== 1) continue;
          if (node.nodeName !== 'INPUT') {
            if (!node.firstElementChild || !node.getElementsByTagName('input').length) continue;
          }
          collect(node);
        }
      }
      for (const watcher of due) watcher.sync();
    });
    observer.observe(doc.documentElement, {
      attributes: true,
      attributeFilter: ['disabled'],
      childList: true,
      subtree: true,
    });
    registry = { observer, watchers };
    host[key] = registry;
  }
  const watcher: Watcher = { proxy, sync };
  registry.watchers.add(watcher);
  return () => {
    const current = host[key];
    if (!current) return;
    current.watchers.delete(watcher);
    if (current.watchers.size) return;
    current.observer.disconnect();
    delete host[key];
  };
}
// ---- form contribution (contract.form). See packages/wc/forms.md.
// The form proxy: in the form, out of sight, out of the pointer's and the tab order's reach.
const FORM_PROXY_STYLE = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  margin: '0',
  padding: '0',
  border: '0',
  opacity: '0',
  overflow: 'hidden',
  clipPath: 'inset(50%)',
  pointerEvents: 'none',
} as const;
const formProxy = ref<HTMLInputElement | null>(null);
// The answer a reset restores: captured once, at setup, never re-captured from props.
const formAnswer = value.value;
// Driven imperatively: a native reset rewrites the proxy behind the renderer's back.
function formWrite() {
  const proxy = formProxy.value;
  if (!proxy) return;
  proxy.value = value.value;
}
watch(value, formWrite, { flush: 'post' });
let formDocument: Document | undefined;
let formUnwatch: (() => void) | undefined;
let formTimer: ReturnType<typeof setTimeout> | undefined;
// Matched against the CURRENT owner when it fires, so a `form` prop, an owner change or a
// move needs no re-subscription.
function onFormReset(event: Event) {
  const proxy = formProxy.value;
  if (!proxy || event.target !== proxy.form) return;
  // A TASK, not a microtask: a reset button dispatches from native code, so a microtask
  // would run before later listeners could cancel and before the platform resets.
  clearTimeout(formTimer);
  formTimer = setTimeout(() => {
    if (event.defaultPrevented) return;
    // The model hears only a real difference, and no DOM event is dispatched: this is
    // lifecycle synchronisation, not a user edit.
    if (value.value !== formAnswer) value.value = formAnswer;
    // The platform has rewritten the proxy; put back what the model holds now.
    formWrite();
  });
}
onMounted(() => {
  const proxy = formProxy.value;
  if (!proxy) return;
  formWrite();
  formDocument = proxy.ownerDocument;
  // A disabled <fieldset> fires no event. The shared document watcher calls back on a
  // fieldset `disabled` change or a move that can affect this control; the proxy, which
  // the platform disables with its fieldset, gives the answer.
  const syncDisabled = () => {
    formDisabled.value = proxy.matches(':disabled') && !proxy.disabled;
  };
  syncDisabled();
  formUnwatch = watchFormDisabled(proxy, syncDisabled);
  formDocument.addEventListener('reset', onFormReset, true);
});
onBeforeUnmount(() => {
  formUnwatch?.();
  formDocument?.removeEventListener('reset', onFormReset, true);
  clearTimeout(formTimer);
});
function onFormProxyFocus(event: FocusEvent) {
  const root = (event.currentTarget as HTMLElement).parentElement;
  (root?.querySelector<HTMLElement>('[tabindex="0"]') ?? root)?.focus();
}

const attrs = useAttrs();
// Everything a consumer passed that this component does not compose by hand. The
// composed ones are pulled out here and called FIRST inside each handler below, so a
// consumer can preventDefault() and win — the ordering emit/README.md §5 requires.
const fallthrough = computed(() => {
  const rest: Record<string, unknown> = { ...attrs };
  delete rest['onKeydown'];
  return rest;
});

function onRootKeydown(event: KeyboardEvent) {
  (attrs['onKeydown'] as ((e: KeyboardEvent) => void) | undefined)?.(event);
  nav.onKeyDown(event);
}
</script>

<template>
  <div
    v-bind="fallthrough"
    role="radiogroup"
    :id="baseId"
    :aria-disabled="effectiveDisabled || undefined"
    :aria-readonly="readOnly || undefined"
    data-ds-component="RadioGroup"
    data-ds-part="root"
    @keydown="onRootKeydown"
  >
    <slot />
    <input
      ref="formProxy"
      type="text"
      :name="name || undefined"
      :form="form || undefined"
      :required="required && !readOnly"
      :readonly="readOnly"
      :disabled="disabled"
      aria-hidden="true"
      tabindex="-1"
      autocomplete="off"
      :style="FORM_PROXY_STYLE"
      @focus="onFormProxyFocus"
    />
  </div>
</template>
