<!--
  GENERATED from Switch.contract.json + Switch.vue.json. Do not edit by hand.
  Regenerate: node packages/vue/src/emit/emit.mjs Switch --out <dir>

  A binary on/off control that takes effect immediately, for a setting whose two states both make sense on their own — not a value collected and submitted later.
-->

<script lang="ts">
/** What a consumer may pass. `v-model` bindings are declared separately below. */
export interface SwitchProps {
  /** The platform's own disabled state. Removed from the focus order and cannot be toggled. */
  disabled?: boolean;
  /** Cannot be toggled, but remains focusable and readable. Distinct from disabled, which removes it from the focus order entirely. */
  readOnly?: boolean;
  /** Name of the submitted answer. An empty name contributes nothing. */
  name?: string;
  /** Whether an answer is required for form validation. */
  required?: boolean;
  /** The id of the form that owns this answer, when it is not an ancestor form. */
  form?: string;
  /** Value submitted when checked. */
  value?: string;
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useAttrs, watch } from 'vue';
import './Switch.structure.css';
import './Switch.theme.css';

// `inheritAttrs: false` so a consumer cannot overwrite the attributes that make this
// component what it is. See packages/vue/src/emit/README.md §4.
defineOptions({ name: 'Switch', inheritAttrs: false });

const props = withDefaults(defineProps<SwitchProps>(), {
  value: 'on',
});

// Effective disabled: the consumer's prop, or a disabled <fieldset> around the control.
// Everything below reads this one; the prop itself is never written.
const formDisabled = ref(false);
const effectiveDisabled = computed(() => Boolean(props.disabled) || formDisabled.value);

/** The switch is on. Tracked by the implementation and reflected to assistive technology. Two-way: `v-model:checked`. */
const checked = defineModel<boolean>('checked', { default: false });

function activate(event?: { defaultPrevented: boolean }) {
  // Guards, because this runs on a CLICK and the platform guards there too: calling
  // preventDefault() in a click handler is what cancels a native checkbox's toggle.
  if (event?.defaultPrevented) return;
  if (effectiveDisabled.value || props.readOnly) return;
  checked.value = !checked.value;
}

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
    // ONE pass over the records, each tested cheaply before any subscriber is: a `disabled`
    // change matters only on a fieldset, and an insertion only if it holds an <input>, since
    // every proxy is one. Unrelated mutations cost a type check or a tag lookup, not a walk.
    const observer = new MutationObserver((records) => {
      const due = new Set<Watcher>();
      const collect = (root: Node) => {
        for (const watcher of watchers) if (root.contains(watcher.proxy)) due.add(watcher);
      };
      for (const record of records) {
        if (record.type === 'attributes') {
          if (record.target.nodeName === 'FIELDSET') collect(record.target);
          continue;
        }
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
const formAnswer = checked.value;
// Driven imperatively: a native reset rewrites the proxy behind the renderer's back.
function formWrite() {
  const proxy = formProxy.value;
  if (!proxy) return;
  proxy.checked = checked.value === true;
}
watch(checked, formWrite, { flush: 'post' });
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
    if (checked.value !== formAnswer) checked.value = formAnswer;
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
  delete rest['onClick'];
  return rest;
});

function onRootClick(event: MouseEvent) {
  (attrs['onClick'] as ((e: MouseEvent) => void) | undefined)?.(event);
  activate(event);
}
</script>

<template>
  <button
    v-bind="fallthrough"
    type="button"
    role="switch"
    :aria-checked="checked"
    :disabled="effectiveDisabled || undefined"
    :aria-readonly="readOnly || undefined"
    data-ds-component="Switch"
    data-ds-part="root"
    @click="onRootClick"
  >
    <div data-ds-part="thumb" />
    <input
      ref="formProxy"
      :type="readOnly ? 'text' : 'checkbox'"
      :name="readOnly && !(checked === true) ? undefined : name || undefined"
      :form="form || undefined"
      :required="required && !readOnly"
      :readonly="readOnly"
      :disabled="disabled"
      :value="value"
      aria-hidden="true"
      tabindex="-1"
      autocomplete="off"
      :style="FORM_PROXY_STYLE"
      @focus="onFormProxyFocus"
    />
  </button>
</template>
