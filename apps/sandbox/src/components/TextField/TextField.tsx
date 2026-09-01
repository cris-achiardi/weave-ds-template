// GENERATED from TextField.contract.json + TextField.react.json. Do not edit by hand.
// Regenerate: node packages/react/src/emit/emit.mjs TextField --out <dir>
//
// Collects a single line of text from a person. It is the control itself, where Field is the plumbing around a control — the two compose, and neither does the other's job.

import { forwardRef, useState, useCallback } from 'react';
import type { InputHTMLAttributes, ChangeEvent } from 'react';
import './TextField.structure.css';
import './TextField.theme.css';

export interface TextFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'defaultValue' | 'onValueChange' | 'disabled' | 'readOnly' | 'invalid' | 'size'
> {
  /** The text itself. Free-form: not a boolean, and not one of a fixed set — which is what makes this the first state in the library that `values` cannot describe. Controlled. */
  value?: string;
  /** Initial value when uncontrolled. */
  defaultValue?: string;
  /** Called when it changes, controlled or not. */
  onValueChange?: (value: string) => void;
  /** The platform's own disabled state. Removed from the focus order and cannot be typed into. */
  disabled?: boolean;
  /** The text can be read and selected but not changed. Distinct from disabled, which removes it from the focus order. */
  readOnly?: boolean;
  /** Set from outside — usually by a surrounding Field. This component does not decide it. */
  invalid?: boolean;
  /** A contiguous subset of the canon's ladder. Defaults to `m`. */
  size?: 's' | 'm' | 'l';
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  {
    value,
    defaultValue = '',
    onValueChange,
    disabled,
    readOnly,
    invalid,
    size = 'm',
    className,
    ...rest
  },
  ref,
) {
  const valueControlled = value !== undefined;
  const [valueInternal, setValueInternal] = useState(defaultValue);
  const valueValue = valueControlled ? value : valueInternal;
  // Nothing in the contract says what CHANGES `value`: no part declares
  // `activates`. It works when controlled from outside; uncontrolled it cannot move.
  void setValueInternal;

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const next = event.target.value;
      if (!valueControlled) setValueInternal(next);
      onValueChange?.(next);
    },
    [valueControlled, onValueChange],
  );

  return (
    <input
      {...rest}
      ref={ref}
      disabled={disabled}
      aria-readonly={readOnly || undefined}
      aria-invalid={invalid || undefined}
      data-ds-size={size}
      value={valueValue}
      onChange={handleChange}
      readOnly={readOnly}
      data-ds-component="TextField"
      data-ds-part="root"
      className={className}
    />
  );
});
