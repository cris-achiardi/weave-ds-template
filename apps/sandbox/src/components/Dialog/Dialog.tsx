// GENERATED from Dialog.contract.json + Dialog.react.json. Do not edit by hand.
// Regenerate: node packages/react/src/emit/emit.mjs Dialog --out <dir>
//
// Interrupts what a person was doing to ask for something that cannot wait, and refuses to let them continue until they answer or leave.

import { forwardRef, useId, useState } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import './Dialog.structure.css';
import './Dialog.theme.css';

export interface DialogProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'open' | 'defaultOpen' | 'onOpenChange' | 'size' | 'title' | 'body' | 'actions'
> {
  /** The dialog is showing and holding focus. Controlled. */
  open?: boolean;
  /** Initial value when uncontrolled. */
  defaultOpen?: boolean;
  /** Called when it changes, controlled or not. */
  onOpenChange?: (open: boolean) => void;
  /** How wide the panel is. A contiguous subset of the canon's ladder. Defaults to `m`. */
  size?: 's' | 'm' | 'l';
  /** What the dialog is asking about. Required: it is the dialog's accessible name. */
  title: ReactNode;
  /** The content. Fills the `body` part. */
  body: ReactNode;
  /** The buttons that resolve it. Fills the `actions` part. */
  actions?: ReactNode;
}

export const Dialog = forwardRef<HTMLDivElement, DialogProps>(function Dialog(
  {
    open,
    defaultOpen = false,
    onOpenChange,
    size = 'm',
    title,
    body,
    actions,
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
      data-ds-size={size}
      hidden={!openValue}
      data-ds-component="Dialog"
      data-ds-part="root"
      className={className}
    >
      <div
        role="dialog"
        id={`${baseId}-panel`}
        aria-labelledby={`${baseId}-title`}
        data-ds-part="panel"
      >
        <div data-ds-part="title">{title}</div>
        <div data-ds-part="body">{body}</div>
        <div data-ds-part="actions">{actions}</div>
      </div>
      {children}
    </div>
  );
});
