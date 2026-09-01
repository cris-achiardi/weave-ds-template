// GENERATED from RadioItem.contract.json + RadioItem.react.json. Do not edit by hand.
// Regenerate: node packages/react/src/emit/emit.mjs RadioItem --out <dir>
//
// One option in a radio group: a label that becomes the group's answer when chosen. It carries its own identity and its own disabled state, and nothing else — whether it is chosen is a comparison, not a property it holds.

import { forwardRef, useCallback, useContext } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { RadioGroupContext } from '../RadioGroup/RadioGroup';
import './RadioItem.structure.css';
import './RadioItem.theme.css';

export interface RadioItemProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'disabled' | 'value' | 'label'
> {
  /** Set by the `disabled` prop or inherited from the group. Skipped by arrow-key movement. */
  disabled?: boolean;
  /** Distinguishes this RadioItem from its siblings. The ancestor RadioGroup compares against it to decide whether this one is in the selection. */
  value: string;
  /** The option's name. Fills the `label` part. */
  label: ReactNode;
}

export const RadioItem = forwardRef<HTMLDivElement, RadioItemProps>(function RadioItem(
  { disabled, value, label, children, className, ...rest },
  ref,
) {
  const ctx = useContext(RadioGroupContext);
  if (!ctx) {
    throw new Error(
      'RadioItem must be rendered inside a RadioGroup. There is no selection to compare against, and looking unselected would hide the mistake.',
    );
  }
  const selected = ctx.selection === value;

  const activate = useCallback(() => {
    if (disabled || ctx.disabled) return;
    ctx.toggle(value);
  }, [ctx, value, disabled]);

  return (
    <div
      {...rest}
      ref={ref}
      role="radio"
      aria-disabled={disabled || undefined}
      aria-checked={selected}
      tabIndex={disabled || ctx.disabled ? -1 : 0}
      onClick={activate}
      data-ds-component="RadioItem"
      data-ds-part="root"
      className={className}
    >
      <div data-ds-part="control">
        <div hidden={!selected} data-ds-part="mark" />
      </div>
      <div data-ds-part="label">{label}</div>
      {children}
    </div>
  );
});
