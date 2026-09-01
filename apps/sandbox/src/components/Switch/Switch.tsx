// GENERATED from Switch.contract.json + Switch.react.json. Do not edit by hand.
// Regenerate: node packages/react/src/emit/emit.mjs Switch --out <dir>
//
// A binary on/off control that takes effect immediately, for a setting whose two states both make sense on their own — not a value collected and submitted later.

import { forwardRef, useState, useCallback } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import './Switch.structure.css';
import './Switch.theme.css';

export interface SwitchProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'checked' | 'defaultChecked' | 'onCheckedChange' | 'disabled' | 'readOnly'
> {
  /** The switch is on. Tracked by the implementation and reflected to assistive technology. Controlled. */
  checked?: boolean;
  /** Initial value when uncontrolled. */
  defaultChecked?: boolean;
  /** Called when it changes, controlled or not. */
  onCheckedChange?: (checked: boolean) => void;
  /** The platform's own disabled state. Removed from the focus order and cannot be toggled. */
  disabled?: boolean;
  /** Cannot be toggled, but remains focusable and readable. Distinct from disabled, which removes it from the focus order entirely. */
  readOnly?: boolean;
}

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(function Switch(
  { checked, defaultChecked = false, onCheckedChange, disabled, readOnly, className, ...rest },
  ref,
) {
  const checkedControlled = checked !== undefined;
  const [checkedInternal, setCheckedInternal] = useState(defaultChecked);
  const checkedValue = checkedControlled ? checked : checkedInternal;

  const activate = useCallback(() => {
    if (disabled || readOnly) return;
    const next = !checkedValue;
    if (!checkedControlled) setCheckedInternal(next);
    onCheckedChange?.(next);
  }, [checkedControlled, checkedValue, onCheckedChange, disabled, readOnly]);

  return (
    <button
      {...rest}
      ref={ref}
      type="button"
      role="switch"
      aria-checked={checkedValue}
      disabled={disabled}
      aria-readonly={readOnly || undefined}
      onClick={activate}
      data-ds-component="Switch"
      data-ds-part="root"
      className={className}
    >
      <div data-ds-part="thumb" />
    </button>
  );
});
