// GENERATED from Switch.contract.json + Switch.react.json. Do not edit by hand.
// Regenerate: node packages/react/src/emit/emit.mjs Switch --out <dir>
//
// A binary on/off control that takes effect immediately, for a setting whose two states both make sense on their own — not a value collected and submitted later.

import { forwardRef, useCallback, useState } from 'react';
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
  const controlled = checked !== undefined;
  const [internal, setInternal] = useState(defaultChecked);
  const value = controlled ? checked : internal;

  const toggle = useCallback(() => {
    if (disabled || readOnly) return;
    const next = !value;
    if (!controlled) setInternal(next);
    onCheckedChange?.(next);
  }, [controlled, disabled, readOnly, value, onCheckedChange]);

  return (
    <button
      {...rest}
      ref={ref}
      type="button"
      role="switch"
      aria-checked={value}
      aria-readonly={readOnly || undefined}
      disabled={disabled}
      onClick={toggle}
      data-ds-component="Switch"
      data-ds-part="root"
      className={className}
    >
      <span data-ds-part="thumb" />
    </button>
  );
});
