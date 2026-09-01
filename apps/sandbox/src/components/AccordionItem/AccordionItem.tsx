// GENERATED from AccordionItem.contract.json + AccordionItem.react.json. Do not edit by hand.
// Regenerate: node packages/react/src/emit/emit.mjs AccordionItem --out <dir>
//
// One section of an accordion: a heading that reveals a panel when chosen. It carries its own identity and its own disabled state, and nothing else — whether it is open is a comparison against the surrounding Accordion, not a property it holds.

import { forwardRef, useCallback, useContext } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { AccordionContext } from '../Accordion/Accordion';
import './AccordionItem.structure.css';
import './AccordionItem.theme.css';

export interface AccordionItemProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'disabled' | 'value' | 'heading' | 'panel'
> {
  /** Set by the `disabled` prop or inherited from the Accordion. Rendered as a natively disabled button. */
  disabled?: boolean;
  /** Distinguishes this AccordionItem from its siblings. The ancestor Accordion compares against it to decide whether this one is in the selection. */
  value: string;
  /** The section's name, rendered inside the trigger. Fills the `trigger` part. */
  heading: ReactNode;
  /** The revealed content. Anything. Fills the `panel` part. */
  panel: ReactNode;
}

export const AccordionItem = forwardRef<HTMLDivElement, AccordionItemProps>(function AccordionItem(
  { disabled, value, heading, panel, children, className, ...rest },
  ref,
) {
  const ctx = useContext(AccordionContext);
  if (!ctx) {
    throw new Error(
      'AccordionItem must be rendered inside a Accordion. There is no selection to compare against, and looking unselected would hide the mistake.',
    );
  }
  const selected = ctx.selection.includes(value);
  const baseId = `${ctx.baseId}-${value}`;

  const activate = useCallback(() => {
    if (disabled || ctx.disabled) return;
    ctx.toggle(value);
  }, [ctx, value, disabled]);

  return (
    <div
      {...rest}
      ref={ref}
      aria-disabled={disabled || undefined}
      data-ds-component="AccordionItem"
      data-ds-part="root"
      className={className}
    >
      <div data-ds-part="header">
        <button
          id={`${baseId}-trigger`}
          aria-controls={`${baseId}-panel`}
          onClick={activate}
          type="button"
          disabled={disabled || ctx.disabled}
          aria-expanded={selected}
          data-ds-part="trigger"
        >
          {heading}
          <div data-ds-part="indicator" />
        </button>
      </div>
      <div
        role="region"
        id={`${baseId}-panel`}
        aria-labelledby={`${baseId}-trigger`}
        hidden={!selected}
        data-ds-part="panel"
      >
        {panel}
      </div>
      {children}
    </div>
  );
});
