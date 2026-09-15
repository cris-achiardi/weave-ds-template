// GENERATED from TabItem.contract.json + TabItem.angular.json. Do not edit by hand.
// Regenerate: node packages/angular/src/emit/emit.mjs TabItem --out <dir>
//
// One tab: a label that reveals its panel when chosen. It carries its own identity and its own disabled state, and nothing else.

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
import { TABS, type TabsContext } from '../Tabs/Tabs';

@Component({
  // The binding's `element` becomes a SELECTOR, because an Angular component attaches
  // to an element rather than rendering one. A consumer writes <button dsTabItem>.
  selector: 'button[dsTabItem]',
  exportAs: 'dsTabItem',
  // ViewEncapsulation.None IS LOAD-BEARING. Angular's default rewrites every selector in
  // these stylesheets to include a generated _ngcontent attribute, which would scope them
  // to this component and break the one property the whole system rests on: that a theme
  // file selecting on [data-ds-component] dresses the React, Vue and Angular builds
  // alike. It fails silently — the CSS loads, matches nothing, and the component renders
  // unstyled.
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['./TabItem.structure.css', './TabItem.theme.css'],
  host: {
    type: 'button',
    '[attr.role]': "'tab'",
    '[attr.id]': 'baseId()',
    '[attr.aria-disabled]': 'disabled() || null',
    '[attr.aria-selected]': 'selected()',
    '[attr.tabindex]': 'collection.isTabStop(value()) ? 0 : -1',
    '[attr.aria-controls]': "collection.baseId + '-TabPanel-' + value()",
    'data-ds-component': 'TabItem',
    'data-ds-part': 'root',
    '(click)': 'activate($event)',
  },
  template: `
    <div data-ds-part="label">
      <ng-content select="[slot=label]" />
    </div>
    <div [attr.hidden]="selected() ? null : ''" data-ds-part="indicator"></div>
    <ng-content />
  `,
})
export class TabItem {
  /** Set by the prop or inherited from the strip. Skipped by arrow-key movement. */
  readonly disabled = input<boolean>(false);
  /** Distinguishes this TabItem from its siblings. The ancestor Tabs compares against it to decide whether this one is in the selection. */
  readonly value = input.required<string>();

  private readonly collectionRef = inject<TabsContext>(TABS);
  protected readonly collection = this.collectionRef;
  protected readonly selected = computed(() => this.collection.selection() === this.value());
  protected readonly isDisabled = computed(
    () => this.disabled() || this.collection.collectionDisabled(),
  );
  protected readonly baseId = computed(() => this.collection.baseId + '-TabItem-' + this.value());

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    // The collection moves focus between its members, so each one announces its
    // element. `inject(ElementRef)` reaches the host directly — there is no ref to
    // forward and no template ref to declare, because the host is the consumer's
    // own element.
    let registeredValue: string | null = null;
    effect(() => {
      const value = this.value();
      if (registeredValue !== null && registeredValue !== value) {
        this.collection.unregister(registeredValue);
      }
      registeredValue = value;
      this.collection.register(value, {
        element: this.host.nativeElement,
        disabled: this.isDisabled(),
      });
    });
    inject(DestroyRef).onDestroy(() => {
      if (registeredValue !== null) this.collection.unregister(registeredValue);
    });
  }

  protected activate(event?: { defaultPrevented: boolean }): void {
    // Guards, because this runs on a CLICK and the platform guards there too: calling
    // preventDefault() in a click handler is what cancels a native checkbox's toggle.
    if (event?.defaultPrevented) return;
    if (this.isDisabled()) return;
    this.collection.toggle(this.value());
  }
}
