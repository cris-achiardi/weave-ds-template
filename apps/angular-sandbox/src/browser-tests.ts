import { Component, signal } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { Accordion } from './components/Accordion';
import { AccordionItem } from './components/AccordionItem';
import { Tabs } from './components/Tabs';
import { TabItem } from './components/TabItem';
import { RadioGroup } from './components/RadioGroup';
import { RadioItem } from './components/RadioItem';

const roster = () => ({
  identity: signal('a'),
  value: signal('a'),
  disabled: signal(false),
  visible: signal(true),
});
const rosters = { tabs: roster(), radios: roster() };

export function updateRoster(
  kind: keyof typeof rosters,
  patch: Partial<{ identity: string; value: string; disabled: boolean; visible: boolean }>,
) {
  const state = rosters[kind];
  if (patch.identity !== undefined) state.identity.set(patch.identity);
  if (patch.value !== undefined) state.value.set(patch.value);
  if (patch.disabled !== undefined) state.disabled.set(patch.disabled);
  if (patch.visible !== undefined) state.visible.set(patch.visible);
}

@Component({
  selector: 'browser-fixtures',
  imports: [Accordion, AccordionItem, Tabs, TabItem, RadioGroup, RadioItem],
  template: `
    <button id="rename-accordion" (click)="identity.set('renamed')">Rename section</button>
    <div dsAccordion>
      <div dsAccordionItem [value]="identity()">
        <span slot="heading">Section heading</span>
        <p slot="panel">Section contents</p>
      </div>
    </div>
    <div data-testid="tabs" dsTabs [(value)]="tabs.value">
      @if (tabs.visible()) {
        <button dsTabItem [value]="tabs.identity()" [disabled]="tabs.disabled()">First tabs</button>
      }
      <button dsTabItem value="b">Second tabs</button>
    </div>
    <div data-testid="radios" dsRadioGroup [(value)]="radios.value">
      @if (radios.visible()) {
        <div dsRadioItem [value]="radios.identity()" [disabled]="radios.disabled()">
          First radios
        </div>
      }
      <div dsRadioItem value="b">Second radios</div>
    </div>
  `,
})
class BrowserFixtures {
  readonly tabs = rosters.tabs;
  readonly radios = rosters.radios;
  readonly identity = signal('original');
}

void bootstrapApplication(BrowserFixtures);
