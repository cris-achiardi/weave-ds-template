<!--
  GENERATED from Slider.contract.json + Slider.vue.json. Do not edit by hand.
  Regenerate: node packages/vue/src/emit/emit.mjs Slider --out <dir>

  Chooses a number from a continuous range where the approximate value matters more than the exact one — a volume, a zoom level, a price ceiling.
-->

<script lang="ts">
/** What a consumer may pass. `v-model` bindings are declared separately below. */
export interface SliderProps {
  /** The platform's own disabled state. Removed from the focus order and cannot be moved. */
  disabled?: boolean;
}
</script>

<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import { snap, useRangeControl } from '@ds/vue/behavior';
import type { RangeOptions } from '@ds/vue/behavior';
import './Slider.structure.css';
import './Slider.theme.css';

// `inheritAttrs: false` so a consumer cannot overwrite the attributes that make this
// component what it is. See packages/vue/src/emit/README.md §4.
defineOptions({ name: 'Slider', inheritAttrs: false });

const props = defineProps<SliderProps>();

/** The chosen number. Bounded and stepped — facts that live nowhere else, and that no boolean or enumeration can carry. Two-way: `v-model:value`. */
const value = defineModel<number>('value', { default: 0 });

// Transcribed from Slider.contract.json: the `range` block, plus min/max/step from
// the `value` state. The cases this commits us to are in
// @ds/contracts/conformance/range-stepping.json.
const RANGE: RangeOptions = {
  min: 0,
  max: 100,
  step: 1,
  orientation: 'horizontal',
  pageStep: 10,
};

const range = useRangeControl(
  RANGE,
  () => value.value,
  (next: number) => {
    value.value = next;
  },
  () => Boolean(props.disabled),
);

const attrs = useAttrs();
// Everything a consumer passed that this component does not compose by hand. The
// composed ones are pulled out here and called FIRST inside each handler below, so a
// consumer can preventDefault() and win — the ordering emit/README.md §5 requires.
const fallthrough = computed(() => {
  const rest: Record<string, unknown> = { ...attrs };
  delete rest['onKeydown'];
  delete rest['onPointercancel'];
  delete rest['onPointerdown'];
  delete rest['onPointermove'];
  delete rest['onPointerup'];
  delete rest['style'];
  return rest;
});

// The fill's length and the thumb's offset ARE the value, and a consumer's own inline
// style still has to land — hence the array form, which merges where a second
// `:style` would simply win.
const rootStyle = computed(() => [attrs.style as never, { '--ds-fraction': range.fraction }]);

function onRootKeydown(event: KeyboardEvent) {
  (attrs['onKeydown'] as ((e: KeyboardEvent) => void) | undefined)?.(event);
  range.onKeyDown(event);
}

function onRootPointerdown(event: PointerEvent) {
  (attrs['onPointerdown'] as ((e: PointerEvent) => void) | undefined)?.(event);
  range.onPointerDown(event);
}

function onRootPointermove(event: PointerEvent) {
  (attrs['onPointermove'] as ((e: PointerEvent) => void) | undefined)?.(event);
  range.onPointerMove(event);
}

function onRootPointerup(event: PointerEvent) {
  (attrs['onPointerup'] as ((e: PointerEvent) => void) | undefined)?.(event);
  range.onPointerUp(event);
}

function onRootPointercancel(event: PointerEvent) {
  (attrs['onPointercancel'] as ((e: PointerEvent) => void) | undefined)?.(event);
  range.onPointerUp(event);
}
</script>

<template>
  <div
    v-bind="fallthrough"
    role="slider"
    :aria-disabled="disabled || undefined"
    :data-ds-state-dragging="range.dragging || undefined"
    :tabindex="disabled ? -1 : 0"
    :aria-valuemin="0"
    :aria-valuemax="100"
    :aria-valuenow="snap(value, RANGE)"
    :style="rootStyle"
    data-ds-component="Slider"
    data-ds-part="root"
    @keydown="onRootKeydown"
    @pointerdown="onRootPointerdown"
    @pointermove="onRootPointermove"
    @pointerup="onRootPointerup"
    @pointercancel="onRootPointercancel"
  >
    <div :ref="range.setTrack" data-ds-part="track" />
    <div data-ds-part="fill" />
    <div data-ds-part="thumb" />
  </div>
</template>
