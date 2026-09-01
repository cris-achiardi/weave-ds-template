// GENERATED from Checkbox.contract.json + Checkbox.react.json. Do not edit by hand.
// Regenerate: node packages/react/src/emit/emit.mjs Checkbox --out <dir>
//
// Records a yes/no answer that is collected rather than acted on immediately, and can additionally report that a set of answers below it is partly yes.

import { forwardRef, useState, useCallback } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import './Checkbox.structure.css';
import './Checkbox.theme.css';

export interface CheckboxProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'checked' | 'defaultChecked' | 'onCheckedChange' | 'disabled' | 'invalid' | 'label'
> {
  /** The answer. Three values, not two: `mixed` reports that a set of checkboxes below this one is partly checked, and is set by the implementation rather than chosen by a user. Controlled. */
  checked?: 'unchecked' | 'checked' | 'mixed';
  /** Initial value when uncontrolled. */
  defaultChecked?: 'unchecked' | 'checked' | 'mixed';
  /** Called when it changes, controlled or not. */
  onCheckedChange?: (checked: 'unchecked' | 'checked' | 'mixed') => void;
  /** The platform's own disabled state. Removed from the focus order and cannot be answered. */
  disabled?: boolean;
  /** The answer failed validation — typically a required checkbox left unchecked. */
  invalid?: boolean;
  /** The question being answered. Fills the `label` part. */
  label: ReactNode;
}

export const Checkbox = forwardRef<HTMLButtonElement, CheckboxProps>(function Checkbox(
  {
    checked,
    defaultChecked = 'unchecked',
    onCheckedChange,
    disabled,
    invalid,
    label,
    children,
    className,
    ...rest
  },
  ref,
) {
  const checkedControlled = checked !== undefined;
  const [checkedInternal, setCheckedInternal] = useState(defaultChecked);
  const checkedValue = checkedControlled ? checked : checkedInternal;

  const activate = useCallback(() => {
    if (disabled) return;
    const next = checkedValue === 'checked' ? 'unchecked' : 'checked';
    if (!checkedControlled) setCheckedInternal(next);
    onCheckedChange?.(next);
  }, [checkedControlled, checkedValue, onCheckedChange, disabled]);

  return (
    <button
      {...rest}
      ref={ref}
      type="button"
      role="checkbox"
      aria-checked={
        checkedValue === 'unchecked'
          ? 'false'
          : checkedValue === 'checked'
            ? 'true'
            : checkedValue === 'mixed'
              ? 'mixed'
              : undefined
      }
      disabled={disabled}
      aria-invalid={invalid || undefined}
      onClick={activate}
      data-ds-component="Checkbox"
      data-ds-part="root"
      className={className}
    >
      <div data-ds-part="box">
        <div hidden={!(checkedValue === 'checked')} data-ds-part="tick" />
        <div hidden={!(checkedValue === 'mixed')} data-ds-part="dash" />
      </div>
      <div data-ds-part="label">{label}</div>
      {children}
    </button>
  );
});
