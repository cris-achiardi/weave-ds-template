<!--
  GENERATED from Button.contract.json + Button.vue.json. Do not edit by hand.
  Regenerate: node packages/vue/src/emit/emit.mjs Button --out <dir>

  Runs an action when chosen. It is the only component here that does something rather than holding something — nothing about a button's own state survives the click.
-->

<script lang="ts">
/** What a consumer may pass. `v-model` bindings are declared separately below. */
export interface ButtonProps {
  /** The platform's own disabled state. Removed from the focus order and cannot be activated. */
  disabled?: boolean;
  /** The action is already running. The implementation must track this: no platform provides it. */
  loading?: boolean;
  /** How much emphasis this action carries relative to the others around it. The rank of the action, not its colour — a page should hold one primary action, and everything else ranks below it. Defaults to `secondary` rather than the canon's `primary`, because the common case is not the page's most important action and a default of `primary` makes every unconsidered button shout. Defaults to `secondary`. */
  hierarchy?: 'primary' | 'secondary' | 'tertiary';
  /** What kind of action this is, which selects the colour role. Orthogonal to `hierarchy`: a secondary destructive action is `hierarchy: secondary` and `variant: danger`, and collapsing the two axes would make that unsayable. `success` and `warning` are in the canon and deliberately not taken — an action is not a status. Defaults to `neutral`. */
  variant?: 'neutral' | 'brand' | 'danger';
  /** A contiguous subset of the canon's ladder. `xs` and `xl` are not designed for actions. Defaults to `m`. */
  size?: 's' | 'm' | 'l';
}
</script>

<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import './Button.structure.css';
import './Button.theme.css';

// `inheritAttrs: false` so a consumer cannot overwrite the attributes that make this
// component what it is. See packages/vue/src/emit/README.md §4.
defineOptions({ name: 'Button', inheritAttrs: false });

withDefaults(defineProps<ButtonProps>(), {
  hierarchy: 'secondary',
  variant: 'neutral',
  size: 'm',
});
defineSlots<{
  /** The label. Text, and a verb — a button named 'Settings' describes where you land, not what happens. */
  default?(): unknown;
  /** An icon before the label. Decorative: the label carries the meaning. */
  iconStart?(): unknown;
  /** An icon after the label, for an action that leads somewhere — a disclosure caret, an external-link mark. */
  iconEnd?(): unknown;
}>();

const attrs = useAttrs();
const fallthrough = computed(() => ({ ...attrs }));
</script>

<template>
  <button
    v-bind="fallthrough"
    type="button"
    :disabled="disabled || undefined"
    :data-ds-state-loading="loading || undefined"
    :data-ds-hierarchy="hierarchy"
    :data-ds-variant="variant"
    :data-ds-size="size"
    data-ds-component="Button"
    data-ds-part="root"
  >
    <div data-ds-part="icon-start">
      <slot name="iconStart" />
    </div>
    <div data-ds-part="label">
      <slot />
    </div>
    <div data-ds-part="icon-end">
      <slot name="iconEnd" />
    </div>
  </button>
</template>
