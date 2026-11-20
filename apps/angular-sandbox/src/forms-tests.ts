import { Component, signal } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { TextField } from './components/TextField';

// Form participation fixture. tests/browser/framework-forms.mjs drives the same page in every
// framework backend; keep labels, names and test ids identical across the three fixtures.
@Component({
  selector: 'form-fixtures',
  imports: [TextField],
  template: `<form id="form" (submit)="submitted($event)">
      <fieldset id="form-fields" [attr.data-tick]="tick()">
        <input
          dsTextField
          aria-label="Controlled"
          name="controlled"
          [value]="model()"
          [invalid]="invalid()"
          [readOnly]="readOnly()"
          (valueChange)="changed($event)"
        />
        <input dsTextField aria-label="Uncontrolled" name="uncontrolled" />
        <input dsTextField aria-label="Required" name="required" required />
      </fieldset>
      <button type="submit">Submit answers</button>
      <button type="reset">Reset answers</button>
    </form>
    @if (showOutside()) {
      <input
        dsTextField
        aria-label="Outside"
        name="outside"
        form="form"
        [value]="outside()"
        (valueChange)="outside.set($event)"
      />
    }
    <output data-testid="model">{{ model() }}</output>
    <output data-testid="outside-model">{{ outside() }}</output>
    <output data-testid="count">{{ count() }}</output>
    <output data-testid="tick">{{ tick() }}</output>
    <button (mousedown)="$event.preventDefault()" (click)="invalid.set(!invalid())">
      Toggle invalid
    </button>
    <button (mousedown)="$event.preventDefault()" (click)="tick.set(tick() + 1)">Rerender</button>
    <button (mousedown)="$event.preventDefault()" (click)="model.set('external')">
      Set external
    </button>
    <button (mousedown)="$event.preventDefault()" (click)="showOutside.set(false)">
      Remove outside
    </button>
    <button (mousedown)="$event.preventDefault()" (click)="readOnly.set(!readOnly())">
      Toggle read-only
    </button>`,
})
class FormFixture {
  readonly model = signal('initial');
  readonly outside = signal('out');
  readonly count = signal(0);
  readonly tick = signal(0);
  readonly invalid = signal(false);
  readonly showOutside = signal(true);
  readonly readOnly = signal(false);
  changed(next: string) {
    this.model.set(next);
    this.count.update((n) => n + 1);
  }
  submitted(event: Event) {
    event.preventDefault();
    (event.target as HTMLFormElement).dataset['submitted'] = 'true';
  }
}
void bootstrapApplication(FormFixture);
