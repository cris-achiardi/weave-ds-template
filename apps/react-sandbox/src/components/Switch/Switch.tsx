// GENERATED from Switch.contract.json + Switch.react.json. Do not edit by hand.
// Regenerate: node packages/react/src/emit/emit.mjs Switch --out <dir>
//
// A binary on/off control that takes effect immediately, for a setting whose two states both make sense on their own — not a value collected and submitted later.

import { forwardRef, useState, useCallback, useEffect, useRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import './Switch.structure.css';
import './Switch.theme.css';

// The form proxy: in the form, out of sight, out of the pointer's and the tab order's reach.
const FORM_PROXY_STYLE = {
  position: 'absolute',
  width: 1,
  height: 1,
  margin: 0,
  padding: 0,
  border: 0,
  opacity: 0,
  overflow: 'hidden',
  clipPath: 'inset(50%)',
  pointerEvents: 'none',
} as const;

export interface SwitchProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  | 'checked'
  | 'defaultChecked'
  | 'onCheckedChange'
  | 'disabled'
  | 'readOnly'
  | 'name'
  | 'required'
  | 'form'
  | 'value'
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
  /** Name of the submitted answer. An empty name contributes nothing. */
  name?: string;
  /** Whether an answer is required for form validation. */
  required?: boolean;
  /** The id of the form that owns this answer, when it is not an ancestor form. */
  form?: string;
  /** Value submitted when checked. */
  value?: string;
}

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(function Switch(
  {
    checked,
    defaultChecked = false,
    onCheckedChange,
    disabled: disabledProp,
    readOnly,
    name,
    required,
    form,
    value = 'on',
    className,
    ...rest
  },
  ref,
) {
  // Effective disabled: the consumer's prop, or a disabled <fieldset> around the control.
  // Everything below reads this one; the prop itself is never written.
  const [formDisabled, setFormDisabled] = useState(false);
  const disabled = disabledProp || formDisabled;

  const checkedControlled = checked !== undefined;
  const [checkedInternal, setCheckedInternal] = useState(defaultChecked);
  const checkedValue = checkedControlled ? checked : checkedInternal;

  const activate = useCallback(
    (event?: { defaultPrevented: boolean }) => {
      // Guards, because this runs on a CLICK and the platform guards there too: calling
      // preventDefault() in a click handler is what cancels a native checkbox's toggle.
      // Honouring it here makes a generated control agree with the element it replaces.
      // Without it a consumer's own onClick calling preventDefault() was ignored, and a
      // root that both toggles and dismisses did both on one press.
      if (event?.defaultPrevented) return;
      if (disabled || readOnly) return;
      const next = !checkedValue;
      if (!checkedControlled) setCheckedInternal(next);
      onCheckedChange?.(next);
    },
    [checkedControlled, checkedValue, onCheckedChange, disabled, readOnly],
  );

  // ---- form contribution (contract.form). See packages/wc/forms.md.
  const formProxy = useRef<HTMLInputElement | null>(null);
  // The answer a reset restores: captured once, at mount, never re-captured from props.
  const formAnswer = useRef(checkedValue);
  // Read by listeners installed once, which must see current props.
  const formLatest = useRef({ checkedValue, checkedControlled, onCheckedChange });
  formLatest.current = { checkedValue, checkedControlled, onCheckedChange };
  const formWrite = useCallback(() => {
    const proxy = formProxy.current;
    if (!proxy) return;
    const answer = formLatest.current.checkedValue;
    proxy.checked = answer === true;
  }, []);
  // Every render: the proxy holds exactly the answer the UI shows.
  useEffect(formWrite);
  useEffect(() => {
    const proxy = formProxy.current;
    if (!proxy) return;
    const doc = proxy.ownerDocument;
    // A disabled <fieldset> fires no event. Watch `disabled` attributes and ask the
    // proxy, which the platform disables along with every other control inside it.
    const syncDisabled = () => setFormDisabled(proxy.matches(':disabled') && !proxy.disabled);
    syncDisabled();
    const observer = new MutationObserver(syncDisabled);
    observer.observe(doc.documentElement, {
      attributes: true,
      attributeFilter: ['disabled'],
      subtree: true,
    });
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Matched against the CURRENT owner when it fires, so a `form` prop, an owner change
    // or a move needs no re-subscription.
    const onReset = (event: Event) => {
      if (event.target !== proxy.form) return;
      // A TASK, not a microtask: a reset button dispatches from native code, so a
      // microtask would run before later listeners could cancel and before the reset.
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (event.defaultPrevented) return;
        const answer = formAnswer.current;
        const latest = formLatest.current;
        // A controlled model is told only when it differs. No DOM event is dispatched:
        // this is lifecycle synchronisation, not a user edit.
        if (latest.checkedControlled) {
          if (latest.checkedValue !== answer) latest.onCheckedChange?.(answer);
        } else setCheckedInternal(answer);
        // The platform has rewritten the proxy; put back what the model holds now.
        formWrite();
      });
    };
    doc.addEventListener('reset', onReset, true);
    return () => {
      observer.disconnect();
      doc.removeEventListener('reset', onReset, true);
      clearTimeout(timer);
    };
  }, [setCheckedInternal, formWrite]);

  return (
    <button
      {...rest}
      ref={ref}
      type="button"
      role="switch"
      aria-checked={checkedValue}
      disabled={disabled || undefined}
      aria-readonly={readOnly || undefined}
      onClick={(event) => {
        rest.onClick?.(event);
        activate(event);
      }}
      data-ds-component="Switch"
      data-ds-part="root"
      className={className}
    >
      <div data-ds-part="thumb" />
      <input
        ref={formProxy}
        type="checkbox"
        name={name || undefined}
        form={form || undefined}
        required={required && !readOnly}
        disabled={disabledProp}
        value={value}
        aria-hidden="true"
        tabIndex={-1}
        autoComplete="off"
        style={FORM_PROXY_STYLE}
        onFocus={(event) => {
          const root = event.currentTarget.parentElement;
          (root?.querySelector<HTMLElement>('[tabindex="0"]') ?? root)?.focus();
        }}
      />
    </button>
  );
});
