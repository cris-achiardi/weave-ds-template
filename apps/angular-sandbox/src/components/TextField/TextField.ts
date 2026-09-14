// GENERATED from TextField.contract.json + TextField.angular.json. Do not edit by hand.
// Regenerate: node packages/angular/src/emit/emit.mjs TextField --out <dir>
//
// Collects a single line of text from a person. It is the control itself, where Field is the plumbing around a control — the two compose, and neither does the other's job.

import { Component, ViewEncapsulation, input, model } from '@angular/core';

@Component({
  // The binding's `element` becomes a SELECTOR, because an Angular component attaches
  // to an element rather than rendering one. A consumer writes <input dsTextField>.
  selector: 'input[dsTextField]',
  exportAs: 'dsTextField',
  // ViewEncapsulation.None IS LOAD-BEARING. Angular's default rewrites every selector in
  // these stylesheets to include a generated _ngcontent attribute, which would scope them
  // to this component and break the one property the whole system rests on: that a theme
  // file selecting on [data-ds-component] dresses the React, Vue and Angular builds
  // alike. It fails silently — the CSS loads, matches nothing, and the component renders
  // unstyled.
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['./TextField.structure.css', './TextField.theme.css'],
  host: {
    '[attr.disabled]': 'disabled() || null',
    '[attr.aria-readonly]': 'readOnly() || null',
    '[attr.aria-invalid]': 'invalid() || null',
    '[attr.data-ds-size]': 'size()',
    '[value]': 'value()',
    '[attr.readonly]': 'readOnly() || null',
    'data-ds-component': 'TextField',
    'data-ds-part': 'root',
    '(input)': 'handleInput($event)',
  },
  // A void element has no content model, so there is no template at all.
  template: '',
})
export class TextField {
  /** The platform's own disabled state. Removed from the focus order and cannot be typed into. */
  readonly disabled = input<boolean>(false);
  /** The text can be read and selected but not changed. Distinct from disabled, which removes it from the focus order. */
  readonly readOnly = input<boolean>(false);
  /** Set from outside — usually by a surrounding Field. This component does not decide it. */
  readonly invalid = input<boolean>(false);
  /** A contiguous subset of the canon's ladder. Defaults to `m`. */
  readonly size = input<'s' | 'm' | 'l'>('m');
  /** The text itself. Free-form: not a boolean, and not one of a fixed set — which is what makes this the first state in the library that `values` cannot describe. Two-way: `[(value)]`. */
  readonly value = model<string>('');

  protected handleInput(event: Event): void {
    this.value.set((event.target as HTMLInputElement).value);
  }
}
