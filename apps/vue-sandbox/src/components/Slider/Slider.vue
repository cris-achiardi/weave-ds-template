<!--
  GENERATED from Slider.contract.json + Slider.vue.json. Do not edit by hand.
  Regenerate: node packages/vue/src/emit/emit.mjs Slider --out <dir>

  Chooses a number from a continuous range where the approximate value matters more than the exact one — a volume, a zoom level, a price ceiling.
-->

<script lang="ts">
/** What a consumer may pass. `v-model` bindings are declared separately below. */
export interface SliderProps {
  /** The platform's own disabled state. Removed from the focus order and cannot be moved. */
  disabled?: boolean;
  /** Name of the submitted answer. An empty name contributes nothing. */
  name?: string;
  /** Whether an answer is required for form validation. */
  required?: boolean;
  /** The id of the form that owns this answer, when it is not an ancestor form. */
  form?: string;
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useAttrs, watch } from 'vue';
import { snap, useRangeControl } from '@ds/vue/behavior';
import type { RangeOptions } from '@ds/vue/behavior';
import './Slider.structure.css';
import './Slider.theme.css';

// `inheritAttrs: false` so a consumer cannot overwrite the attributes that make this
// component what it is. See packages/vue/src/emit/README.md §4.
defineOptions({ name: 'Slider', inheritAttrs: false });

const props = defineProps<SliderProps>();

// Effective disabled: the consumer's prop, or a disabled <fieldset> around the control.
// Everything below reads this one; the prop itself is never written.
const formDisabled = ref(false);
const effectiveDisabled = computed(() => Boolean(props.disabled) || formDisabled.value);

/** The chosen number. Bounded and stepped — facts that live nowhere else, and that no boolean or enumeration can carry. Two-way: `v-model:value`. */
const value = defineModel<number>('value', { default: 0 });

// Transcribed from Slider.contract.json: the `range` block, plus min/max/step from
// the `value` state. The cases this commits us to are in
// @ds/contracts/conformance/range-stepping.json.
const RANGE: RangeOptions = {
  min: 0,
  max: 100,
  step: 1,
  orientation: 'horizontal',
  pageStep: 10,
};

const range = useRangeControl(
  RANGE,
  () => value.value,
  (next: number) => {
    value.value = next;
  },
  () => Boolean(effectiveDisabled.value),
);

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
  proxy.value = String(snap(value.value, RANGE));
}
watch(value, formWrite, { flush: 'post' });
let formDocument: Document | undefined;
let formObserver: MutationObserver | undefined;
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
  // A disabled <fieldset> fires no event. Watch `disabled` attributes and ask the proxy,
  // which the platform disables along with every other control inside it.
  const syncDisabled = () => {
    formDisabled.value = proxy.matches(':disabled') && !proxy.disabled;
  };
  syncDisabled();
  formObserver = new MutationObserver(syncDisabled);
  formObserver.observe(formDocument.documentElement, {
    attributes: true,
    attributeFilter: ['disabled'],
    subtree: true,
  });
  formDocument.addEventListener('reset', onFormReset, true);
});
onBeforeUnmount(() => {
  formObserver?.disconnect();
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
  delete rest['onPointercancel'];
  delete rest['onPointerdown'];
  delete rest['onPointermove'];
  delete rest['onPointerup'];
  delete rest['style'];
  return rest;
});

// The fill's length and the thumb's offset ARE the value, and a consumer's own inline
// style still has to land — hence the array form, which merges where a second
// `:style` would simply win.
const rootStyle = computed(() => [attrs.style as never, { '--ds-fraction': range.fraction }]);

function onRootKeydown(event: KeyboardEvent) {
  (attrs['onKeydown'] as ((e: KeyboardEvent) => void) | undefined)?.(event);
  range.onKeyDown(event);
}

function onRootPointerdown(event: PointerEvent) {
  (attrs['onPointerdown'] as ((e: PointerEvent) => void) | undefined)?.(event);
  range.onPointerDown(event);
}

function onRootPointermove(event: PointerEvent) {
  (attrs['onPointermove'] as ((e: PointerEvent) => void) | undefined)?.(event);
  range.onPointerMove(event);
}

function onRootPointerup(event: PointerEvent) {
  (attrs['onPointerup'] as ((e: PointerEvent) => void) | undefined)?.(event);
  range.onPointerUp(event);
}

function onRootPointercancel(event: PointerEvent) {
  (attrs['onPointercancel'] as ((e: PointerEvent) => void) | undefined)?.(event);
  range.onPointerUp(event);
}
</script>

<template>
  <div
    v-bind="fallthrough"
    role="slider"
    :aria-disabled="effectiveDisabled || undefined"
    :data-ds-state-dragging="range.dragging || undefined"
    :tabindex="effectiveDisabled ? -1 : 0"
    :aria-valuemin="0"
    :aria-valuemax="100"
    :aria-valuenow="snap(value, RANGE)"
    :style="rootStyle"
    data-ds-component="Slider"
    data-ds-part="root"
    @keydown="onRootKeydown"
    @pointerdown="onRootPointerdown"
    @pointermove="onRootPointermove"
    @pointerup="onRootPointerup"
    @pointercancel="onRootPointercancel"
  >
    <div :ref="range.setTrack" data-ds-part="track" />
    <div data-ds-part="fill" />
    <div data-ds-part="thumb" />
    <input
      ref="formProxy"
      type="range"
      :name="name || undefined"
      :form="form || undefined"
      :required="required"
      :disabled="disabled"
      min="0"
      max="100"
      step="1"
      aria-hidden="true"
      tabindex="-1"
      autocomplete="off"
      :style="FORM_PROXY_STYLE"
      @focus="onFormProxyFocus"
    />
  </div>
</template>
