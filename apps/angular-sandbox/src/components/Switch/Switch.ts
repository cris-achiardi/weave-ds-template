// GENERATED from Switch.contract.json + Switch.angular.json. Do not edit by hand.
// Regenerate: node packages/angular/src/emit/emit.mjs Switch --out <dir>
//
// A binary on/off control that takes effect immediately, for a setting whose two states both make sense on their own — not a value collected and submitted later.

import { Component, ViewEncapsulation, input, model } from '@angular/core';

@Component({
  // The binding's `element` becomes a SELECTOR, because an Angular component attaches
  // to an element rather than rendering one. A consumer writes <button dsSwitch>.
  selector: 'button[dsSwitch]',
  exportAs: 'dsSwitch',
  // ViewEncapsulation.None IS LOAD-BEARING. Angular's default rewrites every selector in
  // these stylesheets to include a generated _ngcontent attribute, which would scope them
  // to this component and break the one property the whole system rests on: that a theme
  // file selecting on [data-ds-component] dresses the React, Vue and Angular builds
  // alike. It fails silently — the CSS loads, matches nothing, and the component renders
  // unstyled.
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['./Switch.structure.css', './Switch.theme.css'],
  host: {
    type: 'button',
    '[attr.role]': "'switch'",
    '[attr.aria-checked]': 'checked()',
    '[attr.disabled]': 'disabled() || null',
    '[attr.aria-readonly]': 'readOnly() || null',
    'data-ds-component': 'Switch',
    'data-ds-part': 'root',
    '(click)': 'activate($event)',
  },
  template: ` <div data-ds-part="thumb"></div> `,
})
export class Switch {
  /** The platform's own disabled state. Removed from the focus order and cannot be toggled. */
  readonly disabled = input<boolean>(false);
  /** Cannot be toggled, but remains focusable and readable. Distinct from disabled, which removes it from the focus order entirely. */
  readonly readOnly = input<boolean>(false);
  /** The switch is on. Tracked by the implementation and reflected to assistive technology. Two-way: `[(checked)]`. */
  readonly checked = model<boolean>(false);

  protected activate(event?: { defaultPrevented: boolean }): void {
    // Guards, because this runs on a CLICK and the platform guards there too: calling
    // preventDefault() in a click handler is what cancels a native checkbox's toggle.
    if (event?.defaultPrevented) return;
    if (this.disabled() || this.readOnly()) return;
    this.checked.set(!this.checked());
  }
}
