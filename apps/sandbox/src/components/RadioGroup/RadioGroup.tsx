// GENERATED from RadioGroup.contract.json + RadioGroup.react.json. Do not edit by hand.
// Regenerate: node packages/react/src/emit/emit.mjs RadioGroup --out <dir>
//
// Holds one choice from a small set of mutually exclusive options, all visible at once. It exists so the chosen option has exactly one home: the items compare against it rather than each holding a copy.

import { forwardRef, useId, useState, useCallback, createContext, useMemo } from 'react';
import type { HTMLAttributes } from 'react';
import {
  useLinearNavigation,
  type MemberRegistration,
  type NavigationOptions,
} from '@ds/react/behavior';
import './RadioGroup.structure.css';
import './RadioGroup.theme.css';

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
  'disabled' | 'readOnly' | 'value' | 'defaultValue' | 'onValueChange'
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
}

export const RadioGroup = forwardRef<HTMLDivElement, RadioGroupProps>(function RadioGroup(
  { disabled, readOnly, value, defaultValue = '', onValueChange, children, className, ...rest },
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
    </div>
  );
});
