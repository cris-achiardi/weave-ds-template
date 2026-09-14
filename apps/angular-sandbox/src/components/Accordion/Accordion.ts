// GENERATED from Accordion.contract.json + Accordion.angular.json. Do not edit by hand.
// Regenerate: node packages/angular/src/emit/emit.mjs Accordion --out <dir>
//
// Holds which of a set of sections are expanded, and lets a reader open one without losing the list of the others. It exists so that the open set has exactly one home rather than each section holding its own copy.

import {
  Component,
  InjectionToken,
  ViewEncapsulation,
  computed,
  forwardRef,
  input,
  model,
} from '@angular/core';
import type { Signal } from '@angular/core';

// Angular has no useId. React does and Vue 3.5 does; this counter is the emitter's
// own invention, and it is wrong under server rendering with hydration — which
// nothing in this repo exercises. Recorded rather than solved.
let nextId = 0;

/** Published to every member through the injector. */
export interface AccordionContext {
  /** The current selection, by member value. */
  readonly selection: Signal<string[]>;
  /** Called by a member when it is activated. */
  toggle(value: string): void;
  /** Shared id root, so a member's parts can reference one another. */
  readonly baseId: string;
  /** True when the whole collection is disabled. */
  readonly collectionDisabled: Signal<boolean>;
}

/**
 * The injection token. A member asks the injector for its collection, which is
 * Angular's answer to React context and Vue's provide/inject — the contract declares
 * that a membership exists and says nothing about the protocol.
 */
export const ACCORDION = new InjectionToken<AccordionContext>('Accordion');

@Component({
  // The binding's `element` becomes a SELECTOR, because an Angular component attaches
  // to an element rather than rendering one. A consumer writes <div dsAccordion>.
  selector: 'div[dsAccordion]',
  exportAs: 'dsAccordion',
  // ViewEncapsulation.None IS LOAD-BEARING. Angular's default rewrites every selector in
  // these stylesheets to include a generated _ngcontent attribute, which would scope them
  // to this component and break the one property the whole system rests on: that a theme
  // file selecting on [data-ds-component] dresses the React, Vue and Angular builds
  // alike. It fails silently — the CSS loads, matches nothing, and the component renders
  // unstyled.
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['./Accordion.structure.css', './Accordion.theme.css'],
  providers: [{ provide: ACCORDION, useExisting: forwardRef(() => Accordion) }],
  host: {
    '[attr.id]': 'baseId',
    '[attr.aria-disabled]': 'disabled() || null',
    '[attr.data-ds-orientation]': 'orientation()',
    'data-ds-component': 'Accordion',
    'data-ds-part': 'root',
  },
  template: ` <ng-content /> `,
})
export class Accordion implements AccordionContext {
  /** The whole accordion ignores interaction. Cascades to every item. */
  readonly disabled = input<boolean>(false);
  /** Only vertical is designed. Recorded as an axis with one value rather than omitted, because the horizontal case exists in the canon and this component deliberately does not take it. Defaults to `vertical`. */
  readonly orientation = input<'vertical'>('vertical');
  /** The current selection, by member identity. Two-way: `[(value)]`. */
  readonly value = model<string[]>([]);

  readonly baseId = 'ds-accordion-' + nextId++;

  readonly selection = this.value.asReadonly();
  readonly collectionDisabled = computed(() => Boolean(this.disabled()));

  // `memberValue`, not `value`: the selection model is a member of
  // this class under that name, and a parameter shadowing it reads as the string.
  toggle(memberValue: string): void {
    const current = this.value();
    this.value.set(
      current.includes(memberValue)
        ? current.filter((v) => v !== memberValue)
        : [...current, memberValue],
    );
  }
}
