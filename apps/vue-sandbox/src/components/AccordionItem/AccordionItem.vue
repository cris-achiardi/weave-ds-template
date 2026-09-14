<!--
  GENERATED from AccordionItem.contract.json + AccordionItem.vue.json. Do not edit by hand.
  Regenerate: node packages/vue/src/emit/emit.mjs AccordionItem --out <dir>

  One section of an accordion: a heading that reveals a panel when chosen. It carries its own identity and its own disabled state, and nothing else — whether it is open is a comparison against the surrounding Accordion, not a property it holds.
-->

<script lang="ts">
/** What a consumer may pass. `v-model` bindings are declared separately below. */
export interface AccordionItemProps {
  /** Set by the `disabled` prop or inherited from the Accordion. Rendered as a natively disabled button. */
  disabled?: boolean;
  /** Distinguishes this AccordionItem from its siblings. The ancestor Accordion compares against it to decide whether this one is in the selection. */
  value: string;
}
</script>

<script setup lang="ts">
import { computed, inject, useAttrs } from 'vue';
import { AccordionKey, type AccordionContextValue } from '../Accordion/Accordion.vue';
import './AccordionItem.structure.css';
import './AccordionItem.theme.css';

// `inheritAttrs: false` so a consumer cannot overwrite the attributes that make this
// component what it is. See packages/vue/src/emit/README.md §4.
defineOptions({ name: 'AccordionItem', inheritAttrs: false });

const props = defineProps<AccordionItemProps>();
defineSlots<{
  /** The component content. */
  default?(): unknown;
  /** The section's name, rendered inside the trigger. Fills the `trigger` part. */
  heading(): unknown;
  /** The revealed content. Anything. Fills the `panel` part. */
  panel(): unknown;
}>();

const ctx = inject<AccordionContextValue | null>(AccordionKey, null);
if (!ctx) {
  throw new Error(
    'AccordionItem must be rendered inside a Accordion. There is no selection to compare against, and looking unselected would hide the mistake.',
  );
}
const collection = ctx;

const selected = computed(() => collection.selection.value.includes(props.value));
const isDisabled = computed(() => Boolean(props.disabled) || collection.disabled.value);
const baseId = computed(() => `${collection.baseId}-AccordionItem-${props.value}`);

function activate(event?: { defaultPrevented: boolean }) {
  // Guards, because this runs on a CLICK and the platform guards there too: calling
  // preventDefault() in a click handler is what cancels a native checkbox's toggle.
  if (event?.defaultPrevented) return;
  if (isDisabled.value) return;
  collection.toggle(props.value);
}

const attrs = useAttrs();
const fallthrough = computed(() => ({ ...attrs }));
</script>

<template>
  <div
    v-bind="fallthrough"
    :id="baseId"
    :aria-disabled="disabled || undefined"
    :data-ds-state-open="selected || undefined"
    data-ds-component="AccordionItem"
    data-ds-part="root"
  >
    <div data-ds-part="header">
      <button
        :id="`${baseId}-trigger`"
        :aria-controls="`${baseId}-panel`"
        @click="activate"
        type="button"
        :disabled="isDisabled"
        :aria-expanded="selected"
        data-ds-part="trigger"
      >
        <slot name="heading" />
        <div data-ds-part="indicator" />
      </button>
    </div>
    <div
      role="region"
      :id="`${baseId}-panel`"
      :aria-labelledby="`${baseId}-trigger`"
      :hidden="!selected"
      data-ds-part="panel"
    >
      <slot name="panel" />
    </div>
    <slot />
  </div>
</template>
