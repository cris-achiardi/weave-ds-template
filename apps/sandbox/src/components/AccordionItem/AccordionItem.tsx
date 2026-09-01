// GENERATED from AccordionItem.contract.json + AccordionItem.react.json. Do not edit by hand.
// Regenerate: node packages/react/src/emit/emit.mjs AccordionItem --out <dir>
//
// One section of an accordion: a heading that reveals a panel when chosen. It carries its own identity and its own disabled state, and nothing else — whether it is open is a comparison against the surrounding Accordion, not a property it holds.

import { forwardRef } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import './AccordionItem.structure.css';
import './AccordionItem.theme.css';

export interface AccordionItemProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'disabled' | 'heading' | 'panel'
> {
  /** Set by the `disabled` prop or inherited from the Accordion. Rendered as a natively disabled button. */
  disabled?: boolean;
  /** The section's name, rendered inside the trigger. */
  heading: ReactNode;
  /** The revealed content. Anything. */
  panel: ReactNode;
}

export const AccordionItem = forwardRef<HTMLDivElement, AccordionItemProps>(function AccordionItem(
  { disabled, heading, panel, children, className, ...rest },
  ref,
) {
  return (
    <div
      {...rest}
      ref={ref}
      role="button"
      aria-disabled={disabled || undefined}
      data-ds-component="AccordionItem"
      data-ds-part="root"
      className={className}
    >
      <span data-ds-part="header" />
      <span data-ds-part="trigger" />
      <span data-ds-part="panel">{panel}</span>
      {heading}
      {children}
    </div>
  );
});
