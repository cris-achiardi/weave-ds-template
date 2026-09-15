import { Component, signal } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { Tabs } from './browser-generated/Tabs/Tabs';
import { TabItem } from './browser-generated/TabItem/TabItem';
import { RadioGroup } from './components/RadioGroup';
import { RadioItem } from './components/RadioItem';
import { Dialog } from './components/Dialog';
const params = new URLSearchParams(location.search);
@Component({
  selector: 'conformance-fixtures',
  imports: [Tabs, TabItem, RadioGroup, RadioItem, Dialog],
  template: `
    @if (dismissal) {
      <dialog dsDialog [(open)]="open">
        <span slot="title">Conformance dialog</span>
        <div slot="body">
          <button id="inside">Inside</button><button id="overflow">Overflow child</button>
        </div>
      </dialog>
      <output data-testid="open">{{ open() }}</output>
    } @else {
      <button id="before">Before</button>
      @if (radio) {
        <div dsRadioGroup [value]="value()" (valueChange)="change($event)">
          @for (id of ids; track id) {
            <div dsRadioItem [value]="id">
              <span slot="label">{{ id }}</span>
            </div>
          }
        </div>
      } @else {
        <div dsTabs [value]="value()" (valueChange)="change($event)">
          @for (id of ids; track id) {
            <button dsTabItem [value]="id">
              <span slot="label">{{ id }}</span>
            </button>
          }
        </div>
      }
      <button id="after">After</button><output data-testid="selected">{{ value() }}</output
      ><output data-testid="changes">{{ count() }}</output>
    }
  `,
})
class ConformanceFixtures {
  readonly dismissal = params.get('kind') === 'dismissal';
  readonly radio = params.get('pattern') === 'radio';
  readonly ids = ['a', 'b', 'c'];
  readonly value = signal(params.get('selected') ?? 'a');
  readonly count = signal(0);
  readonly open = signal(true);
  change(next: string) {
    this.value.set(next);
    this.count.update((n) => n + 1);
  }
}
void bootstrapApplication(ConformanceFixtures);
