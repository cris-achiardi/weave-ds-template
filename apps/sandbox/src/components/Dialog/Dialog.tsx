// GENERATED from Dialog.contract.json + Dialog.react.json. Do not edit by hand.
// Regenerate: node packages/react/src/emit/emit.mjs Dialog --out <dir>
//
// Interrupts what a person was doing to ask for something that cannot wait, and refuses to let them continue until they answer or leave.

import { forwardRef, useId, useState, useCallback, useEffect, useRef } from 'react';
import type { DialogHTMLAttributes, ReactNode } from 'react';
import './Dialog.structure.css';
import './Dialog.theme.css';

export interface DialogProps extends Omit<
  DialogHTMLAttributes<HTMLDialogElement>,
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

export const Dialog = forwardRef<HTMLDialogElement, DialogProps>(function Dialog(
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

  // A <dialog> is opened by CALLING showModal(), never by rendering an attribute:
  // React would set `open` on the first render and showModal() then throws
  // InvalidStateError. So the element is held by a ref and driven after commit.
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const node = dialogRef.current;
    if (!node) return;
    // `open` reflects showModal() having been called, so it is also the guard against
    // calling it twice — which throws in Safari 16 and is merely wasteful after.
    if (openValue && !node.open) node.showModal();
    else if (!openValue && node.open) node.close();
  }, [openValue]);

  const setDialogRef = useCallback(
    (node: HTMLDialogElement | null) => {
      dialogRef.current = node;
      // The consumer's ref still has to land, and for a dialog it is the one way to
      // reach showModal() from outside.
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  // The dialog closes ITSELF on Escape, so this component is no longer the only
  // writer of its own state. Without this the platform would hide the element while
  // `open` stayed true, and the next open would be a no-op.
  const handleClose = useCallback(() => {
    if (!openControlled) setOpenInternal(false);
    onOpenChange?.(false);
  }, [openControlled, onOpenChange]);

  // Synced from the ELEMENT's own `open` attribute, not from a `close` event.
  //
  // Measured, not assumed: `close` did not fire in Chrome 153 — not through React's
  // `onClose` prop, not through addEventListener, and not through the `onclose`
  // property, on this element or on a bare probe dialog. a11y-dialog documents the
  // same unreliability. Observing the attribute reads what is TRUE rather than
  // trusting a notification, and it catches every way the platform can close this
  // element behind the component's back: Escape, `closedby`, a form submitted with
  // method="dialog".
  //
  // Getting this wrong is not a cosmetic desync. Once `open` says open and the
  // element says closed, the next open is a no-op and the dialog can never be
  // shown again.
  useEffect(() => {
    const node = dialogRef.current;
    if (!node) return;
    const observer = new MutationObserver(() => {
      if (!node.open) handleClose();
    });
    observer.observe(node, { attributes: true, attributeFilter: ['open'] });
    return () => observer.disconnect();
  }, [handleClose]);

  return (
    <dialog
      {...rest}
      ref={setDialogRef}
      id={baseId}
      data-ds-state-open={openValue || undefined}
      data-ds-size={size}
      aria-labelledby={`${baseId}-title`}
      data-ds-component="Dialog"
      data-ds-part="root"
      className={className}
    >
      <div id={`${baseId}-title`} data-ds-part="title">
        {title}
      </div>
      <div data-ds-part="body">{body}</div>
      <div data-ds-part="actions">{actions}</div>
      {children}
    </dialog>
  );
});
