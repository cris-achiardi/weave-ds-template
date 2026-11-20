<!--
  GENERATED from Checkbox.contract.json + Checkbox.vue.json. Do not edit by hand.
  Regenerate: node packages/vue/src/emit/emit.mjs Checkbox --out <dir>

  Records a yes/no answer that is collected rather than acted on immediately, and can additionally report that a set of answers below it is partly yes.
-->

<script lang="ts">
/** What a consumer may pass. `v-model` bindings are declared separately below. */
export interface CheckboxProps {
  /** The platform's own disabled state. Removed from the focus order and cannot be answered. */
  disabled?: boolean;
  /** The answer failed validation — typically a required checkbox left unchecked. */
  invalid?: boolean;
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
import './Checkbox.structure.css';
import './Checkbox.theme.css';

// `inheritAttrs: false` so a consumer cannot overwrite the attributes that make this
// component what it is. See packages/vue/src/emit/README.md §4.
defineOptions({ name: 'Checkbox', inheritAttrs: false });

const props = withDefaults(defineProps<CheckboxProps>(), {
  value: 'on',
});

// Effective disabled: the consumer's prop, or a disabled <fieldset> around the control.
// Everything below reads this one; the prop itself is never written.
const formDisabled = ref(false);
const effectiveDisabled = computed(() => Boolean(props.disabled) || formDisabled.value);

/** The answer. Three values, not two: `mixed` reports that a set of checkboxes below this one is partly checked, and is set by the implementation rather than chosen by a user. Two-way: `v-model:checked`. */
const checked = defineModel<'unchecked' | 'checked' | 'mixed'>('checked', { default: 'unchecked' });

defineSlots<{
  /** The component content. */
  default?(): unknown;
  /** The question being answered. Fills the `label` part. */
  label(): unknown;
}>();

function activate(event?: { defaultPrevented: boolean }) {
  // Guards, because this runs on a CLICK and the platform guards there too: calling
  // preventDefault() in a click handler is what cancels a native checkbox's toggle.
  if (event?.defaultPrevented) return;
  if (effectiveDisabled.value) return;
  checked.value = checked.value === 'checked' ? 'unchecked' : 'checked';
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
  proxy.checked = checked.value === 'checked';
}
watch(checked, formWrite, { flush: 'post' });
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
    // Moves too: a control carried into or out of a disabled fieldset fires no
    // attribute change, only a childList one.
    childList: true,
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
// Custom validity has two writers, tracked by WRITER, not by message text: the consumer,
// through the element's own setCustomValidity() method, and authored `invalid`. The
// consumer's message wins, as in WC. Generated from packages/emit-web/validity.mjs, which also
// records the one unsupported path (calling the prototype method directly).
function ownValidity(element: HTMLInputElement) {
  const prior = Object.getOwnPropertyDescriptor(element, 'setCustomValidity');
  const write: (message: string) => void =
    typeof prior?.value === 'function'
      ? prior.value.bind(element)
      : HTMLInputElement.prototype.setCustomValidity.bind(element);
  // An error already present is the consumer's. While the element is barred from validation
  // its text reads '', so `null` records "present but unreadable": left exactly as it is.
  let consumer: string | null = element.validity.customError
    ? element.validationMessage || null
    : '';
  let invalid = false;
  const apply = () => {
    if (consumer !== null) write(consumer || (invalid ? 'Invalid value.' : ''));
  };
  const intercept = (message: string) => {
    consumer = String(message);
    apply();
  };
  element.setCustomValidity = intercept;
  return {
    setInvalid(next: boolean) {
      invalid = next;
      apply();
    },
    release() {
      // A newer override is the consumer's: leave it.
      if (element.setCustomValidity !== intercept) return;
      if (prior) Object.defineProperty(element, 'setCustomValidity', prior);
      else Reflect.deleteProperty(element, 'setCustomValidity');
    },
  };
}
let formValidity: ReturnType<typeof ownValidity> | undefined;
onMounted(() => {
  if (!formProxy.value) return;
  formValidity = ownValidity(formProxy.value);
  formValidity.setInvalid(Boolean(props.invalid));
});
onBeforeUnmount(() => formValidity?.release());
watch(
  () => props.invalid,
  (invalid) => formValidity?.setInvalid(Boolean(invalid)),
);

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
    role="checkbox"
    :aria-checked="
      checked === 'unchecked'
        ? 'false'
        : checked === 'checked'
          ? 'true'
          : checked === 'mixed'
            ? 'mixed'
            : undefined
    "
    :disabled="effectiveDisabled || undefined"
    :aria-invalid="invalid || undefined"
    data-ds-component="Checkbox"
    data-ds-part="root"
    @click="onRootClick"
  >
    <div data-ds-part="box">
      <div :hidden="!(checked === 'checked')" data-ds-part="tick" />
      <div :hidden="!(checked === 'mixed')" data-ds-part="dash" />
    </div>
    <div data-ds-part="label">
      <slot name="label" />
    </div>
    <slot />
    <input
      ref="formProxy"
      type="checkbox"
      :name="name || undefined"
      :form="form || undefined"
      :required="required"
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
