// GENERATED from Accordion.contract.json + Accordion.react.json. Do not edit by hand.
// Regenerate: node packages/react/src/emit/emit.mjs Accordion --out <dir>
//
// Holds which of a set of sections are expanded, and lets a reader open one without losing the list of the others. It exists so that the open set has exactly one home rather than each section holding its own copy.

import { forwardRef, useId, useState, useCallback, createContext, useMemo } from 'react';
import type { HTMLAttributes } from 'react';
import './Accordion.structure.css';
import './Accordion.theme.css';

export interface AccordionContextValue {
  /** The current selection, by member value. */
  selection: string[];
  /** Called by a member when it is activated. */
  toggle: (value: string) => void;
  /** Shared id root, so a member's parts can reference one another. */
  baseId: string;
  /** True when the whole collection is disabled. */
  disabled: boolean;
}

export const AccordionContext = createContext<AccordionContextValue | null>(null);

export interface AccordionProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'disabled' | 'orientation' | 'value' | 'defaultValue' | 'onValueChange'
> {
  /** The whole accordion ignores interaction. Cascades to every item. */
  disabled?: boolean;
  /** Only vertical is designed. Recorded as an axis with one value rather than omitted, because the horizontal case exists in the canon and this component deliberately does not take it. Defaults to `vertical`. */
  orientation?: 'vertical';
  /** The current selection. Controlled. */
  value?: string[];
  /** Initial value when uncontrolled. */
  defaultValue?: string[];
  /** Called when it changes, controlled or not. */
  onValueChange?: (value: string[]) => void;
}

export const Accordion = forwardRef<HTMLDivElement, AccordionProps>(function Accordion(
  {
    disabled,
    orientation = 'vertical',
    value,
    defaultValue = [],
    onValueChange,
    children,
    className,
    ...rest
  },
  ref,
) {
  const baseId = useId();

  const valueControlled = value !== undefined;
  const [valueInternal, setValueInternal] = useState(defaultValue);
  const selection = valueControlled ? value : valueInternal;

  const toggle = useCallback(
    (value: string) => {
      const next = selection.includes(value)
        ? selection.filter((v) => v !== value)
        : [...selection, value];
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
      data-ds-orientation={orientation}
      data-ds-component="Accordion"
      data-ds-part="root"
      className={className}
    >
      <AccordionContext.Provider value={contextValue}>{children}</AccordionContext.Provider>
    </div>
  );
});
