// GENERATED from Slider.contract.json + Slider.angular.json. Do not edit by hand.
// Regenerate: node packages/angular/src/emit/emit.mjs Slider --out <dir>
//
// Chooses a number from a continuous range where the approximate value matters more than the exact one — a volume, a zoom level, a price ceiling.

import {
  Component,
  ElementRef,
  ViewEncapsulation,
  computed,
  input,
  model,
  viewChild,
} from '@angular/core';
import { snap, useRangeControl } from '@ds/angular/behavior';
import type { RangeOptions } from '@ds/angular/behavior';

// Transcribed from Slider.contract.json: the `range` block, plus min/max/step from
// the `value` state. The cases this commits us to are in
// @ds/contracts/conformance/range-stepping.json.
const RANGE: RangeOptions = {
  min: 0,
  max: 100,
  step: 1,
  orientation: 'horizontal',
  pageStep: 10,
};

@Component({
  // The binding's `element` becomes a SELECTOR, because an Angular component attaches
  // to an element rather than rendering one. A consumer writes <div dsSlider>.
  selector: 'div[dsSlider]',
  exportAs: 'dsSlider',
  // ViewEncapsulation.None IS LOAD-BEARING. Angular's default rewrites every selector in
  // these stylesheets to include a generated _ngcontent attribute, which would scope them
  // to this component and break the one property the whole system rests on: that a theme
  // file selecting on [data-ds-component] dresses the React, Vue and Angular builds
  // alike. It fails silently — the CSS loads, matches nothing, and the component renders
  // unstyled.
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['./Slider.structure.css', './Slider.theme.css'],
  host: {
    '[attr.role]': "'slider'",
    '[attr.aria-disabled]': 'disabled() || null',
    '[attr.data-ds-state-dragging]': 'range.dragging() || null',
    '[attr.tabindex]': 'disabled() ? -1 : 0',
    '[attr.aria-valuemin]': '0',
    '[attr.aria-valuemax]': '100',
    '[attr.aria-valuenow]': 'announcedValue()',
    '[style.--ds-fraction]': 'range.fraction()',
    'data-ds-component': 'Slider',
    'data-ds-part': 'root',
    '(keydown)': 'range.onKeyDown($event)',
    '(pointerdown)': 'range.onPointerDown($event)',
    '(pointermove)': 'range.onPointerMove($event)',
    '(pointerup)': 'range.onPointerUp($event)',
    '(pointercancel)': 'range.onPointerUp($event)',
  },
  template: `
    <div #track data-ds-part="track"></div>
    <div data-ds-part="fill"></div>
    <div data-ds-part="thumb"></div>
  `,
})
export class Slider {
  /** The platform's own disabled state. Removed from the focus order and cannot be moved. */
  readonly disabled = input<boolean>(false);
  /** The chosen number. Bounded and stepped — facts that live nowhere else, and that no boolean or enumeration can carry. Two-way: `[(value)]`. */
  readonly value = model<number>(0);

  private readonly track = viewChild<ElementRef<HTMLElement>>('track');

  /** Announce the value the contract says this holds, not the one it was handed: a
   *  controlled value may arrive off-step, and the thumb would be drawn at one
   *  number and announced as another. */
  protected readonly announcedValue = computed(() => snap(this.value(), RANGE));

  protected readonly range = useRangeControl(
    RANGE,
    () => this.value(),
    (next: number) => this.value.set(next),
    () => Boolean(this.disabled()),
    () => this.track()?.nativeElement ?? null,
  );
}
