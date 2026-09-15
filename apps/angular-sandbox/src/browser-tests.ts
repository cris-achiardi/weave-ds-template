import { Component, signal } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { Accordion } from './components/Accordion';
import { AccordionItem } from './components/AccordionItem';

@Component({
  selector: 'browser-fixtures',
  imports: [Accordion, AccordionItem],
  template: `
    <button id="rename-accordion" (click)="identity.set('renamed')">Rename section</button>
    <div dsAccordion>
      <div dsAccordionItem [value]="identity()">
        <span slot="heading">Section heading</span>
        <p slot="panel">Section contents</p>
      </div>
    </div>
  `,
})
class BrowserFixtures {
  readonly identity = signal('original');
}

void bootstrapApplication(BrowserFixtures);
