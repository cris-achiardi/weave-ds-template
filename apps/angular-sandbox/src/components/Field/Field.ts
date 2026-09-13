// GENERATED from Field.contract.json + Field.angular.json. Do not edit by hand.
// Regenerate: node packages/angular/src/emit/emit.mjs Field --out <dir>
//
// Wires a form control to its label, its help text and its error message, so the three are announced together and the control's validity has one place to live. It is the plumbing around an input, never the input.

import { Component, ViewEncapsulation, input, model } from '@angular/core';

// Angular has no useId. React does and Vue 3.5 does; this counter is the emitter's
// own invention, and it is wrong under server rendering with hydration — which
// nothing in this repo exercises. Recorded rather than solved.
let nextId = 0;

@Component({
  // The binding's `element` becomes a SELECTOR, because an Angular component attaches
  // to an element rather than rendering one. A consumer writes <div dsField>.
  selector: 'div[dsField]',
  exportAs: 'dsField',
  // ViewEncapsulation.None IS LOAD-BEARING. Angular's default rewrites every selector in
  // these stylesheets to include a generated _ngcontent attribute, which would scope them
  // to this component and break the one property the whole system rests on: that a theme
  // file selecting on [data-ds-component] dresses the React, Vue and Angular builds
  // alike. It fails silently — the CSS loads, matches nothing, and the component renders
  // unstyled.
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['./Field.structure.css', './Field.theme.css'],
  host: {
    '[attr.id]': 'baseId',
    '[attr.aria-disabled]': 'disabled() || null',
    '[attr.data-ds-state-invalid]': 'invalid() || null',
    '[attr.data-ds-state-touched]': 'touched() || null',
    '[attr.data-ds-state-dirty]': 'dirty() || null',
    'data-ds-component': 'Field',
    'data-ds-part': 'root',
  },
  template: `
    <div [attr.id]="baseId + '-label'" data-ds-part="label">
      <ng-content select="[slot=label]" />
    </div>
    <div
      [attr.id]="baseId + '-control'"
      [attr.aria-labelledby]="baseId + '-label'"
      [attr.aria-describedby]="ids(baseId + '-description', invalid() ? baseId + '-error' : null)"
      data-ds-part="control"
    >
      <ng-content select="[slot=control]" />
    </div>
    <div [attr.id]="baseId + '-description'" data-ds-part="description">
      <ng-content select="[slot=description]" />
    </div>
    <div [attr.id]="baseId + '-error'" [attr.hidden]="invalid() ? null : ''" data-ds-part="error">
      <ng-content select="[slot=error]" />
    </div>
    <ng-content />
  `,
})
export class Field {
  /** The control ignores interaction. Set on the field so the label and description can dim with it. */
  readonly disabled = input<boolean>(false);
  /** Validation has run and failed. Reaches assistive technology as aria-invalid and shows the error. Two-way: `[(invalid)]`. */
  readonly invalid = model<boolean>(false);
  /** The control has been focused and then blurred at least once. Gates WHEN an error is allowed to show. Two-way: `[(touched)]`. */
  readonly touched = model<boolean>(false);
  /** The value differs from the value the field started with. Gates validation timing and enables a reset affordance. Two-way: `[(dirty)]`. */
  readonly dirty = model<boolean>(false);

  readonly baseId = 'ds-field-' + nextId++;

  /**
   * Join the ids that are present, or null.
   *
   * A METHOD, because the inline form the other two emitters write —
   * `[a, b].filter(Boolean).join(' ') || null` — cannot work in an Angular template.
   * Template expressions see only members of this class, so `Boolean` is undefined and
   * `.filter(undefined)` throws DURING CHANGE DETECTION, which aborts the whole pass:
   * every other component on the page stops updating and nothing says why.
   */
  protected ids(...parts: (string | null)[]): string | null {
    return parts.filter(Boolean).join(' ') || null;
  }
}
