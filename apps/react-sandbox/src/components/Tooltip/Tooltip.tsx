// GENERATED from Tooltip.contract.json + Tooltip.react.json. Do not edit by hand.
// Regenerate: node packages/react/src/emit/emit.mjs Tooltip --out <dir>
//
// Shows a short label for a control whose own presentation cannot carry it — an icon button, a truncated name — on hover and on focus, without taking focus itself.

import { forwardRef, useId, useState, useCallback } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { useDismissal, type DismissalOptions } from '@ds/react/behavior';
import './Tooltip.structure.css';
import './Tooltip.theme.css';

// Transcribed from Tooltip.contract.json > dismisses. The cases this commits us to
// are in @ds/contracts/conformance/dismissal.json.
const DISMISSAL: DismissalOptions = {
  on: ['escape'],
};

export interface TooltipProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'open' | 'defaultOpen' | 'onOpenChange' | 'disabled' | 'placement' | 'trigger' | 'content'
> {
  /** The tooltip is showing. A consumer may control it; hover and focus on the trigger also change it. Controlled. */
  open?: boolean;
  /** Initial value when uncontrolled. */
  defaultOpen?: boolean;
  /** Called when it changes, controlled or not. */
  onOpenChange?: (open: boolean) => void;
  /** The tooltip never opens. The trigger still works. */
  disabled?: boolean;
  /** The PREFERRED side. A tooltip may be moved elsewhere when there is not room, so this is a request rather than a guarantee — a distinction the axis mechanism cannot express. Defaults to `top`. */
  placement?:
    'top' | 'top-start' | 'top-end' | 'bottom' | 'bottom-start' | 'bottom-end' | 'left' | 'right';
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
    placement = 'top',
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

  const dismissOpen = useCallback(() => {
    if (!openControlled) setOpenInternal(false);
    onOpenChange?.(false);
  }, [openControlled, onOpenChange]);

  const dismissal = useDismissal(DISMISSAL, openValue, dismissOpen);

  return (
    <div
      {...rest}
      ref={ref}
      id={baseId}
      data-ds-state-open={openValue || undefined}
      aria-disabled={disabled || undefined}
      data-ds-placement={placement}
      onKeyDown={(event) => {
        rest.onKeyDown?.(event);
        dismissal.onKeyDown(event);
      }}
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
