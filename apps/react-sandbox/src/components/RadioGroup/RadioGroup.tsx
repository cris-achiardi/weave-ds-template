// GENERATED from RadioGroup.contract.json + RadioGroup.react.json. Do not edit by hand.
// Regenerate: node packages/react/src/emit/emit.mjs RadioGroup --out <dir>
//
// Holds one choice from a small set of mutually exclusive options, all visible at once. It exists so the chosen option has exactly one home: the items compare against it rather than each holding a copy.

import {
  forwardRef,
  useId,
  useState,
  useCallback,
  useEffect,
  useRef,
  createContext,
  useMemo,
} from 'react';
import type { HTMLAttributes } from 'react';
import {
  useLinearNavigation,
  type MemberRegistration,
  type NavigationOptions,
} from '@ds/react/behavior';
import './RadioGroup.structure.css';
import './RadioGroup.theme.css';

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

// Transcribed field for field from RadioGroup.contract.json > collection.navigation.
// The cases this commits us to are in @ds/contracts/conformance/linear-navigation.json.
const NAVIGATION: NavigationOptions = {
  orientation: 'both',
  wrap: true,
  followsFocus: true,
  disabledItems: 'skip',
};

export interface RadioGroupContextValue {
  /** The current selection, by member value. */
  selection: string;
  /** Called by a member when it is activated. */
  toggle: (value: string) => void;
  /** Shared id root, so a member's parts can reference one another. */
  baseId: string;
  /** True when the whole collection is disabled. */
  disabled: boolean;
  /** A member announces its DOM node, so the collection can move focus between them. */
  register: (value: string, entry: MemberRegistration) => void;
  unregister: (value: string) => void;
  /** True for the one member that sits in the page's tab sequence. */
  isTabStop: (value: string) => boolean;
}

export const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

export interface RadioGroupProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  | 'disabled'
  | 'readOnly'
  | 'value'
  | 'defaultValue'
  | 'onValueChange'
  | 'name'
  | 'required'
  | 'form'
> {
  /** The whole group ignores interaction. Cascades to every item. */
  disabled?: boolean;
  /** The selection cannot be changed, but the group stays readable and focusable. Distinct from disabled, which removes it from the focus order. */
  readOnly?: boolean;
  /** The current selection. Controlled. */
  value?: string;
  /** Initial value when uncontrolled. */
  defaultValue?: string;
  /** Called when it changes, controlled or not. */
  onValueChange?: (value: string) => void;
  /** Name of the submitted answer. An empty name contributes nothing. */
  name?: string;
  /** Whether an answer is required for form validation. */
  required?: boolean;
  /** The id of the form that owns this answer, when it is not an ancestor form. */
  form?: string;
}

export const RadioGroup = forwardRef<HTMLDivElement, RadioGroupProps>(function RadioGroup(
  {
    disabled: disabledProp,
    readOnly,
    value,
    defaultValue = '',
    onValueChange,
    name,
    required,
    form,
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

  const baseId = useId();

  const valueControlled = value !== undefined;
  const [valueInternal, setValueInternal] = useState(defaultValue);
  const selection = valueControlled ? value : valueInternal;

  const toggle = useCallback(
    (value: string) => {
      const next = value;
      if (next === selection) return;
      if (!valueControlled) setValueInternal(next);
      onValueChange?.(next);
    },
    [selection, valueControlled, onValueChange],
  );

  // `toggle` is the selection setter, and `followsFocus` is what decides whether the
  // primitive calls it. With followsFocus false it is never called from here and arrowing
  // only moves focus.
  const nav = useLinearNavigation(NAVIGATION, selection, toggle);

  const contextValue = useMemo(
    () => ({
      selection,
      toggle,
      baseId,
      disabled: disabled ?? false,
      register: nav.register,
      unregister: nav.unregister,
      isTabStop: nav.isTabStop,
    }),
    [selection, toggle, baseId, disabled, nav.register, nav.unregister, nav.isTabStop],
  );

  // ---- form contribution (contract.form). See packages/wc/forms.md.
  const formProxy = useRef<HTMLInputElement | null>(null);
  // The answer a reset restores: captured once, at mount, never re-captured from props.
  const formAnswer = useRef(selection);
  // Read by listeners installed once, which must see current props.
  const formLatest = useRef({ selection, valueControlled, onValueChange });
  formLatest.current = { selection, valueControlled, onValueChange };
  const formWrite = useCallback(() => {
    const proxy = formProxy.current;
    if (!proxy) return;
    const answer = formLatest.current.selection;
    proxy.value = answer;
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
        if (latest.valueControlled) {
          if (latest.selection !== answer) latest.onValueChange?.(answer);
        } else setValueInternal(answer);
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
  }, [setValueInternal, formWrite]);

  return (
    <div
      {...rest}
      ref={ref}
      role="radiogroup"
      id={baseId}
      aria-disabled={disabled || undefined}
      aria-readonly={readOnly || undefined}
      onKeyDown={(event) => {
        rest.onKeyDown?.(event);
        nav.onKeyDown(event);
      }}
      data-ds-component="RadioGroup"
      data-ds-part="root"
      className={className}
    >
      <RadioGroupContext.Provider value={contextValue}>{children}</RadioGroupContext.Provider>
      <input
        ref={formProxy}
        type="text"
        name={name || undefined}
        form={form || undefined}
        required={required && !readOnly}
        readOnly={readOnly}
        disabled={disabledProp}
        aria-hidden="true"
        tabIndex={-1}
        autoComplete="off"
        style={FORM_PROXY_STYLE}
        onFocus={(event) => {
          const root = event.currentTarget.parentElement;
          (root?.querySelector<HTMLElement>('[tabindex="0"]') ?? root)?.focus();
        }}
      />
    </div>
  );
});
