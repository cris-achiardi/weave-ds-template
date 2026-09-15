// GENERATED from AccordionItem.contract.json + AccordionItem.angular.json. Do not edit by hand.
// Regenerate: node packages/angular/src/emit/emit.mjs AccordionItem --out <dir>
//
// One section of an accordion: a heading that reveals a panel when chosen. It carries its own identity and its own disabled state, and nothing else — whether it is open is a comparison against the surrounding Accordion, not a property it holds.

import { Component, ViewEncapsulation, computed, inject, input } from '@angular/core';
import { ACCORDION, type AccordionContext } from '../Accordion/Accordion';

@Component({
  // The binding's `element` becomes a SELECTOR, because an Angular component attaches
  // to an element rather than rendering one. A consumer writes <div dsAccordionItem>.
  selector: 'div[dsAccordionItem]',
  exportAs: 'dsAccordionItem',
  // ViewEncapsulation.None IS LOAD-BEARING. Angular's default rewrites every selector in
  // these stylesheets to include a generated _ngcontent attribute, which would scope them
  // to this component and break the one property the whole system rests on: that a theme
  // file selecting on [data-ds-component] dresses the React, Vue and Angular builds
  // alike. It fails silently — the CSS loads, matches nothing, and the component renders
  // unstyled.
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['./AccordionItem.structure.css', './AccordionItem.theme.css'],
  host: {
    '[attr.id]': 'baseId()',
    '[attr.aria-disabled]': 'disabled() || null',
    '[attr.data-ds-state-open]': 'selected() || null',
    'data-ds-component': 'AccordionItem',
    'data-ds-part': 'root',
  },
  template: `
    <div data-ds-part="header">
      <button
        [attr.id]="baseId() + '-trigger'"
        [attr.aria-controls]="baseId() + '-panel'"
        (click)="activate($event)"
        type="button"
        [attr.disabled]="isDisabled() || null"
        [attr.aria-expanded]="selected()"
        data-ds-part="trigger"
      >
        <ng-content select="[slot=heading]" />
        <div data-ds-part="indicator"></div>
      </button>
    </div>
    <div
      role="region"
      [attr.id]="baseId() + '-panel'"
      [attr.aria-labelledby]="baseId() + '-trigger'"
      [attr.hidden]="selected() ? null : ''"
      data-ds-part="panel"
    >
      <ng-content select="[slot=panel]" />
    </div>
    <ng-content />
  `,
})
export class AccordionItem {
  /** Set by the `disabled` prop or inherited from the Accordion. Rendered as a natively disabled button. */
  readonly disabled = input<boolean>(false);
  /** Distinguishes this AccordionItem from its siblings. The ancestor Accordion compares against it to decide whether this one is in the selection. */
  readonly value = input.required<string>();

  private readonly collectionRef = inject<AccordionContext>(ACCORDION);
  protected readonly collection = this.collectionRef;
  protected readonly selected = computed(() => this.collection.selection().includes(this.value()));
  protected readonly isDisabled = computed(
    () => this.disabled() || this.collection.collectionDisabled(),
  );
  protected readonly baseId = computed(
    () => this.collection.baseId + '-AccordionItem-' + this.value(),
  );

  protected activate(event?: { defaultPrevented: boolean }): void {
    // Guards, because this runs on a CLICK and the platform guards there too: calling
    // preventDefault() in a click handler is what cancels a native checkbox's toggle.
    if (event?.defaultPrevented) return;
    if (this.isDisabled()) return;
    this.collection.toggle(this.value());
  }
}
