// GENERATED from Checkbox.contract.json + Checkbox.angular.json. Do not edit by hand.
// Regenerate: node packages/angular/src/emit/emit.mjs Checkbox --out <dir>
//
// Records a yes/no answer that is collected rather than acted on immediately, and can additionally report that a set of answers below it is partly yes.

import { Component, ViewEncapsulation, input, model } from '@angular/core';

@Component({
  // The binding's `element` becomes a SELECTOR, because an Angular component attaches
  // to an element rather than rendering one. A consumer writes <button dsCheckbox>.
  selector: 'button[dsCheckbox]',
  exportAs: 'dsCheckbox',
  // ViewEncapsulation.None IS LOAD-BEARING. Angular's default rewrites every selector in
  // these stylesheets to include a generated _ngcontent attribute, which would scope them
  // to this component and break the one property the whole system rests on: that a theme
  // file selecting on [data-ds-component] dresses the React, Vue and Angular builds
  // alike. It fails silently — the CSS loads, matches nothing, and the component renders
  // unstyled.
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['./Checkbox.structure.css', './Checkbox.theme.css'],
  host: {
    type: 'button',
    '[attr.role]': "'checkbox'",
    '[attr.aria-checked]':
      "checked() === 'unchecked' ? 'false' : checked() === 'checked' ? 'true' : checked() === 'mixed' ? 'mixed' : null",
    '[attr.disabled]': 'disabled() || null',
    '[attr.aria-invalid]': 'invalid() || null',
    'data-ds-component': 'Checkbox',
    'data-ds-part': 'root',
    '(click)': 'activate($event)',
  },
  template: `
    <div data-ds-part="box">
      <div [attr.hidden]="checked() === 'checked' ? null : ''" data-ds-part="tick"></div>
      <div [attr.hidden]="checked() === 'mixed' ? null : ''" data-ds-part="dash"></div>
    </div>
    <div data-ds-part="label">
      <ng-content select="[slot=label]" />
    </div>
    <ng-content />
  `,
})
export class Checkbox {
  /** The platform's own disabled state. Removed from the focus order and cannot be answered. */
  readonly disabled = input<boolean>(false);
  /** The answer failed validation — typically a required checkbox left unchecked. */
  readonly invalid = input<boolean>(false);
  /** The answer. Three values, not two: `mixed` reports that a set of checkboxes below this one is partly checked, and is set by the implementation rather than chosen by a user. Two-way: `[(checked)]`. */
  readonly checked = model<'unchecked' | 'checked' | 'mixed'>('unchecked');

  protected activate(event?: { defaultPrevented: boolean }): void {
    // Guards, because this runs on a CLICK and the platform guards there too: calling
    // preventDefault() in a click handler is what cancels a native checkbox's toggle.
    if (event?.defaultPrevented) return;
    if (this.disabled()) return;
    this.checked.set(this.checked() === 'checked' ? 'unchecked' : 'checked');
  }
}
