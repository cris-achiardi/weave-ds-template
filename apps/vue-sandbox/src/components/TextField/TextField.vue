<!--
  GENERATED from TextField.contract.json + TextField.vue.json. Do not edit by hand.
  Regenerate: node packages/vue/src/emit/emit.mjs TextField --out <dir>

  Collects a single line of text from a person. It is the control itself, where Field is the plumbing around a control — the two compose, and neither does the other's job.
-->

<script lang="ts">
/** What a consumer may pass. `v-model` bindings are declared separately below. */
export interface TextFieldProps {
  /** The platform's own disabled state. Removed from the focus order and cannot be typed into. */
  disabled?: boolean;
  /** The text can be read and selected but not changed. Distinct from disabled, which removes it from the focus order. */
  readOnly?: boolean;
  /** Set from outside — usually by a surrounding Field. This component does not decide it. */
  invalid?: boolean;
  /** A contiguous subset of the canon's ladder. Defaults to `m`. */
  size?: 's' | 'm' | 'l';
}
</script>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useAttrs, watch } from 'vue';
import './TextField.structure.css';
import './TextField.theme.css';

// `inheritAttrs: false` so a consumer cannot overwrite the attributes that make this
// component what it is. See packages/vue/src/emit/README.md §4.
defineOptions({ name: 'TextField', inheritAttrs: false });

const props = withDefaults(defineProps<TextFieldProps>(), {
  size: 'm',
});

/** The text itself. Free-form: not a boolean, and not one of a fixed set — which is what makes this the first state in the library that `values` cannot describe. Two-way: `v-model:value`. */
const value = defineModel<string>('value', { default: '' });

function handleInput(event: Event) {
  const next = (event.target as HTMLInputElement).value;
  value.value = next;
}

// ---- form lifecycle (contract.form). See packages/wc/forms.md.
const formControl = ref<HTMLInputElement | null>(null);
// The answer a reset restores: captured once, at setup, never re-captured from props.
const formAnswer = value.value;
let formDocument: Document | undefined;
let formTimer: ReturnType<typeof setTimeout> | undefined;
// Matched against the CURRENT owner when it fires, so a `form` attribute, an owner
// change or a move needs no re-subscription.
function onFormReset(event: Event) {
  const control = formControl.value;
  if (!control || event.target !== control.form) return;
  // A TASK, not a microtask: a reset button dispatches from native code, so a microtask
  // would run before later listeners could cancel and before the platform resets.
  clearTimeout(formTimer);
  formTimer = setTimeout(() => {
    if (event.defaultPrevented) return;
    // The model hears only a real difference, and no DOM event is dispatched: this is
    // lifecycle synchronisation, not a user edit.
    if (value.value !== formAnswer) value.value = formAnswer;
    // The platform has already rewritten the element; make it show what the model holds,
    // including when nothing changed and so nothing re-renders.
    void nextTick(() => {
      control.value = value.value;
    });
  });
}
onMounted(() => {
  formDocument = formControl.value?.ownerDocument;
  formDocument?.addEventListener('reset', onFormReset, true);
});
onBeforeUnmount(() => {
  formDocument?.removeEventListener('reset', onFormReset, true);
  clearTimeout(formTimer);
});
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
  if (!formControl.value) return;
  formValidity = ownValidity(formControl.value);
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
  delete rest['onInput'];
  return rest;
});

function onRootInput(event: Event) {
  (attrs['onInput'] as ((e: Event) => void) | undefined)?.(event);
  handleInput(event);
}
</script>

<template>
  <input
    v-bind="fallthrough"
    ref="formControl"
    :disabled="disabled || undefined"
    :aria-readonly="readOnly || undefined"
    :aria-invalid="invalid || undefined"
    :data-ds-size="size"
    :value="value"
    :readonly="readOnly"
    data-ds-component="TextField"
    data-ds-part="root"
    @input="onRootInput"
  />
</template>
