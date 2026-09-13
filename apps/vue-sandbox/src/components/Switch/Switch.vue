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
}
</script>

<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import './Switch.structure.css';
import './Switch.theme.css';

// `inheritAttrs: false` so a consumer cannot overwrite the attributes that make this
// component what it is. See packages/vue/src/emit/README.md §4.
defineOptions({ name: 'Switch', inheritAttrs: false });

const props = defineProps<SwitchProps>();

/** The switch is on. Tracked by the implementation and reflected to assistive technology. Two-way: `v-model:checked`. */
const checked = defineModel<boolean>('checked', { default: false });

function activate(event?: { defaultPrevented: boolean }) {
  // Guards, because this runs on a CLICK and the platform guards there too: calling
  // preventDefault() in a click handler is what cancels a native checkbox's toggle.
  if (event?.defaultPrevented) return;
  if (props.disabled || props.readOnly) return;
  checked.value = !checked.value;
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
    :disabled="disabled || undefined"
    :aria-readonly="readOnly || undefined"
    data-ds-component="Switch"
    data-ds-part="root"
    @click="onRootClick"
  >
    <div data-ds-part="thumb" />
  </button>
</template>
