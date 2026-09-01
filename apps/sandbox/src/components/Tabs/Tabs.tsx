// GENERATED from Tabs.contract.json + Tabs.react.json. Do not edit by hand.
// Regenerate: node packages/react/src/emit/emit.mjs Tabs --out <dir>
//
// Holds which one of several sections is showing, in a fixed area, so a person can move between them without losing their place on the page.

import { forwardRef, useId, useState, useCallback, createContext, useMemo } from 'react';
import type { HTMLAttributes } from 'react';
import './Tabs.structure.css';
import './Tabs.theme.css';

export interface TabsContextValue {
  /** The current selection, by member value. */
  selection: string;
  /** Called by a member when it is activated. */
  toggle: (value: string) => void;
  /** Shared id root, so a member's parts can reference one another. */
  baseId: string;
  /** True when the whole collection is disabled. */
  disabled: boolean;
}

export const TabsContext = createContext<TabsContextValue | null>(null);

export interface TabsProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'disabled' | 'value' | 'defaultValue' | 'onValueChange'
> {
  /** The whole strip ignores interaction. Cascades to every tab. */
  disabled?: boolean;
  /** The current selection. Controlled. */
  value?: string;
  /** Initial value when uncontrolled. */
  defaultValue?: string;
  /** Called when it changes, controlled or not. */
  onValueChange?: (value: string) => void;
}

export const Tabs = forwardRef<HTMLDivElement, TabsProps>(function Tabs(
  { disabled, value, defaultValue = '', onValueChange, children, className, ...rest },
  ref,
) {
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

  const contextValue = useMemo(
    () => ({ selection, toggle, baseId, disabled: disabled ?? false }),
    [selection, toggle, baseId, disabled],
  );

  return (
    <div
      {...rest}
      ref={ref}
      id={baseId}
      aria-disabled={disabled || undefined}
      data-ds-component="Tabs"
      data-ds-part="root"
      className={className}
    >
      <TabsContext.Provider value={contextValue}>
        <div role="tablist" id={`${baseId}-list`} data-ds-part="list" />
        {children}
      </TabsContext.Provider>
    </div>
  );
});
