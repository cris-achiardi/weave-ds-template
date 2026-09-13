// GENERATED from Tabs.contract.json + Tabs.angular.json. Do not edit by hand.
// Regenerate: node packages/angular/src/emit/emit.mjs Tabs --out <dir>
//
// Holds which one of several sections is showing, in a fixed area, so a person can move between them without losing their place on the page.

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
import { useLinearNavigation } from '@ds/angular/behavior';
import type { MemberRegistration, NavigationOptions } from '@ds/angular/behavior';

// Transcribed field for field from Tabs.contract.json > collection.navigation.
// The cases this commits us to are in
// @ds/contracts/conformance/linear-navigation.json.
const NAVIGATION: NavigationOptions = {
  orientation: 'horizontal',
  wrap: true,
  followsFocus: true,
  disabledItems: 'focusable',
  homeEnd: true,
};

// Angular has no useId. React does and Vue 3.5 does; this counter is the emitter's
// own invention, and it is wrong under server rendering with hydration — which
// nothing in this repo exercises. Recorded rather than solved.
let nextId = 0;

/** Published to every member through the injector. */
export interface TabsContext {
  /** The current selection, by member value. */
  readonly selection: Signal<string>;
  /** Called by a member when it is activated. */
  toggle(value: string): void;
  /** Shared id root, so a member's parts can reference one another. */
  readonly baseId: string;
  /** True when the whole collection is disabled. */
  readonly collectionDisabled: Signal<boolean>;
  /** A member announces its DOM node, so the collection can move focus. */
  register(value: string, entry: MemberRegistration): void;
  unregister(value: string): void;
  /** True for the one member that sits in the page's tab sequence. */
  isTabStop(value: string): boolean;
}

/**
 * The injection token. A member asks the injector for its collection, which is
 * Angular's answer to React context and Vue's provide/inject — the contract declares
 * that a membership exists and says nothing about the protocol.
 */
export const TABS = new InjectionToken<TabsContext>('Tabs');

@Component({
  // The binding's `element` becomes a SELECTOR, because an Angular component attaches
  // to an element rather than rendering one. A consumer writes <div dsTabs>.
  selector: 'div[dsTabs]',
  exportAs: 'dsTabs',
  // ViewEncapsulation.None IS LOAD-BEARING. Angular's default rewrites every selector in
  // these stylesheets to include a generated _ngcontent attribute, which would scope them
  // to this component and break the one property the whole system rests on: that a theme
  // file selecting on [data-ds-component] dresses the React, Vue and Angular builds
  // alike. It fails silently — the CSS loads, matches nothing, and the component renders
  // unstyled.
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['./Tabs.structure.css', './Tabs.theme.css'],
  providers: [{ provide: TABS, useExisting: forwardRef(() => Tabs) }],
  host: {
    '[attr.id]': 'baseId',
    '[attr.aria-disabled]': 'disabled() || null',
    'data-ds-component': 'Tabs',
    'data-ds-part': 'root',
    '(keydown)': 'nav.onKeyDown($event)',
  },
  template: `
    <div role="tablist" [attr.id]="baseId + '-list'" data-ds-part="list"></div>
    <ng-content />
  `,
})
export class Tabs implements TabsContext {
  /** The whole strip ignores interaction. Cascades to every tab. */
  readonly disabled = input<boolean>(false);
  /** The current selection, by member identity. Two-way: `[(value)]`. */
  readonly value = model<string>('');

  readonly baseId = 'ds-tabs-' + nextId++;

  readonly selection = this.value.asReadonly();
  readonly collectionDisabled = computed(() => Boolean(this.disabled()));

  // `memberValue`, not `value`: the selection model is a member of
  // this class under that name, and a parameter shadowing it reads as the string.
  toggle(memberValue: string): void {
    if (this.value() === memberValue) return;
    this.value.set(memberValue);
  }

  // `toggle` is the selection setter, and `followsFocus` is what decides whether
  // the primitive calls it. With followsFocus false it is never called from here
  // and arrowing only moves focus.
  private readonly nav = useLinearNavigation(
    NAVIGATION,
    () => this.value(),
    (v) => this.toggle(v),
  );
  register = this.nav.register;
  unregister = this.nav.unregister;
  isTabStop = this.nav.isTabStop;
  protected readonly navHandlers = this.nav;

  protected readonly nav2 = this.navHandlers;
}
