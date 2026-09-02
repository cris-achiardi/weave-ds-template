// GENERATED from Slider.contract.json + Slider.react.json. Do not edit by hand.
// Regenerate: node packages/react/src/emit/emit.mjs Slider --out <dir>
//
// Chooses a number from a continuous range where the approximate value matters more than the exact one — a volume, a zoom level, a price ceiling.

import { forwardRef, useState } from 'react';
import type { HTMLAttributes } from 'react';
import './Slider.structure.css';
import './Slider.theme.css';

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
  // Nothing in the contract says what CHANGES `value`: no part declares
  // `activates`. It works when controlled from outside; uncontrolled it cannot move.
  void setValueInternal;

  return (
    <div
      {...rest}
      ref={ref}
      role="slider"
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : 0}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={valueValue}
      data-ds-component="Slider"
      data-ds-part="root"
      className={className}
    >
      <div data-ds-part="track" />
      <div data-ds-part="fill" />
      <div data-ds-part="thumb" />
    </div>
  );
});
