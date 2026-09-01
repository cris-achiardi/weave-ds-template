// GENERATED from Tooltip.contract.json + Tooltip.react.json. Do not edit by hand.
// Regenerate: node packages/react/src/emit/emit.mjs Tooltip --out <dir>
//
// Shows a short label for a control whose own presentation cannot carry it — an icon button, a truncated name — on hover and on focus, without taking focus itself.

import { forwardRef, useId, useState } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import './Tooltip.structure.css';
import './Tooltip.theme.css';

export interface TooltipProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'open' | 'defaultOpen' | 'onOpenChange' | 'disabled' | 'trigger' | 'content'
> {
  /** The tooltip is showing. A consumer may control it; hover and focus on the trigger also change it. Controlled. */
  open?: boolean;
  /** Initial value when uncontrolled. */
  defaultOpen?: boolean;
  /** Called when it changes, controlled or not. */
  onOpenChange?: (open: boolean) => void;
  /** The tooltip never opens. The trigger still works. */
  disabled?: boolean;
  /** The control the tooltip describes. Fills the `trigger` part. */
  trigger: ReactNode;
  /** The label itself. Text only — anything interactive would be unreachable. Fills the `popup` part. */
  content: ReactNode;
}

export const Tooltip = forwardRef<HTMLDivElement, TooltipProps>(function Tooltip(
  {
    open,
    defaultOpen = false,
    onOpenChange,
    disabled,
    trigger,
    content,
    children,
    className,
    ...rest
  },
  ref,
) {
  const baseId = useId();

  const openControlled = open !== undefined;
  const [openInternal, setOpenInternal] = useState(defaultOpen);
  const openValue = openControlled ? open : openInternal;
  // Nothing in the contract says what CHANGES `open`: no part declares
  // `activates`. It works when controlled from outside; uncontrolled it cannot move.
  void setOpenInternal;

  return (
    <div
      {...rest}
      ref={ref}
      id={baseId}
      data-ds-state-open={openValue || undefined}
      aria-disabled={disabled || undefined}
      data-ds-component="Tooltip"
      data-ds-part="root"
      className={className}
    >
      <div
        id={`${baseId}-trigger`}
        aria-describedby={
          [openValue ? `${baseId}-popup` : null].filter(Boolean).join(' ') || undefined
        }
        data-ds-part="trigger"
      >
        {trigger}
      </div>
      <div role="tooltip" id={`${baseId}-popup`} hidden={!openValue} data-ds-part="popup">
        {content}
      </div>
      {children}
    </div>
  );
});
