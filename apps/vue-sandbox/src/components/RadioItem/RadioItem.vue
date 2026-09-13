<!--
  GENERATED from RadioItem.contract.json + RadioItem.vue.json. Do not edit by hand.
  Regenerate: node packages/vue/src/emit/emit.mjs RadioItem --out <dir>

  One option in a radio group: a label that becomes the group's answer when chosen. It carries its own identity and its own disabled state, and nothing else — whether it is chosen is a comparison, not a property it holds.
-->

<script lang="ts">
/** What a consumer may pass. `v-model` bindings are declared separately below. */
export interface RadioItemProps {
  /** Set by the `disabled` prop or inherited from the group. Skipped by arrow-key movement. */
  disabled?: boolean;
  /** Distinguishes this RadioItem from its siblings. The ancestor RadioGroup compares against it to decide whether this one is in the selection. */
  value: string;
}
</script>

<script setup lang="ts">
import { computed, inject, onBeforeUnmount, ref, useAttrs, watchEffect } from 'vue';
import { RadioGroupKey, type RadioGroupContextValue } from '../RadioGroup/RadioGroup.vue';
import './RadioItem.structure.css';
import './RadioItem.theme.css';

// `inheritAttrs: false` so a consumer cannot overwrite the attributes that make this
// component what it is. See packages/vue/src/emit/README.md §4.
defineOptions({ name: 'RadioItem', inheritAttrs: false });

const props = defineProps<RadioItemProps>();
defineSlots<{
  /** The component content. */
  default?(): unknown;
  /** The option's name. Fills the `label` part. */
  label(): unknown;
}>();

const ctx = inject<RadioGroupContextValue | null>(RadioGroupKey, null);
if (!ctx) {
  throw new Error(
    'RadioItem must be rendered inside a RadioGroup. There is no selection to compare against, and looking unselected would hide the mistake.',
  );
}
const collection = ctx;

const selected = computed(() => collection.selection.value === props.value);
const isDisabled = computed(() => Boolean(props.disabled) || collection.disabled.value);

// The collection moves focus between its members, so each one announces its element.
// Vue's template ref plus a watcher replaces React's composed callback ref — and
// needs no composition, because a consumer's own ref reaches this component through
// `$el` rather than through anything the emitter has to thread.
const rootEl = ref<HTMLElement | null>(null);
watchEffect(() => {
  const node = rootEl.value;
  if (!node) return;
  collection.register(props.value, { element: node, disabled: isDisabled.value });
});
onBeforeUnmount(() => collection.unregister(props.value));

function activate(event?: { defaultPrevented: boolean }) {
  // Guards, because this runs on a CLICK and the platform guards there too: calling
  // preventDefault() in a click handler is what cancels a native checkbox's toggle.
  if (event?.defaultPrevented) return;
  if (isDisabled.value) return;
  collection.toggle(props.value);
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
  <div
    v-bind="fallthrough"
    ref="rootEl"
    role="radio"
    :aria-disabled="disabled || undefined"
    :aria-checked="selected"
    :tabindex="collection.isTabStop(value) ? 0 : -1"
    data-ds-component="RadioItem"
    data-ds-part="root"
    @click="onRootClick"
  >
    <div data-ds-part="control">
      <div :hidden="!selected" data-ds-part="mark" />
    </div>
    <div data-ds-part="label">
      <slot name="label" />
    </div>
    <slot />
  </div>
</template>
