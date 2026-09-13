<!--
  GENERATED from Tooltip.contract.json + Tooltip.vue.json. Do not edit by hand.
  Regenerate: node packages/vue/src/emit/emit.mjs Tooltip --out <dir>

  Shows a short label for a control whose own presentation cannot carry it — an icon button, a truncated name — on hover and on focus, without taking focus itself.
-->

<script lang="ts">
/** What a consumer may pass. `v-model` bindings are declared separately below. */
export interface TooltipProps {
  /** The tooltip never opens. The trigger still works. */
  disabled?: boolean;
  /** The PREFERRED side. A tooltip may be moved elsewhere when there is not room, so this is a request rather than a guarantee — a distinction the axis mechanism cannot express. Defaults to `top`. */
  placement?:
    'top' | 'top-start' | 'top-end' | 'bottom' | 'bottom-start' | 'bottom-end' | 'left' | 'right';
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useId } from 'vue';
import { useDismissal } from '@ds/vue/behavior';
import type { DismissalOptions } from '@ds/vue/behavior';
import './Tooltip.structure.css';
import './Tooltip.theme.css';

// `inheritAttrs: false` so a consumer cannot overwrite the attributes that make this
// component what it is. See packages/vue/src/emit/README.md §4.
defineOptions({ name: 'Tooltip', inheritAttrs: false });

withDefaults(defineProps<TooltipProps>(), {
  placement: 'top',
});

/** The tooltip is showing. A consumer may control it; hover and focus on the trigger also change it. Two-way: `v-model:open`. */
const open = defineModel<boolean>('open', { default: false });

defineSlots<{
  /** The component content. */
  default?(): unknown;
  /** The control the tooltip describes. Fills the `trigger` part. */
  trigger(): unknown;
  /** The label itself. Text only — anything interactive would be unreachable. Fills the `popup` part. */
  content(): unknown;
}>();

const baseId = useId();

// Transcribed from Tooltip.contract.json > dismisses. The cases this commits us to
// are in @ds/contracts/conformance/dismissal.json.
const DISMISSAL: DismissalOptions = {
  on: ['escape'],
};

const dismissOpen = () => {
  open.value = false;
};
const dismissal = useDismissal(DISMISSAL, () => open.value, dismissOpen);

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
  dismissal.onKeyDown(event);
}
</script>

<template>
  <div
    v-bind="fallthrough"
    :id="baseId"
    :data-ds-state-open="open || undefined"
    :aria-disabled="disabled || undefined"
    :data-ds-placement="placement"
    data-ds-component="Tooltip"
    data-ds-part="root"
    @keydown="onRootKeydown"
  >
    <div
      :id="`${baseId}-trigger`"
      :aria-describedby="[open ? `${baseId}-popup` : null].filter(Boolean).join(' ') || undefined"
      data-ds-part="trigger"
    >
      <slot name="trigger" />
    </div>
    <div role="tooltip" :id="`${baseId}-popup`" :hidden="!open" data-ds-part="popup">
      <slot name="content" />
    </div>
    <slot />
  </div>
</template>
