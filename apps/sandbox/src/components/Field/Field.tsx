// GENERATED from Field.contract.json + Field.react.json. Do not edit by hand.
// Regenerate: node packages/react/src/emit/emit.mjs Field --out <dir>
//
// Wires a form control to its label, its help text and its error message, so the three are announced together and the control's validity has one place to live. It is the plumbing around an input, never the input.

import { forwardRef, useId, useState } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import './Field.structure.css';
import './Field.theme.css';

export interface FieldProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  | 'disabled'
  | 'invalid'
  | 'defaultInvalid'
  | 'onInvalidChange'
  | 'touched'
  | 'defaultTouched'
  | 'onTouchedChange'
  | 'dirty'
  | 'defaultDirty'
  | 'onDirtyChange'
  | 'label'
  | 'control'
  | 'description'
  | 'error'
> {
  /** The control ignores interaction. Set on the field so the label and description can dim with it. */
  disabled?: boolean;
  /** Validation has run and failed. Reaches assistive technology as aria-invalid and shows the error. Controlled. */
  invalid?: boolean;
  /** Initial value when uncontrolled. */
  defaultInvalid?: boolean;
  /** Called when it changes, controlled or not. */
  onInvalidChange?: (invalid: boolean) => void;
  /** The control has been focused and then blurred at least once. Gates WHEN an error is allowed to show. Controlled. */
  touched?: boolean;
  /** Initial value when uncontrolled. */
  defaultTouched?: boolean;
  /** Called when it changes, controlled or not. */
  onTouchedChange?: (touched: boolean) => void;
  /** The value differs from the value the field started with. Gates validation timing and enables a reset affordance. Controlled. */
  dirty?: boolean;
  /** Initial value when uncontrolled. */
  defaultDirty?: boolean;
  /** Called when it changes, controlled or not. */
  onDirtyChange?: (dirty: boolean) => void;
  /** Names the control. Required — a field with no label is the defect this component exists to prevent. */
  label: ReactNode;
  /** The control being wired up. Passed in rather than rendered. */
  control: ReactNode;
  /** Help text, announced with the control. */
  description?: ReactNode;
  /** Why validation failed. Shown only when the field is invalid AND has been touched. */
  error?: ReactNode;
}

export const Field = forwardRef<HTMLDivElement, FieldProps>(function Field(
  {
    disabled,
    invalid,
    defaultInvalid = false,
    onInvalidChange,
    touched,
    defaultTouched = false,
    onTouchedChange,
    dirty,
    defaultDirty = false,
    onDirtyChange,
    label,
    control,
    description,
    error,
    children,
    className,
    ...rest
  },
  ref,
) {
  const baseId = useId();

  const invalidControlled = invalid !== undefined;
  const [invalidInternal, setInvalidInternal] = useState(defaultInvalid);
  const invalidValue = invalidControlled ? invalid : invalidInternal;
  // Nothing in the contract says what CHANGES `invalid`: no part declares
  // `activates`. It works when controlled from outside; uncontrolled it cannot move.
  void setInvalidInternal;
  const touchedControlled = touched !== undefined;
  const [touchedInternal, setTouchedInternal] = useState(defaultTouched);
  const touchedValue = touchedControlled ? touched : touchedInternal;
  // Nothing in the contract says what CHANGES `touched`: no part declares
  // `activates`. It works when controlled from outside; uncontrolled it cannot move.
  void setTouchedInternal;
  const dirtyControlled = dirty !== undefined;
  const [dirtyInternal, setDirtyInternal] = useState(defaultDirty);
  const dirtyValue = dirtyControlled ? dirty : dirtyInternal;
  // Nothing in the contract says what CHANGES `dirty`: no part declares
  // `activates`. It works when controlled from outside; uncontrolled it cannot move.
  void setDirtyInternal;

  return (
    <div
      {...rest}
      ref={ref}
      id={baseId}
      aria-disabled={disabled || undefined}
      aria-invalid={invalidValue || undefined}
      data-ds-state-touched={touchedValue || undefined}
      data-ds-state-dirty={dirtyValue || undefined}
      data-ds-component="Field"
      data-ds-part="root"
      className={className}
    >
      <div data-ds-part="label">{label}</div>
      <div
        id={`${baseId}-control`}
        aria-labelledby={`${baseId}-label`}
        aria-describedby={
          [`${baseId}-description`, invalidValue ? `${baseId}-error` : null]
            .filter(Boolean)
            .join(' ') || undefined
        }
        data-ds-part="control"
      >
        {control}
      </div>
      <div data-ds-part="description">{description}</div>
      <div hidden={!invalidValue} data-ds-part="error">
        {error}
      </div>
      {children}
    </div>
  );
});
