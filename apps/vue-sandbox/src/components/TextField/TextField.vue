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
import { computed, useAttrs } from 'vue';
import './TextField.structure.css';
import './TextField.theme.css';

// `inheritAttrs: false` so a consumer cannot overwrite the attributes that make this
// component what it is. See packages/vue/src/emit/README.md §4.
defineOptions({ name: 'TextField', inheritAttrs: false });

withDefaults(defineProps<TextFieldProps>(), {
  size: 'm',
});

/** The text itself. Free-form: not a boolean, and not one of a fixed set — which is what makes this the first state in the library that `values` cannot describe. Two-way: `v-model:value`. */
const value = defineModel<string>('value', { default: '' });

function handleInput(event: Event) {
  value.value = (event.target as HTMLInputElement).value;
}

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
