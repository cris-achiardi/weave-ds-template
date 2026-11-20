// GENERATED from TextField.contract.json + TextField.react.json. Do not edit by hand.
// Regenerate: node packages/react/src/emit/emit.mjs TextField --out <dir>
//
// Collects a single line of text from a person. It is the control itself, where Field is the plumbing around a control — the two compose, and neither does the other's job.

import { forwardRef, useState, useCallback, useEffect, useRef } from 'react';
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

  // ---- form lifecycle (contract.form). See packages/wc/forms.md.
  const formControl = useRef<HTMLInputElement | null>(null);
  // The answer a reset restores: captured once, at mount, never re-captured from props.
  const formAnswer = useRef(valueValue);
  // Read by the reset listener, which is installed once and must see current props.
  const formLatest = useRef({ valueValue, valueControlled, onValueChange });
  formLatest.current = { valueValue, valueControlled, onValueChange };
  const setFormControl = useCallback(
    (node: HTMLInputElement | null) => {
      formControl.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );
  useEffect(() => {
    const control = formControl.current;
    if (!control) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Listened for on the document, and matched against the CURRENT owner when it fires,
    // so a `form` attribute, an owner change or a move needs no re-subscription.
    const onReset = (event: Event) => {
      if (event.target !== control.form) return;
      // A TASK, not a microtask: a reset button dispatches from native code, so a microtask
      // would run before later listeners could cancel and before the platform resets.
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (event.defaultPrevented) return;
        const answer = formAnswer.current;
        const latest = formLatest.current;
        // A controlled model is told only when it differs. No DOM event is dispatched:
        // this is lifecycle synchronisation, not a user edit.
        if (latest.valueControlled) {
          if (latest.valueValue !== answer) latest.onValueChange?.(answer);
        } else setValueInternal(answer);
      });
    };
    const doc = control.ownerDocument;
    doc.addEventListener('reset', onReset, true);
    return () => {
      doc.removeEventListener('reset', onReset, true);
      clearTimeout(timer);
    };
  }, [setValueInternal]);
  // Authored `invalid` is a custom validity error the component OWNS. A message the
  // consumer set through the element's own setCustomValidity() is never replaced or
  // cleared by it.
  const formOwnsError = useRef(false);
  useEffect(() => {
    const control = formControl.current;
    if (!control) return;
    if (invalid) {
      if (control.validity.customError) return;
      control.setCustomValidity('Invalid value.');
      formOwnsError.current = true;
    } else if (formOwnsError.current) {
      formOwnsError.current = false;
      if (control.validationMessage === 'Invalid value.') control.setCustomValidity('');
    }
  }, [invalid]);

  return (
    <input
      {...rest}
      ref={setFormControl}
      disabled={disabled || undefined}
      aria-readonly={readOnly || undefined}
      aria-invalid={invalid || undefined}
      data-ds-size={size}
      value={valueValue}
      readOnly={readOnly}
      onChange={(event) => {
        rest.onChange?.(event);
        handleChange(event);
      }}
      data-ds-component="TextField"
      data-ds-part="root"
      className={className}
    />
  );
});
