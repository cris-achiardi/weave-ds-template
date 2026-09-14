<!--
  GENERATED from TabPanel.contract.json + TabPanel.vue.json. Do not edit by hand.
  Regenerate: node packages/vue/src/emit/emit.mjs TabPanel --out <dir>

  The content one tab reveals. It exists so the strip has something real to control: a tab announcing that it opens a panel, with no panel wired to it, describes an interaction that does not happen.
-->

<script lang="ts">
/** What a consumer may pass. `v-model` bindings are declared separately below. */
export interface TabPanelProps {
  /** Distinguishes this TabPanel from its siblings. The ancestor Tabs compares against it to decide whether this one is in the selection. */
  value: string;
}
</script>

<script setup lang="ts">
import { computed, inject, useAttrs } from 'vue';
import { TabsKey, type TabsContextValue } from '../Tabs/Tabs.vue';
import './TabPanel.structure.css';
import './TabPanel.theme.css';

// `inheritAttrs: false` so a consumer cannot overwrite the attributes that make this
// component what it is. See packages/vue/src/emit/README.md §4.
defineOptions({ name: 'TabPanel', inheritAttrs: false });

const props = defineProps<TabPanelProps>();
defineSlots<{
  /** Anything. The panel makes no assumptions about its content. */
  default?(): unknown;
}>();

const ctx = inject<TabsContextValue | null>(TabsKey, null);
if (!ctx) {
  throw new Error(
    'TabPanel must be rendered inside a Tabs. There is no selection to compare against, and looking unselected would hide the mistake.',
  );
}
const collection = ctx;

const selected = computed(() => collection.selection.value === props.value);
const isDisabled = computed(() => collection.disabled.value);
const baseId = computed(() => `${collection.baseId}-TabPanel-${props.value}`);

const attrs = useAttrs();
const fallthrough = computed(() => ({ ...attrs }));
</script>

<template>
  <div
    v-bind="fallthrough"
    role="tabpanel"
    :id="baseId"
    :data-ds-state-selected="selected || undefined"
    :tabindex="isDisabled ? -1 : 0"
    :hidden="!selected"
    :aria-labelledby="`${collection.baseId}-TabItem-${props.value}`"
    data-ds-component="TabPanel"
    data-ds-part="root"
  ></div>
</template>
