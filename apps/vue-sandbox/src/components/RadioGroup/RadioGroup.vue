<!--
  GENERATED from RadioGroup.contract.json + RadioGroup.vue.json. Do not edit by hand.
  Regenerate: node packages/vue/src/emit/emit.mjs RadioGroup --out <dir>

  Holds one choice from a small set of mutually exclusive options, all visible at once. It exists so the chosen option has exactly one home: the items compare against it rather than each holding a copy.
-->

<script lang="ts">
import type { ComputedRef, InjectionKey } from 'vue';
import type { MemberRegistration } from '@ds/vue/behavior';

/** What a consumer may pass. `v-model` bindings are declared separately below. */
export interface RadioGroupProps {
  /** The whole group ignores interaction. Cascades to every item. */
  disabled?: boolean;
  /** The selection cannot be changed, but the group stays readable and focusable. Distinct from disabled, which removes it from the focus order. */
  readOnly?: boolean;
}

/** Published to every member through provide/inject. */
export interface RadioGroupContextValue {
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
export const RadioGroupKey: InjectionKey<RadioGroupContextValue> = Symbol('RadioGroup');
</script>

<script setup lang="ts">
import { computed, provide, useAttrs, useId } from 'vue';
import { useLinearNavigation } from '@ds/vue/behavior';
import type { NavigationOptions } from '@ds/vue/behavior';
import './RadioGroup.structure.css';
import './RadioGroup.theme.css';

// `inheritAttrs: false` so a consumer cannot overwrite the attributes that make this
// component what it is. See packages/vue/src/emit/README.md §4.
defineOptions({ name: 'RadioGroup', inheritAttrs: false });

const props = defineProps<RadioGroupProps>();

/** The current selection, by member identity. Two-way: `v-model:value`. */
const value = defineModel<string>('value', { default: '' });

defineSlots<{
  /** The options, in order. A radio group with one option is a checkbox with extra steps. */
  default?(): unknown;
}>();

const baseId = useId();

// `memberValue`, not `value`: the selection model is a binding of that name.
function toggle(memberValue: string) {
  if (value.value === memberValue) return;
  value.value = memberValue;
}

// Transcribed field for field from RadioGroup.contract.json > collection.navigation.
// The cases this commits us to are in
// @ds/contracts/conformance/linear-navigation.json.
const NAVIGATION: NavigationOptions = {
  orientation: 'both',
  wrap: true,
  followsFocus: true,
  disabledItems: 'skip',
};

// `toggle` is the selection setter, and `followsFocus` is what decides whether the
// primitive calls it. With followsFocus false it is never called from here and
// arrowing only moves focus.
const nav = useLinearNavigation(NAVIGATION, () => value.value, toggle);

provide(RadioGroupKey, {
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
    role="radiogroup"
    :id="baseId"
    :aria-disabled="disabled || undefined"
    :aria-readonly="readOnly || undefined"
    data-ds-component="RadioGroup"
    data-ds-part="root"
    @keydown="onRootKeydown"
  >
    <slot />
  </div>
</template>
