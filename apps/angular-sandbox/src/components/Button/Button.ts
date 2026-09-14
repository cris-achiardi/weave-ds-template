// GENERATED from Button.contract.json + Button.angular.json. Do not edit by hand.
// Regenerate: node packages/angular/src/emit/emit.mjs Button --out <dir>
//
// Runs an action when chosen. It is the only component here that does something rather than holding something — nothing about a button's own state survives the click.

import { Component, ViewEncapsulation, input } from '@angular/core';

@Component({
  // The binding's `element` becomes a SELECTOR, because an Angular component attaches
  // to an element rather than rendering one. A consumer writes <button dsButton>.
  selector: 'button[dsButton]',
  exportAs: 'dsButton',
  // ViewEncapsulation.None IS LOAD-BEARING. Angular's default rewrites every selector in
  // these stylesheets to include a generated _ngcontent attribute, which would scope them
  // to this component and break the one property the whole system rests on: that a theme
  // file selecting on [data-ds-component] dresses the React, Vue and Angular builds
  // alike. It fails silently — the CSS loads, matches nothing, and the component renders
  // unstyled.
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['./Button.structure.css', './Button.theme.css'],
  host: {
    type: 'button',
    '[attr.disabled]': 'disabled() || null',
    '[attr.data-ds-state-loading]': 'loading() || null',
    '[attr.data-ds-hierarchy]': 'hierarchy()',
    '[attr.data-ds-variant]': 'variant()',
    '[attr.data-ds-size]': 'size()',
    'data-ds-component': 'Button',
    'data-ds-part': 'root',
  },
  template: `
    <div data-ds-part="icon-start">
      <ng-content select="[slot=iconStart]" />
    </div>
    <div data-ds-part="label">
      <ng-content />
    </div>
    <div data-ds-part="icon-end">
      <ng-content select="[slot=iconEnd]" />
    </div>
  `,
})
export class Button {
  /** The platform's own disabled state. Removed from the focus order and cannot be activated. */
  readonly disabled = input<boolean>(false);
  /** The action is already running. The implementation must track this: no platform provides it. */
  readonly loading = input<boolean>(false);
  /** How much emphasis this action carries relative to the others around it. The rank of the action, not its colour — a page should hold one primary action, and everything else ranks below it. Defaults to `secondary` rather than the canon's `primary`, because the common case is not the page's most important action and a default of `primary` makes every unconsidered button shout. Defaults to `secondary`. */
  readonly hierarchy = input<'primary' | 'secondary' | 'tertiary'>('secondary');
  /** What kind of action this is, which selects the colour role. Orthogonal to `hierarchy`: a secondary destructive action is `hierarchy: secondary` and `variant: danger`, and collapsing the two axes would make that unsayable. `success` and `warning` are in the canon and deliberately not taken — an action is not a status. Defaults to `neutral`. */
  readonly variant = input<'neutral' | 'brand' | 'danger'>('neutral');
  /** A contiguous subset of the canon's ladder. `xs` and `xl` are not designed for actions. Defaults to `m`. */
  readonly size = input<'s' | 'm' | 'l'>('m');
}
