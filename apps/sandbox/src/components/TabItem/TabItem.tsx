// GENERATED from TabItem.contract.json + TabItem.react.json. Do not edit by hand.
// Regenerate: node packages/react/src/emit/emit.mjs TabItem --out <dir>
//
// One tab: a label that reveals its panel when chosen. It carries its own identity and its own disabled state, and nothing else.

import { forwardRef, useCallback, useContext } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { TabsContext } from '../Tabs/Tabs';
import './TabItem.structure.css';
import './TabItem.theme.css';

export interface TabItemProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'disabled' | 'value' | 'label'
> {
  /** Set by the prop or inherited from the strip. Skipped by arrow-key movement. */
  disabled?: boolean;
  /** Distinguishes this TabItem from its siblings. The ancestor Tabs compares against it to decide whether this one is in the selection. */
  value: string;
  /** The tab's name. Fills the label part. */
  label: ReactNode;
}

export const TabItem = forwardRef<HTMLButtonElement, TabItemProps>(function TabItem(
  { disabled, value, label, children, className, ...rest },
  ref,
) {
  const ctx = useContext(TabsContext);
  if (!ctx) {
    throw new Error(
      'TabItem must be rendered inside a Tabs. There is no selection to compare against, and looking unselected would hide the mistake.',
    );
  }
  const selected = ctx.selection === value;
  const baseId = `${ctx.baseId}-TabItem-${value}`;
  const { register, unregister } = ctx;

  const rootRef = useCallback(
    (node: HTMLButtonElement | null) => {
      if (node) {
        register(value, { element: node, disabled: disabled || ctx.disabled });
      } else {
        unregister(value);
      }
      // The consumer's own ref still has to land. Swallowing it would break every
      // measurement and every imperative focus call made from outside.
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    },
    [register, unregister, value, disabled, ctx.disabled, ref],
  );

  const activate = useCallback(() => {
    if (disabled || ctx.disabled) return;
    ctx.toggle(value);
  }, [ctx, value, disabled]);

  return (
    <button
      {...rest}
      ref={rootRef}
      type="button"
      role="tab"
      id={baseId}
      aria-disabled={disabled || undefined}
      aria-selected={selected}
      tabIndex={ctx.isTabStop(value) ? 0 : -1}
      aria-controls={`${ctx.baseId}-TabPanel-${value}`}
      onClick={activate}
      data-ds-component="TabItem"
      data-ds-part="root"
      className={className}
    >
      <div data-ds-part="label">{label}</div>
      <div hidden={!selected} data-ds-part="indicator" />
      {children}
    </button>
  );
});
