// GENERATED from RadioItem.contract.json + RadioItem.angular.json. Do not edit by hand.
// Regenerate: node packages/angular/src/emit/emit.mjs RadioItem --out <dir>
//
// One option in a radio group: a label that becomes the group's answer when chosen. It carries its own identity and its own disabled state, and nothing else — whether it is chosen is a comparison, not a property it holds.

import {
  Component,
  DestroyRef,
  ElementRef,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  input,
} from '@angular/core';
import { RADIOGROUP, type RadioGroupContext } from '../RadioGroup/RadioGroup';

@Component({
  // The binding's `element` becomes a SELECTOR, because an Angular component attaches
  // to an element rather than rendering one. A consumer writes <div dsRadioItem>.
  selector: 'div[dsRadioItem]',
  exportAs: 'dsRadioItem',
  // ViewEncapsulation.None IS LOAD-BEARING. Angular's default rewrites every selector in
  // these stylesheets to include a generated _ngcontent attribute, which would scope them
  // to this component and break the one property the whole system rests on: that a theme
  // file selecting on [data-ds-component] dresses the React, Vue and Angular builds
  // alike. It fails silently — the CSS loads, matches nothing, and the component renders
  // unstyled.
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['./RadioItem.structure.css', './RadioItem.theme.css'],
  host: {
    '[attr.role]': "'radio'",
    '[attr.aria-disabled]': 'disabled() || null',
    '[attr.aria-checked]': 'selected()',
    '[attr.tabindex]': 'collection.isTabStop(value()) ? 0 : -1',
    'data-ds-component': 'RadioItem',
    'data-ds-part': 'root',
    '(click)': 'activate($event)',
  },
  template: `
    <div data-ds-part="control">
      <div [attr.hidden]="selected() ? null : ''" data-ds-part="mark"></div>
    </div>
    <div data-ds-part="label">
      <ng-content select="[slot=label]" />
    </div>
    <ng-content />
  `,
})
export class RadioItem {
  /** Set by the `disabled` prop or inherited from the group. Skipped by arrow-key movement. */
  readonly disabled = input<boolean>(false);
  /** Distinguishes this RadioItem from its siblings. The ancestor RadioGroup compares against it to decide whether this one is in the selection. */
  readonly value = input.required<string>();

  private readonly collectionRef = inject<RadioGroupContext>(RADIOGROUP);
  protected readonly collection = this.collectionRef;
  protected readonly selected = computed(() => this.collection.selection() === this.value());
  protected readonly isDisabled = computed(
    () => this.disabled() || this.collection.collectionDisabled(),
  );

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    // The collection moves focus between its members, so each one announces its
    // element. `inject(ElementRef)` reaches the host directly — there is no ref to
    // forward and no template ref to declare, because the host is the consumer's
    // own element.
    effect(() => {
      this.collection.register(this.value(), {
        element: this.host.nativeElement,
        disabled: this.isDisabled(),
      });
    });
    inject(DestroyRef).onDestroy(() => this.collection.unregister(this.value()));
  }

  protected activate(event?: { defaultPrevented: boolean }): void {
    // Guards, because this runs on a CLICK and the platform guards there too: calling
    // preventDefault() in a click handler is what cancels a native checkbox's toggle.
    if (event?.defaultPrevented) return;
    if (this.isDisabled()) return;
    this.collection.toggle(this.value());
  }
}
