// GENERATED from TabPanel.contract.json + TabPanel.angular.json. Do not edit by hand.
// Regenerate: node packages/angular/src/emit/emit.mjs TabPanel --out <dir>
//
// The content one tab reveals. It exists so the strip has something real to control: a tab announcing that it opens a panel, with no panel wired to it, describes an interaction that does not happen.

import { Component, ViewEncapsulation, computed, inject, input } from '@angular/core';
import { TABS, type TabsContext } from '../Tabs/Tabs';

@Component({
  // The binding's `element` becomes a SELECTOR, because an Angular component attaches
  // to an element rather than rendering one. A consumer writes <div dsTabPanel>.
  selector: 'div[dsTabPanel]',
  exportAs: 'dsTabPanel',
  // ViewEncapsulation.None IS LOAD-BEARING. Angular's default rewrites every selector in
  // these stylesheets to include a generated _ngcontent attribute, which would scope them
  // to this component and break the one property the whole system rests on: that a theme
  // file selecting on [data-ds-component] dresses the React, Vue and Angular builds
  // alike. It fails silently — the CSS loads, matches nothing, and the component renders
  // unstyled.
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['./TabPanel.structure.css', './TabPanel.theme.css'],
  host: {
    '[attr.role]': "'tabpanel'",
    '[attr.id]': 'baseId()',
    '[attr.data-ds-state-selected]': 'selected() || null',
    '[attr.tabindex]': 'isDisabled() ? -1 : 0',
    '[attr.hidden]': "selected() ? null : ''",
    '[attr.aria-labelledby]': "collection.baseId + '-TabItem-' + value()",
    'data-ds-component': 'TabPanel',
    'data-ds-part': 'root',
  },
  template: ``,
})
export class TabPanel {
  /** Distinguishes this TabPanel from its siblings. The ancestor Tabs compares against it to decide whether this one is in the selection. */
  readonly value = input.required<string>();

  private readonly collectionRef = inject<TabsContext>(TABS);
  protected readonly collection = this.collectionRef;
  protected readonly selected = computed(() => this.collection.selection() === this.value());
  protected readonly isDisabled = computed(() => this.collection.collectionDisabled());
  protected readonly baseId = computed(() => this.collection.baseId + '-TabPanel-' + this.value());
}
