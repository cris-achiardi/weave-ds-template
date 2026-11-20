import { Component, signal } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { Button } from './components/Button';
import { Checkbox } from './components/Checkbox';
import { RadioGroup } from './components/RadioGroup';
import { RadioItem } from './components/RadioItem';
import { Slider } from './components/Slider';
import { Switch } from './components/Switch';

type Check = 'unchecked' | 'checked' | 'mixed';

// Form contribution fixture for the custom controls. tests/browser/framework-controls.mjs drives
// the same page in every framework backend; keep labels, names and test ids identical.
@Component({
  selector: 'form-fixtures',
  imports: [Button, Checkbox, RadioGroup, RadioItem, Slider, Switch],
  template: `<form id="form" (submit)="submitted($event)">
      <fieldset id="form-fields">
        <button
          dsCheckbox
          name="consent"
          [checked]="consent()"
          [invalid]="invalid()"
          [required]="required()"
          [disabled]="consentDisabled()"
          [value]="accepted() ? 'accepted' : 'on'"
          (checkedChange)="changed($event)"
        >
          <span slot="label">Consent</span>
        </button>
        <button
          dsSwitch
          aria-label="Setting"
          name="setting"
          [checked]="true"
          [readOnly]="settingReadOnly()"
        ></button>
        <div dsSlider aria-label="Amount" [name]="amountName()" [value]="25"></div>
        <div dsRadioGroup aria-label="Choice" name="choice" value="b">
          <div dsRadioItem value="a"><span slot="label">Alpha</span></div>
          <div dsRadioItem value="b"><span slot="label">Beta</span></div>
        </div>
        <button dsButton>Action</button>
      </fieldset>
      <button type="submit">Submit answers</button>
      <button type="reset">Reset answers</button>
    </form>
    @if (showRemote()) {
      <button
        dsCheckbox
        name="remote"
        form="form"
        [checked]="remote()"
        (checkedChange)="remote.set($event)"
      >
        <span slot="label">Remote</span>
      </button>
    }
    <output data-testid="consent-model">{{ consent() }}</output>
    <output data-testid="remote-model">{{ remote() }}</output>
    <output data-testid="count">{{ count() }}</output>
    <button (mousedown)="$event.preventDefault()" (click)="consent.set('mixed')">
      Mix consent
    </button>
    <button (mousedown)="$event.preventDefault()" (click)="consent.set('checked')">
      Check consent
    </button>
    <button (mousedown)="$event.preventDefault()" (click)="invalid.set(!invalid())">
      Toggle invalid
    </button>
    <button (mousedown)="$event.preventDefault()" (click)="required.set(true)">
      Require consent
    </button>
    <button (mousedown)="$event.preventDefault()" (click)="accepted.set(true)">Accept value</button>
    <button (mousedown)="$event.preventDefault()" (click)="amountName.set('')">
      Clear amount name
    </button>
    <button (mousedown)="$event.preventDefault()" (click)="consentDisabled.set(true)">
      Disable consent
    </button>
    <button (mousedown)="$event.preventDefault()" (click)="showRemote.set(false)">
      Remove remote
    </button>
    <button (mousedown)="$event.preventDefault()" (click)="settingReadOnly.set(!settingReadOnly())">
      Toggle read-only setting
    </button>`,
})
class ControlsFixture {
  readonly consent = signal<Check>('checked');
  readonly remote = signal<Check>('unchecked');
  readonly count = signal(0);
  readonly invalid = signal(false);
  readonly required = signal(false);
  readonly accepted = signal(false);
  readonly amountName = signal('amount');
  readonly consentDisabled = signal(false);
  readonly showRemote = signal(true);
  readonly settingReadOnly = signal(false);
  changed(next: Check) {
    this.consent.set(next);
    this.count.update((n) => n + 1);
  }
  submitted(event: Event) {
    event.preventDefault();
    (event.target as HTMLFormElement).dataset['submitted'] = 'true';
  }
}
void bootstrapApplication(ControlsFixture);
