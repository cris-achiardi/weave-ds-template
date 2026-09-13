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
}
</script>

<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import './Checkbox.structure.css';
import './Checkbox.theme.css';

// `inheritAttrs: false` so a consumer cannot overwrite the attributes that make this
// component what it is. See packages/vue/src/emit/README.md §4.
defineOptions({ name: 'Checkbox', inheritAttrs: false });

const props = defineProps<CheckboxProps>();

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
  if (props.disabled) return;
  checked.value = checked.value === 'checked' ? 'unchecked' : 'checked';
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
    :disabled="disabled || undefined"
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
  </button>
</template>
