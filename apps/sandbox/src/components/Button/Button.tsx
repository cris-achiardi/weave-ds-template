// GENERATED from Button.contract.json + Button.react.json. Do not edit by hand.
// Regenerate: node packages/react/src/emit/emit.mjs Button --out <dir>
//
// Runs an action when chosen. It is the only component here that does something rather than holding something — nothing about a button's own state survives the click.

import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import './Button.structure.css';
import './Button.theme.css';

export interface ButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'disabled' | 'loading' | 'hierarchy' | 'variant' | 'size' | 'iconStart' | 'iconEnd'
> {
  /** The platform's own disabled state. Removed from the focus order and cannot be activated. */
  disabled?: boolean;
  /** The action is already running. The implementation must track this: no platform provides it. */
  loading?: boolean;
  /** How much emphasis this action carries relative to the others around it. The rank of the action, not its colour — a page should hold one primary action, and everything else ranks below it. Defaults to `secondary` rather than the canon's `primary`, because the common case is not the page's most important action and a default of `primary` makes every unconsidered button shout. Defaults to `secondary`. */
  hierarchy?: 'primary' | 'secondary' | 'tertiary';
  /** What kind of action this is, which selects the colour role. Orthogonal to `hierarchy`: a secondary destructive action is `hierarchy: secondary` and `variant: danger`, and collapsing the two axes would make that unsayable. `success` and `warning` are in the canon and deliberately not taken — an action is not a status. Defaults to `neutral`. */
  variant?: 'neutral' | 'brand' | 'danger';
  /** A contiguous subset of the canon's ladder. `xs` and `xl` are not designed for actions. Defaults to `m`. */
  size?: 's' | 'm' | 'l';
  /** An icon before the label. Decorative: the label carries the meaning. */
  iconStart?: ReactNode;
  /** An icon after the label, for an action that leads somewhere — a disclosure caret, an external-link mark. */
  iconEnd?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    disabled,
    loading,
    hierarchy = 'secondary',
    variant = 'neutral',
    size = 'm',
    iconStart,
    iconEnd,
    children,
    className,
    ...rest
  },
  ref,
) {
  return (
    <button
      {...rest}
      ref={ref}
      type="button"
      disabled={disabled}
      data-ds-state-loading={loading || undefined}
      data-ds-hierarchy={hierarchy}
      data-ds-variant={variant}
      data-ds-size={size}
      data-ds-component="Button"
      data-ds-part="root"
      className={className}
    >
      <div data-ds-part="icon-start">{iconStart}</div>
      <div data-ds-part="label">{children}</div>
      <div data-ds-part="icon-end">{iconEnd}</div>
    </button>
  );
});
