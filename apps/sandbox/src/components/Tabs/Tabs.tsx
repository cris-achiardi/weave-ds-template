// GENERATED from Tabs.contract.json + Tabs.react.json. Do not edit by hand.
// Regenerate: node packages/react/src/emit/emit.mjs Tabs --out <dir>
//
// Holds which one of several sections is showing, in a fixed area, so a person can move between them without losing their place on the page.

import { forwardRef, useId, useState, useCallback, createContext, useMemo } from 'react';
import type { HTMLAttributes } from 'react';
import {
  useLinearNavigation,
  type MemberRegistration,
  type NavigationOptions,
} from '@ds/react/behavior';
import './Tabs.structure.css';
import './Tabs.theme.css';

// Transcribed field for field from Tabs.contract.json > collection.navigation.
// The cases this commits us to are in @ds/contracts/conformance/linear-navigation.json.
const NAVIGATION: NavigationOptions = {
  orientation: 'horizontal',
  wrap: true,
  followsFocus: true,
  disabledItems: 'focusable',
  homeEnd: true,
};

export interface TabsContextValue {
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

  return (
    <div
      {...rest}
      ref={ref}
      id={baseId}
      aria-disabled={disabled || undefined}
      onKeyDown={(event) => {
        rest.onKeyDown?.(event);
        nav.onKeyDown(event);
      }}
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
