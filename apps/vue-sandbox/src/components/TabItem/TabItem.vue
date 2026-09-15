<!--
  GENERATED from TabItem.contract.json + TabItem.vue.json. Do not edit by hand.
  Regenerate: node packages/vue/src/emit/emit.mjs TabItem --out <dir>

  One tab: a label that reveals its panel when chosen. It carries its own identity and its own disabled state, and nothing else.
-->

<script lang="ts">
/** What a consumer may pass. `v-model` bindings are declared separately below. */
export interface TabItemProps {
  /** Set by the prop or inherited from the strip. Skipped by arrow-key movement. */
  disabled?: boolean;
  /** Distinguishes this TabItem from its siblings. The ancestor Tabs compares against it to decide whether this one is in the selection. */
  value: string;
}
</script>

<script setup lang="ts">
import { computed, inject, onBeforeUnmount, ref, useAttrs, watch } from 'vue';
import { TabsKey, type TabsContextValue } from '../Tabs/Tabs.vue';
import './TabItem.structure.css';
import './TabItem.theme.css';

// `inheritAttrs: false` so a consumer cannot overwrite the attributes that make this
// component what it is. See packages/vue/src/emit/README.md §4.
defineOptions({ name: 'TabItem', inheritAttrs: false });

const props = defineProps<TabItemProps>();
defineSlots<{
  /** The component content. */
  default?(): unknown;
  /** The tab's name. Fills the label part. */
  label(): unknown;
}>();

const ctx = inject<TabsContextValue | null>(TabsKey, null);
if (!ctx) {
  throw new Error(
    'TabItem must be rendered inside a Tabs. There is no selection to compare against, and looking unselected would hide the mistake.',
  );
}
const collection = ctx;

const selected = computed(() => collection.selection.value === props.value);
const isDisabled = computed(() => Boolean(props.disabled) || collection.disabled.value);
const baseId = computed(() => `${collection.baseId}-TabItem-${props.value}`);

// The collection moves focus between its members, so each one announces its element.
// Vue's template ref plus a watcher replaces React's composed callback ref — and
// needs no composition, because a consumer's own ref reaches this component through
// `$el` rather than through anything the emitter has to thread.
const rootEl = ref<HTMLElement | null>(null);
let registeredValue: string | null = null;
// Explicit sources keep registry notifications out of this watcher's dependencies.
watch([rootEl, () => props.value, isDisabled], ([node, value, disabled]) => {
  if (registeredValue !== null && (!node || registeredValue !== value)) {
    collection.unregister(registeredValue);
    registeredValue = null;
  }
  if (node) {
    registeredValue = value;
    collection.register(value, { element: node, disabled });
  }
});
onBeforeUnmount(() => {
  if (registeredValue !== null) collection.unregister(registeredValue);
});

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
  <button
    v-bind="fallthrough"
    ref="rootEl"
    type="button"
    role="tab"
    :id="baseId"
    :aria-disabled="disabled || undefined"
    :aria-selected="selected"
    :tabindex="collection.isTabStop(value) ? 0 : -1"
    :aria-controls="`${collection.baseId}-TabPanel-${props.value}`"
    data-ds-component="TabItem"
    data-ds-part="root"
    @click="onRootClick"
  >
    <div data-ds-part="label">
      <slot name="label" />
    </div>
    <div :hidden="!selected" data-ds-part="indicator" />
    <slot />
  </button>
</template>
