// GENERATED from Field.contract.json + Field.react.json. Do not edit by hand.
// Regenerate: node packages/react/src/emit/emit.mjs Field --out <dir>
//
// Wires a form control to its label, its help text and its error message, so the three are announced together and the control's validity has one place to live. It is the plumbing around an input, never the input.

import { forwardRef, useState } from 'react';
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
  const invalidControlled = invalid !== undefined;
  const [invalidInternal, setInvalidInternal] = useState(defaultInvalid);
  const invalidValue = invalidControlled ? invalid : invalidInternal;
  // The contract declares `invalid` as control: shared, so a consumer may set it — but
  // nothing in the contract says what CHANGES it, so this setter is unreachable and the
  // uncontrolled form of this state can never move. Pass `invalid` to control it.
  void setInvalidInternal;
  const touchedControlled = touched !== undefined;
  const [touchedInternal, setTouchedInternal] = useState(defaultTouched);
  const touchedValue = touchedControlled ? touched : touchedInternal;
  // The contract declares `touched` as control: shared, so a consumer may set it — but
  // nothing in the contract says what CHANGES it, so this setter is unreachable and the
  // uncontrolled form of this state can never move. Pass `touched` to control it.
  void setTouchedInternal;
  const dirtyControlled = dirty !== undefined;
  const [dirtyInternal, setDirtyInternal] = useState(defaultDirty);
  const dirtyValue = dirtyControlled ? dirty : dirtyInternal;
  // The contract declares `dirty` as control: shared, so a consumer may set it — but
  // nothing in the contract says what CHANGES it, so this setter is unreachable and the
  // uncontrolled form of this state can never move. Pass `dirty` to control it.
  void setDirtyInternal;

  return (
    <div
      {...rest}
      ref={ref}
      aria-disabled={disabled || undefined}
      aria-invalid={invalidValue || undefined}
      data-ds-state-touched={touchedValue || undefined}
      data-ds-state-dirty={dirtyValue || undefined}
      data-ds-component="Field"
      data-ds-part="root"
      className={className}
    >
      <span data-ds-part="label">{label}</span>
      <span data-ds-part="description">{description}</span>
      <span data-ds-part="error">{error}</span>
      {control}
      {children}
    </div>
  );
});
