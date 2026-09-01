// GENERATED from Accordion.contract.json + Accordion.react.json. Do not edit by hand.
// Regenerate: node packages/react/src/emit/emit.mjs Accordion --out <dir>
//
// Holds which of a set of sections are expanded, and lets a reader open one without losing the list of the others. It exists so that the open set has exactly one home rather than each section holding its own copy.

import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import './Accordion.structure.css';
import './Accordion.theme.css';

export interface AccordionProps extends Omit<HTMLAttributes<HTMLDivElement>, 'disabled'> {
  /** The whole accordion ignores interaction. Cascades to every item. */
  disabled?: boolean;
}

export const Accordion = forwardRef<HTMLDivElement, AccordionProps>(function Accordion(
  { disabled, children, className, ...rest },
  ref,
) {
  return (
    <div
      {...rest}
      ref={ref}
      aria-disabled={disabled || undefined}
      data-ds-component="Accordion"
      data-ds-part="root"
      className={className}
    >
      {children}
    </div>
  );
});
