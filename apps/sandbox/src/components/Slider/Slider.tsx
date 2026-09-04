// GENERATED from Slider.contract.json + Slider.react.json. Do not edit by hand.
// Regenerate: node packages/react/src/emit/emit.mjs Slider --out <dir>
//
// Chooses a number from a continuous range where the approximate value matters more than the exact one — a volume, a zoom level, a price ceiling.

import { forwardRef, useState, useCallback } from 'react';
import type { HTMLAttributes } from 'react';
import { snap, useRangeControl, type RangeOptions } from '@ds/react/behavior';
import './Slider.structure.css';
import './Slider.theme.css';

// Transcribed from Slider.contract.json: the `range` block, plus min/max/step from the
// `value` state. The cases this commits us to are in
// @ds/contracts/conformance/range-stepping.json.
const RANGE: RangeOptions = {
  min: 0,
  max: 100,
  step: 1,
  orientation: 'horizontal',
  pageStep: 10,
};

export interface SliderProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'value' | 'defaultValue' | 'onValueChange' | 'disabled'
> {
  /** The chosen number. Bounded and stepped — facts that live nowhere else, and that no boolean or enumeration can carry. Controlled. */
  value?: number;
  /** Initial value when uncontrolled. */
  defaultValue?: number;
  /** Called when it changes, controlled or not. */
  onValueChange?: (value: number) => void;
  /** The platform's own disabled state. Removed from the focus order and cannot be moved. */
  disabled?: boolean;
}

export const Slider = forwardRef<HTMLDivElement, SliderProps>(function Slider(
  { value, defaultValue = 0, onValueChange, disabled, className, ...rest },
  ref,
) {
  const valueControlled = value !== undefined;
  const [valueInternal, setValueInternal] = useState(defaultValue);
  const valueValue = valueControlled ? value : valueInternal;

  const setValue = useCallback(
    (next: number) => {
      if (!valueControlled) setValueInternal(next);
      onValueChange?.(next);
    },
    [valueControlled, onValueChange],
  );
  const range = useRangeControl(RANGE, valueValue, setValue, disabled);

  return (
    <div
      {...rest}
      ref={ref}
      role="slider"
      aria-disabled={disabled || undefined}
      data-ds-state-dragging={range.dragging || undefined}
      tabIndex={disabled ? -1 : 0}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={snap(valueValue, RANGE)}
      style={{ ...rest.style, ['--ds-fraction' as string]: range.fraction }}
      onKeyDown={(event) => {
        rest.onKeyDown?.(event);
        range.onKeyDown(event);
      }}
      onPointerDown={(event) => {
        rest.onPointerDown?.(event);
        range.onPointerDown(event);
      }}
      onPointerMove={(event) => {
        rest.onPointerMove?.(event);
        range.onPointerMove(event);
      }}
      onPointerUp={(event) => {
        rest.onPointerUp?.(event);
        range.onPointerUp(event);
      }}
      onPointerCancel={(event) => {
        rest.onPointerCancel?.(event);
        range.onPointerUp(event);
      }}
      data-ds-component="Slider"
      data-ds-part="root"
      className={className}
    >
      <div ref={range.trackRef} data-ds-part="track" />
      <div data-ds-part="fill" />
      <div data-ds-part="thumb" />
    </div>
  );
});
