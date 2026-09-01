// GENERATED from RadioGroup.contract.json + RadioGroup.react.json. Do not edit by hand.
// Regenerate: node packages/react/src/emit/emit.mjs RadioGroup --out <dir>
//
// Holds one choice from a small set of mutually exclusive options, all visible at once. It exists so the chosen option has exactly one home: the items compare against it rather than each holding a copy.

import { forwardRef, useId, useState, useCallback, createContext, useMemo } from 'react';
import type { HTMLAttributes } from 'react';
import './RadioGroup.structure.css';
import './RadioGroup.theme.css';

export interface RadioGroupContextValue {
  /** The current selection, by member value. */
  selection: string;
  /** Called by a member when it is activated. */
  toggle: (value: string) => void;
  /** Shared id root, so a member's parts can reference one another. */
  baseId: string;
  /** True when the whole collection is disabled. */
  disabled: boolean;
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

  const contextValue = useMemo(
    () => ({ selection, toggle, baseId, disabled: disabled ?? false }),
    [selection, toggle, baseId, disabled],
  );

  return (
    <div
      {...rest}
      ref={ref}
      role="radiogroup"
      id={baseId}
      aria-disabled={disabled || undefined}
      aria-readonly={readOnly || undefined}
      data-ds-component="RadioGroup"
      data-ds-part="root"
      className={className}
    >
      <RadioGroupContext.Provider value={contextValue}>{children}</RadioGroupContext.Provider>
    </div>
  );
});
