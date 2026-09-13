<!--
  GENERATED from Field.contract.json + Field.vue.json. Do not edit by hand.
  Regenerate: node packages/vue/src/emit/emit.mjs Field --out <dir>

  Wires a form control to its label, its help text and its error message, so the three are announced together and the control's validity has one place to live. It is the plumbing around an input, never the input.
-->

<script lang="ts">
/** What a consumer may pass. `v-model` bindings are declared separately below. */
export interface FieldProps {
  /** The control ignores interaction. Set on the field so the label and description can dim with it. */
  disabled?: boolean;
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useId } from 'vue';
import './Field.structure.css';
import './Field.theme.css';

// `inheritAttrs: false` so a consumer cannot overwrite the attributes that make this
// component what it is. See packages/vue/src/emit/README.md §4.
defineOptions({ name: 'Field', inheritAttrs: false });

defineProps<FieldProps>();

/** Validation has run and failed. Reaches assistive technology as aria-invalid and shows the error. Two-way: `v-model:invalid`. */
const invalid = defineModel<boolean>('invalid', { default: false });

/** The control has been focused and then blurred at least once. Gates WHEN an error is allowed to show. Two-way: `v-model:touched`. */
const touched = defineModel<boolean>('touched', { default: false });

/** The value differs from the value the field started with. Gates validation timing and enables a reset affordance. Two-way: `v-model:dirty`. */
const dirty = defineModel<boolean>('dirty', { default: false });

defineSlots<{
  /** The label, the control, the description and the error, in whatever order the design calls for. Field wires them by relationship, not by position. */
  default?(): unknown;
  /** Names the control. Required — a field with no label is the defect this component exists to prevent. */
  label(): unknown;
  /** The control being wired up. Passed in rather than rendered. */
  control(): unknown;
  /** Help text, announced with the control. */
  description?(): unknown;
  /** Why validation failed. Shown only when the field is invalid AND has been touched. */
  error?(): unknown;
}>();

const baseId = useId();

const attrs = useAttrs();
const fallthrough = computed(() => ({ ...attrs }));
</script>

<template>
  <div
    v-bind="fallthrough"
    :id="baseId"
    :aria-disabled="disabled || undefined"
    :data-ds-state-invalid="invalid || undefined"
    :data-ds-state-touched="touched || undefined"
    :data-ds-state-dirty="dirty || undefined"
    data-ds-component="Field"
    data-ds-part="root"
  >
    <div :id="`${baseId}-label`" data-ds-part="label">
      <slot name="label" />
    </div>
    <div
      :id="`${baseId}-control`"
      :aria-labelledby="`${baseId}-label`"
      :aria-describedby="
        [`${baseId}-description`, invalid ? `${baseId}-error` : null].filter(Boolean).join(' ') ||
        undefined
      "
      data-ds-part="control"
    >
      <slot name="control" />
    </div>
    <div :id="`${baseId}-description`" data-ds-part="description">
      <slot name="description" />
    </div>
    <div :id="`${baseId}-error`" :hidden="!invalid" data-ds-part="error">
      <slot name="error" />
    </div>
    <slot />
  </div>
</template>
