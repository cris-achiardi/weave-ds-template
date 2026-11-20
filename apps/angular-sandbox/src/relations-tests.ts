// Fixtures for tests/browser/relations.mjs: relations written on the element a consumer supplies
// to Field's `control` and Tooltip's `trigger` (#35, #46). Same DOM in all four sandboxes.
import { Component, signal } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { Field } from './components/Field';
import { Tooltip } from './components/Tooltip';

@Component({
  selector: 'relations-fixtures',
  imports: [Field, Tooltip],
  template: `
    <div id="field-a">
      <div dsField [invalid]="invalid()">
        <span slot="label">Account</span>
        @if (swapped()) {
          <textarea slot="control"></textarea>
        } @else {
          <input slot="control" />
        }
        <span slot="description">Use your account name</span>
        <span slot="error">Required</span>
      </div>
    </div>
    <span id="consumer-hint">Consumer hint</span>
    <div id="field-b">
      <div dsField>
        <span slot="label">Account B</span>
        <input slot="control" id="own-id" aria-describedby="consumer-hint" />
        <span slot="description">Help B</span>
      </div>
    </div>
    <span id="tip-extra">Extra</span>
    <div dsTooltip [(open)]="open">
      <button slot="trigger" type="button" aria-describedby="tip-extra">Info</button>
      <span slot="content">Helpful text</span>
    </div>
    <button type="button" (click)="invalid.set(!invalid())">Toggle invalid</button>
    <button type="button" (click)="swapped.set(!swapped())">Swap control</button>
    <button type="button" (click)="open.set(!open())">Toggle tooltip</button>
  `,
})
class RelationsFixture {
  readonly invalid = signal(false);
  readonly swapped = signal(false);
  readonly open = signal(false);
}
void bootstrapApplication(RelationsFixture);
