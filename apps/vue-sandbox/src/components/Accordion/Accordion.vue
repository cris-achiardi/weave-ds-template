<!--
  GENERATED from Accordion.contract.json + Accordion.vue.json. Do not edit by hand.
  Regenerate: node packages/vue/src/emit/emit.mjs Accordion --out <dir>

  Holds which of a set of sections are expanded, and lets a reader open one without losing the list of the others. It exists so that the open set has exactly one home rather than each section holding its own copy.
-->

<script lang="ts">
import type { ComputedRef, InjectionKey } from 'vue';

/** What a consumer may pass. `v-model` bindings are declared separately below. */
export interface AccordionProps {
  /** The whole accordion ignores interaction. Cascades to every item. */
  disabled?: boolean;
  /** Only vertical is designed. Recorded as an axis with one value rather than omitted, because the horizontal case exists in the canon and this component deliberately does not take it. Defaults to `vertical`. */
  orientation?: 'vertical';
}

/** Published to every member through provide/inject. */
export interface AccordionContextValue {
  /** The current selection, by member value. */
  selection: ComputedRef<string[]>;
  /** Called by a member when it is activated. */
  toggle: (value: string) => void;
  /** Shared id root, so a member's parts can reference one another. */
  baseId: string;
  /** True when the whole collection is disabled. */
  disabled: ComputedRef<boolean>;
}

/**
 * The injection key. Exported from THIS block and not from `<script setup>`,
 * because a setup block compiles to a render function and cannot export a binding.
 */
export const AccordionKey: InjectionKey<AccordionContextValue> = Symbol('Accordion');
</script>

<script setup lang="ts">
import { computed, provide, useAttrs, useId } from 'vue';
import './Accordion.structure.css';
import './Accordion.theme.css';

// `inheritAttrs: false` so a consumer cannot overwrite the attributes that make this
// component what it is. See packages/vue/src/emit/README.md §4.
defineOptions({ name: 'Accordion', inheritAttrs: false });

const props = withDefaults(defineProps<AccordionProps>(), {
  orientation: 'vertical',
});

/** The current selection, by member identity. Two-way: `v-model:value`. */
const value = defineModel<string[]>('value', { default: () => [] });

defineSlots<{
  /** The sections, in order. Anything else is passed through untouched but takes no part in the open set. */
  default?(): unknown;
}>();

const baseId = useId();

// `memberValue`, not `value`: the selection model is a binding of that name.
function toggle(memberValue: string) {
  value.value = value.value.includes(memberValue)
    ? value.value.filter((v) => v !== memberValue)
    : [...value.value, memberValue];
}

provide(AccordionKey, {
  selection: computed(() => value.value),
  toggle,
  baseId,
  disabled: computed(() => Boolean(props.disabled)),
});

const attrs = useAttrs();
const fallthrough = computed(() => ({ ...attrs }));
</script>

<template>
  <div
    v-bind="fallthrough"
    :id="baseId"
    :aria-disabled="disabled || undefined"
    :data-ds-orientation="orientation"
    data-ds-component="Accordion"
    data-ds-part="root"
  >
    <slot />
  </div>
</template>
