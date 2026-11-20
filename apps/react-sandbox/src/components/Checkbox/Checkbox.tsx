// GENERATED from Checkbox.contract.json + Checkbox.react.json. Do not edit by hand.
// Regenerate: node packages/react/src/emit/emit.mjs Checkbox --out <dir>
//
// Records a yes/no answer that is collected rather than acted on immediately, and can additionally report that a set of answers below it is partly yes.

import { forwardRef, useState, useCallback, useEffect, useRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import './Checkbox.structure.css';
import './Checkbox.theme.css';

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

// One observer per DOCUMENT, shared by every generated control on it and refcounted, notifying
// only the controls a record can affect. Generated from packages/emit-web/form-disabled.mjs.
function watchFormDisabled(proxy: HTMLInputElement, sync: () => void): () => void {
  type Watcher = { proxy: HTMLInputElement; sync: () => void };
  type Registry = { observer: MutationObserver; watchers: Set<Watcher> };
  const doc = proxy.ownerDocument;
  const key = Symbol.for('ds.form-disabled');
  const host = doc as unknown as Record<symbol, Registry | undefined>;
  let registry = host[key];
  if (!registry) {
    const watchers = new Set<Watcher>();
    // ONE pass over the records, each tested cheaply before any subscriber is: a `disabled`
    // change matters only on a fieldset, and an insertion only if it holds an <input>, since
    // every proxy is one. Unrelated mutations cost a type check or a tag lookup, not a walk.
    const observer = new MutationObserver((records) => {
      const due = new Set<Watcher>();
      const collect = (root: Node) => {
        for (const watcher of watchers) if (root.contains(watcher.proxy)) due.add(watcher);
      };
      for (const record of records) {
        if (record.type === 'attributes') {
          if (record.target.nodeName === 'FIELDSET') collect(record.target);
          continue;
        }
        const added = record.addedNodes;
        for (let i = 0; i < added.length; i++) {
          const node = added[i] as Element;
          if (node.nodeType !== 1) continue;
          if (node.nodeName !== 'INPUT') {
            if (!node.firstElementChild || !node.getElementsByTagName('input').length) continue;
          }
          collect(node);
        }
      }
      for (const watcher of due) watcher.sync();
    });
    observer.observe(doc.documentElement, {
      attributes: true,
      attributeFilter: ['disabled'],
      childList: true,
      subtree: true,
    });
    registry = { observer, watchers };
    host[key] = registry;
  }
  const watcher: Watcher = { proxy, sync };
  registry.watchers.add(watcher);
  return () => {
    const current = host[key];
    if (!current) return;
    current.watchers.delete(watcher);
    if (current.watchers.size) return;
    current.observer.disconnect();
    delete host[key];
  };
}

export interface CheckboxProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  | 'checked'
  | 'defaultChecked'
  | 'onCheckedChange'
  | 'disabled'
  | 'invalid'
  | 'label'
  | 'name'
  | 'required'
  | 'form'
  | 'value'
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
  /** Name of the submitted answer. An empty name contributes nothing. */
  name?: string;
  /** Whether an answer is required for form validation. */
  required?: boolean;
  /** The id of the form that owns this answer, when it is not an ancestor form. */
  form?: string;
  /** Value submitted when checked. */
  value?: string;
}

export const Checkbox = forwardRef<HTMLButtonElement, CheckboxProps>(function Checkbox(
  {
    checked,
    defaultChecked = 'unchecked',
    onCheckedChange,
    disabled: disabledProp,
    invalid,
    label,
    name,
    required,
    form,
    value = 'on',
    children,
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
      if (disabled) return;
      const next = checkedValue === 'checked' ? 'unchecked' : 'checked';
      if (!checkedControlled) setCheckedInternal(next);
      onCheckedChange?.(next);
    },
    [checkedControlled, checkedValue, onCheckedChange, disabled],
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
    proxy.checked = answer === 'checked';
  }, []);
  // Every render: the proxy holds exactly the answer the UI shows.
  useEffect(formWrite);
  useEffect(() => {
    const proxy = formProxy.current;
    if (!proxy) return;
    const doc = proxy.ownerDocument;
    // A disabled <fieldset> fires no event. The shared document watcher calls back on a
    // fieldset `disabled` change or a move that can affect this control; the proxy,
    // which the platform disables with its fieldset, gives the answer.
    const syncDisabled = () => setFormDisabled(proxy.matches(':disabled') && !proxy.disabled);
    syncDisabled();
    const unwatch = watchFormDisabled(proxy, syncDisabled);
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
      unwatch();
      doc.removeEventListener('reset', onReset, true);
      clearTimeout(timer);
    };
  }, [setCheckedInternal, formWrite]);
  const formValidity = useRef<ReturnType<typeof ownValidity> | null>(null);
  useEffect(() => {
    const element = formProxy.current;
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
      disabled={disabled || undefined}
      aria-invalid={invalid || undefined}
      onClick={(event) => {
        rest.onClick?.(event);
        activate(event);
      }}
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
      <input
        ref={formProxy}
        type="checkbox"
        name={name || undefined}
        form={form || undefined}
        required={required}
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
