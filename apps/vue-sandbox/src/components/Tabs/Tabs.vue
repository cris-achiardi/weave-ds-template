<!--
  GENERATED from Tabs.contract.json + Tabs.vue.json. Do not edit by hand.
  Regenerate: node packages/vue/src/emit/emit.mjs Tabs --out <dir>

  Holds which one of several sections is showing, in a fixed area, so a person can move between them without losing their place on the page.
-->

<script lang="ts">
import type { ComputedRef, InjectionKey } from 'vue';
import type { MemberRegistration } from '@ds/vue/behavior';

/** What a consumer may pass. `v-model` bindings are declared separately below. */
export interface TabsProps {
  /** The whole strip ignores interaction. Cascades to every tab. */
  disabled?: boolean;
}

/** Published to every member through provide/inject. */
export interface TabsContextValue {
  /** The current selection, by member value. */
  selection: ComputedRef<string>;
  /** Called by a member when it is activated. */
  toggle: (value: string) => void;
  /** Shared id root, so a member's parts can reference one another. */
  baseId: string;
  /** True when the whole collection is disabled. */
  disabled: ComputedRef<boolean>;
  /** A member announces its DOM node, so the collection can move focus. */
  register: (value: string, entry: MemberRegistration) => void;
  unregister: (value: string) => void;
  /** True for the one member that sits in the page's tab sequence. */
  isTabStop: (value: string) => boolean;
}

/**
 * The injection key. Exported from THIS block and not from `<script setup>`,
 * because a setup block compiles to a render function and cannot export a binding.
 */
export const TabsKey: InjectionKey<TabsContextValue> = Symbol('Tabs');
</script>

<script setup lang="ts">
import { computed, provide, useAttrs, useId } from 'vue';
import { useLinearNavigation } from '@ds/vue/behavior';
import type { NavigationOptions } from '@ds/vue/behavior';
import './Tabs.structure.css';
import './Tabs.theme.css';

// `inheritAttrs: false` so a consumer cannot overwrite the attributes that make this
// component what it is. See packages/vue/src/emit/README.md §4.
defineOptions({ name: 'Tabs', inheritAttrs: false });

const props = defineProps<TabsProps>();

/** The current selection, by member identity. Two-way: `v-model:value`. */
const value = defineModel<string>('value', { default: '' });

defineSlots<{
  /** The tabs and the panels. TabItems become the strip; TabPanels are rendered after it. */
  default?(): unknown;
}>();

const baseId = useId();

// `memberValue`, not `value`: the selection model is a binding of that name.
function toggle(memberValue: string) {
  if (value.value === memberValue) return;
  value.value = memberValue;
}

// Transcribed field for field from Tabs.contract.json > collection.navigation.
// The cases this commits us to are in
// @ds/contracts/conformance/linear-navigation.json.
const NAVIGATION: NavigationOptions = {
  orientation: 'horizontal',
  wrap: true,
  followsFocus: true,
  disabledItems: 'focusable',
  homeEnd: true,
};

// `toggle` is the selection setter, and `followsFocus` is what decides whether the
// primitive calls it. With followsFocus false it is never called from here and
// arrowing only moves focus.
const nav = useLinearNavigation(NAVIGATION, () => value.value, toggle);

provide(TabsKey, {
  selection: computed(() => value.value),
  toggle,
  baseId,
  disabled: computed(() => Boolean(props.disabled)),
  register: nav.register,
  unregister: nav.unregister,
  isTabStop: nav.isTabStop,
});

const attrs = useAttrs();
// Everything a consumer passed that this component does not compose by hand. The
// composed ones are pulled out here and called FIRST inside each handler below, so a
// consumer can preventDefault() and win — the ordering emit/README.md §5 requires.
const fallthrough = computed(() => {
  const rest: Record<string, unknown> = { ...attrs };
  delete rest['onKeydown'];
  return rest;
});

function onRootKeydown(event: KeyboardEvent) {
  (attrs['onKeydown'] as ((e: KeyboardEvent) => void) | undefined)?.(event);
  nav.onKeyDown(event);
}
</script>

<template>
  <div
    v-bind="fallthrough"
    :id="baseId"
    :aria-disabled="disabled || undefined"
    data-ds-component="Tabs"
    data-ds-part="root"
    @keydown="onRootKeydown"
  >
    <div role="tablist" :id="`${baseId}-list`" data-ds-part="list" />
    <slot />
  </div>
</template>
