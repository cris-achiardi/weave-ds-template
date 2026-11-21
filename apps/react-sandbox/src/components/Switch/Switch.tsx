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
    // ONE pass over the records, each tested cheaply before any subscriber is: a record on a
    // fieldset re-asks everything inside it, and an insertion elsewhere matters only if it holds
    // an <input>, since every proxy is one. Unrelated mutations cost a tag check, not a walk.
    const observer = new MutationObserver((records) => {
      const due = new Set<Watcher>();
      const collect = (root: Node) => {
        for (const watcher of watchers) if (root.contains(watcher.proxy)) due.add(watcher);
      };
      for (const record of records) {
        // A fieldset's own `disabled`, OR its children changing: which <legend> is first decides
        // whether the controls inside that legend are exempt, so adding or removing a child of a
        // fieldset can change the state of descendants that never moved.
        if (record.target.nodeName === 'FIELDSET') collect(record.target);
        if (record.type === 'attributes') continue;
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
        type={readOnly ? 'text' : 'checkbox'}
        name={readOnly && !(checkedValue === true) ? undefined : name || undefined}
        form={form || undefined}
        required={required && !readOnly}
        readOnly={readOnly}
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
