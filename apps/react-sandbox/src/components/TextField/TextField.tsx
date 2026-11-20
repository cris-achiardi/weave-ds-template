// GENERATED from TextField.contract.json + TextField.react.json. Do not edit by hand.
// Regenerate: node packages/react/src/emit/emit.mjs TextField --out <dir>
//
// Collects a single line of text from a person. It is the control itself, where Field is the plumbing around a control — the two compose, and neither does the other's job.

import { forwardRef, useState, useCallback, useEffect, useRef } from 'react';
import type { InputHTMLAttributes, ChangeEvent } from 'react';
import './TextField.structure.css';
import './TextField.theme.css';

// Custom validity has two writers, tracked by WRITER, not by message text: the consumer,
// through the element's own setCustomValidity() method, and authored `invalid`. The
// consumer's message wins, as in WC. Generated from packages/emit-web/validity.mjs, which also
// records the one unsupported path (calling the prototype method directly).
function ownValidity(element: HTMLInputElement) {
  const prior = Object.getOwnPropertyDescriptor(element, 'setCustomValidity');
  const write: (message: string) => void =
    typeof prior?.value === 'function'
      ? prior.value.bind(element)
      : HTMLInputElement.prototype.setCustomValidity.bind(element);
  // An error already present is the consumer's. While the element is barred from validation
  // its text reads '', so `null` records "present but unreadable": left exactly as it is.
  let consumer: string | null = element.validity.customError
    ? element.validationMessage || null
    : '';
  let invalid = false;
  const apply = () => {
    if (consumer !== null) write(consumer || (invalid ? 'Invalid value.' : ''));
  };
  const intercept = (message: string) => {
    consumer = String(message);
    apply();
  };
  element.setCustomValidity = intercept;
  return {
    setInvalid(next: boolean) {
      invalid = next;
      apply();
    },
    release() {
      // A newer override is the consumer's: leave it.
      if (element.setCustomValidity !== intercept) return;
      if (prior) Object.defineProperty(element, 'setCustomValidity', prior);
      else Reflect.deleteProperty(element, 'setCustomValidity');
    },
  };
}

export interface TextFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  | 'value'
  | 'defaultValue'
  | 'onValueChange'
  | 'disabled'
  | 'readOnly'
  | 'invalid'
  | 'size'
  | 'name'
  | 'required'
  | 'form'
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
  /** Name of the submitted answer. An empty name contributes nothing. */
  name?: string;
  /** Whether an answer is required for form validation. */
  required?: boolean;
  /** The id of the form that owns this answer, when it is not an ancestor form. */
  form?: string;
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
    name,
    required,
    form,
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
      if (typeof ref === 'function') {
        const cleanup = (ref as (instance: HTMLInputElement | null) => unknown)(node);
        // The consumer's cleanup runs FIRST, while the element is still recorded: it may
        // reasonably touch the node (setCustomValidity('') on the way out, say).
        return () => {
          if (typeof cleanup === 'function') cleanup();
          else ref(null);
          formControl.current = null;
        };
      }
      if (ref) ref.current = node;
      return () => {
        if (ref) ref.current = null;
        formControl.current = null;
      };
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
  const formValidity = useRef<ReturnType<typeof ownValidity> | null>(null);
  useEffect(() => {
    const element = formControl.current;
    if (!element) return;
    const owner = ownValidity(element);
    formValidity.current = owner;
    return () => {
      formValidity.current = null;
      owner.release();
    };
  }, []);
  useEffect(() => {
    formValidity.current?.setInvalid(Boolean(invalid));
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
      name={name}
      required={required}
      form={form}
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
