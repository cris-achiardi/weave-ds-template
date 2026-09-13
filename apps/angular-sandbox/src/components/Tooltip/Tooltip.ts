// GENERATED from Tooltip.contract.json + Tooltip.angular.json. Do not edit by hand.
// Regenerate: node packages/angular/src/emit/emit.mjs Tooltip --out <dir>
//
// Shows a short label for a control whose own presentation cannot carry it — an icon button, a truncated name — on hover and on focus, without taking focus itself.

import { Component, ViewEncapsulation, input, model } from '@angular/core';
import { useDismissal } from '@ds/angular/behavior';
import type { DismissalOptions } from '@ds/angular/behavior';

// Transcribed from Tooltip.contract.json > dismisses. The cases this commits us to
// are in @ds/contracts/conformance/dismissal.json.
const DISMISSAL: DismissalOptions = {
  on: ['escape'],
};

// Angular has no useId. React does and Vue 3.5 does; this counter is the emitter's
// own invention, and it is wrong under server rendering with hydration — which
// nothing in this repo exercises. Recorded rather than solved.
let nextId = 0;

@Component({
  // The binding's `element` becomes a SELECTOR, because an Angular component attaches
  // to an element rather than rendering one. A consumer writes <div dsTooltip>.
  selector: 'div[dsTooltip]',
  exportAs: 'dsTooltip',
  // ViewEncapsulation.None IS LOAD-BEARING. Angular's default rewrites every selector in
  // these stylesheets to include a generated _ngcontent attribute, which would scope them
  // to this component and break the one property the whole system rests on: that a theme
  // file selecting on [data-ds-component] dresses the React, Vue and Angular builds
  // alike. It fails silently — the CSS loads, matches nothing, and the component renders
  // unstyled.
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['./Tooltip.structure.css', './Tooltip.theme.css'],
  host: {
    '[attr.id]': 'baseId',
    '[attr.data-ds-state-open]': 'open() || null',
    '[attr.aria-disabled]': 'disabled() || null',
    '[attr.data-ds-placement]': 'placement()',
    'data-ds-component': 'Tooltip',
    'data-ds-part': 'root',
    '(keydown)': 'dismissal.onKeyDown($event)',
  },
  template: `
    <div
      [attr.id]="baseId + '-trigger'"
      [attr.aria-describedby]="ids(open() ? baseId + '-popup' : null)"
      data-ds-part="trigger"
    >
      <ng-content select="[slot=trigger]" />
    </div>
    <div
      role="tooltip"
      [attr.id]="baseId + '-popup'"
      [attr.hidden]="open() ? null : ''"
      data-ds-part="popup"
    >
      <ng-content select="[slot=content]" />
    </div>
    <ng-content />
  `,
})
export class Tooltip {
  /** The tooltip never opens. The trigger still works. */
  readonly disabled = input<boolean>(false);
  /** The PREFERRED side. A tooltip may be moved elsewhere when there is not room, so this is a request rather than a guarantee — a distinction the axis mechanism cannot express. Defaults to `top`. */
  readonly placement = input<
    'top' | 'top-start' | 'top-end' | 'bottom' | 'bottom-start' | 'bottom-end' | 'left' | 'right'
  >('top');
  /** The tooltip is showing. A consumer may control it; hover and focus on the trigger also change it. Two-way: `[(open)]`. */
  readonly open = model<boolean>(false);

  readonly baseId = 'ds-tooltip-' + nextId++;

  protected readonly dismissal = useDismissal(
    DISMISSAL,
    () => this.open(),
    () => this.open.set(false),
  );

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
