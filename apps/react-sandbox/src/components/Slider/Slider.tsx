// GENERATED from Slider.contract.json + Slider.react.json. Do not edit by hand.
// Regenerate: node packages/react/src/emit/emit.mjs Slider --out <dir>
//
// Chooses a number from a continuous range where the approximate value matters more than the exact one — a volume, a zoom level, a price ceiling.

import { forwardRef, useState, useCallback, useEffect, useRef } from 'react';
import type { HTMLAttributes } from 'react';
import { snap, useRangeControl, type RangeOptions } from '@ds/react/behavior';
import './Slider.structure.css';
import './Slider.theme.css';

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

// Transcribed from Slider.contract.json: the `range` block, plus min/max/step from the
// `value` state. The cases this commits us to are in
// @ds/contracts/conformance/range-stepping.json.
const RANGE: RangeOptions = {
  min: 0,
  max: 100,
  step: 1,
  orientation: 'horizontal',
  pageStep: 10,
};

export interface SliderProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'value' | 'defaultValue' | 'onValueChange' | 'disabled' | 'name' | 'required' | 'form'
> {
  /** The chosen number. Bounded and stepped — facts that live nowhere else, and that no boolean or enumeration can carry. Controlled. */
  value?: number;
  /** Initial value when uncontrolled. */
  defaultValue?: number;
  /** Called when it changes, controlled or not. */
  onValueChange?: (value: number) => void;
  /** The platform's own disabled state. Removed from the focus order and cannot be moved. */
  disabled?: boolean;
  /** Name of the submitted answer. An empty name contributes nothing. */
  name?: string;
  /** Whether an answer is required for form validation. */
  required?: boolean;
  /** The id of the form that owns this answer, when it is not an ancestor form. */
  form?: string;
}

export const Slider = forwardRef<HTMLDivElement, SliderProps>(function Slider(
  {
    value,
    defaultValue = 0,
    onValueChange,
    disabled: disabledProp,
    name,
    required,
    form,
    className,
    ...rest
  },
  ref,
) {
  // Effective disabled: the consumer's prop, or a disabled <fieldset> around the control.
  // Everything below reads this one; the prop itself is never written.
  const [formDisabled, setFormDisabled] = useState(false);
  const disabled = disabledProp || formDisabled;

  const valueControlled = value !== undefined;
  const [valueInternal, setValueInternal] = useState(defaultValue);
  const valueValue = valueControlled ? value : valueInternal;

  const setValue = useCallback(
    (next: number) => {
      if (!valueControlled) setValueInternal(next);
      onValueChange?.(next);
    },
    [valueControlled, onValueChange],
  );
  const range = useRangeControl(RANGE, valueValue, setValue, disabled);

  // ---- form contribution (contract.form). See packages/wc/forms.md.
  const formProxy = useRef<HTMLInputElement | null>(null);
  // The answer a reset restores: captured once, at mount, never re-captured from props.
  const formAnswer = useRef(valueValue);
  // Read by listeners installed once, which must see current props.
  const formLatest = useRef({ valueValue, valueControlled, onValueChange });
  formLatest.current = { valueValue, valueControlled, onValueChange };
  const formWrite = useCallback(() => {
    const proxy = formProxy.current;
    if (!proxy) return;
    const answer = formLatest.current.valueValue;
    proxy.value = String(snap(answer, RANGE));
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
          if (latest.valueValue !== answer) latest.onValueChange?.(answer);
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
      role="slider"
      aria-disabled={disabled || undefined}
      data-ds-state-dragging={range.dragging || undefined}
      tabIndex={disabled ? -1 : 0}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={snap(valueValue, RANGE)}
      style={{ ...rest.style, ['--ds-fraction' as string]: range.fraction }}
      onKeyDown={(event) => {
        rest.onKeyDown?.(event);
        range.onKeyDown(event);
      }}
      onPointerDown={(event) => {
        rest.onPointerDown?.(event);
        range.onPointerDown(event);
      }}
      onPointerMove={(event) => {
        rest.onPointerMove?.(event);
        range.onPointerMove(event);
      }}
      onPointerUp={(event) => {
        rest.onPointerUp?.(event);
        range.onPointerUp(event);
      }}
      onPointerCancel={(event) => {
        rest.onPointerCancel?.(event);
        range.onPointerUp(event);
      }}
      data-ds-component="Slider"
      data-ds-part="root"
      className={className}
    >
      <div ref={range.trackRef} data-ds-part="track" />
      <div data-ds-part="fill" />
      <div data-ds-part="thumb" />
      <input
        ref={formProxy}
        type="range"
        name={name || undefined}
        form={form || undefined}
        required={required}
        disabled={disabledProp}
        min={0}
        max={100}
        step={1}
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
