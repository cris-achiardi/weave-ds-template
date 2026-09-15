import { Component, signal } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { TextField as Live } from './components/TextField';
import { CommittedTextField as Committed } from './browser-generated/CommittedTextField/CommittedTextField';
const template = `<input dsTextField aria-label="Edit probe" [value]="value()" [invalid]="invalid()" (valueChange)="changed($event)" />
<output data-testid="value">{{value()}}</output><output data-testid="count">{{count()}}</output><output data-testid="tick">{{tick()}}</output>
<button (mousedown)="$event.preventDefault()" (click)="rerender()">Rerender</button>
<button (mousedown)="$event.preventDefault()" (click)="value.set('external')">Set external</button><button>Finish</button>`;
class State {
  readonly value = signal('');
  readonly count = signal(0);
  readonly tick = signal(0);
  readonly invalid = signal(false);
  changed(next: string) {
    this.value.set(next);
    this.count.update((n) => n + 1);
  }
  rerender() {
    this.tick.update((n) => n + 1);
    this.invalid.update((v) => !v);
  }
}
@Component({ selector: 'editing-fixtures', imports: [Live], template })
class LiveFixture extends State {}
@Component({
  selector: 'editing-fixtures',
  imports: [Committed],
  template: `<input
      dsCommittedTextField
      aria-label="Edit probe"
      [value]="value()"
      [invalid]="invalid()"
      (valueChange)="changed($event)"
    />
    <output data-testid="value">{{ value() }}</output
    ><output data-testid="count">{{ count() }}</output
    ><output data-testid="tick">{{ tick() }}</output>
    <button (mousedown)="$event.preventDefault()" (click)="rerender()">Rerender</button>
    <button (mousedown)="$event.preventDefault()" (click)="value.set('external')">
      Set external</button
    ><button>Finish</button>`,
})
class CommitFixture extends State {}
void bootstrapApplication(
  new URLSearchParams(location.search).get('mode') === 'commit' ? CommitFixture : LiveFixture,
);
