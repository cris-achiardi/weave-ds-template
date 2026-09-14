import { Component, ViewEncapsulation, computed, signal } from '@angular/core';
import { Specimen } from './Specimen';

import { Button } from './components/Button';
import { Checkbox } from './components/Checkbox';
import { TextField } from './components/TextField';
import { Slider } from './components/Slider';
import { Tabs } from './components/Tabs';
import { TabItem } from './components/TabItem';
import { TabPanel } from './components/TabPanel';
import { Dialog } from './components/Dialog';
import { Switch } from './components/Switch';
import { Accordion } from './components/Accordion';
import { AccordionItem } from './components/AccordionItem';
import { RadioGroup } from './components/RadioGroup';
import { RadioItem } from './components/RadioItem';
import { Tooltip } from './components/Tooltip';
import { Field } from './components/Field';

/**
 * The Angular sandbox page.
 *
 * SPIKE STATE, and a DELIBERATE MIRROR of apps/react-sandbox/src/App.tsx and
 * apps/vue-sandbox/src/App.vue. Everything under ./components was GENERATED from the same fifteen
 * contracts those two were generated from:
 *
 *   node packages/angular/src/emit/emit.mjs <Name> --out apps/angular-sandbox/src/components
 *
 * Nothing is imported from @ds/angular, which exports no components and never will.
 *
 * WHAT YOU ARE LOOKING AT THAT IS NOT IN THE OTHER TWO PAGES: the consumer writes the ELEMENT.
 * `<button dsButton hierarchy="primary">` rather than `<Button hierarchy="primary">`, because an
 * Angular component attaches to an element instead of rendering one. That is the one structural
 * difference of the three backends, and it is visible in every line of this template.
 *
 * THE THEME FILES ARE COPIED FROM THE REACT SANDBOX, byte for byte — the same demonstration the Vue
 * page makes, now with a third data point. A theme file contains no framework at all, so if the
 * three backends have really compiled one specification, one stylesheet has to dress all three.
 *
 * NO VERDICTS HERE, for the same reason the Vue page carries none.
 */
@Component({
  selector: 'ds-root',
  encapsulation: ViewEncapsulation.None,
  imports: [
    Specimen,
    Button,
    Checkbox,
    TextField,
    Slider,
    Tabs,
    TabItem,
    TabPanel,
    Dialog,
    Switch,
    Accordion,
    AccordionItem,
    RadioGroup,
    RadioItem,
    Tooltip,
    Field,
  ],
  template: `
    <main class="sandbox">
      <header>
        <h1>Design system sandbox — Angular</h1>
        <p>
          The same fifteen contracts the React and Vue sandboxes render, compiled by
          <code>packages/angular/src/emit/emit.mjs</code>. Open all three — <code>:4300</code>,
          <code>:4301</code> and <code>:4302</code>. See
          <code>docs/research/0005-a-third-backend-and-what-only-it-could-find.md</code>.
        </p>
        <p>
          <strong>Not graded.</strong> The React page labels every specimen with how far its
          contract got, because someone drove each one in a browser. Nothing here claims that.
        </p>
      </header>

      <ds-specimen
        name="Button"
        of="Button"
        note="The consumer writes the element himself — a real button carrying dsButton. Three axes become three signal inputs with defaults, each value reaching the DOM as its own data attribute through a host binding rather than a template attribute — identical output, a completely different mechanism."
      >
        <button dsButton hierarchy="primary">Save changes</button>
        <button dsButton hierarchy="secondary">Cancel</button>
        <button dsButton hierarchy="tertiary">Learn more</button>
        <button dsButton hierarchy="primary" variant="danger">Delete project</button>
        <button dsButton hierarchy="secondary" variant="danger">Delete</button>
        <button dsButton hierarchy="secondary" variant="brand">Upgrade</button>
      </ds-specimen>

      <ds-specimen
        name="Button — size and state"
        of="Button-size"
        note="An icon slot is CONTENT PROJECTION here: the consumer supplies a real element carrying slot='iconStart'. React passes a ReactNode prop and Vue fills a template slot that needs no element at all. One contract word — slot — and three genuinely different mechanisms."
      >
        <button dsButton size="s">Small</button>
        <button dsButton size="m">Medium</button>
        <button dsButton size="l">Large</button>
        <button dsButton hierarchy="primary" [loading]="true">Saving</button>
        <button dsButton [disabled]="true">Disabled</button>
        <button dsButton hierarchy="primary"><span slot="iconStart">+</span>With icon</button>
      </ds-specimen>

      <ds-specimen
        name="Checkbox"
        of="Checkbox"
        note="A state with THREE values rather than two, carried by a single model(). mixed is not a third click target: activates.between names the two a user may reach, so a mixed checkbox resolves to checked."
      >
        <button dsCheckbox [(checked)]="terms">
          <span slot="label">Select all (currently {{ terms() }})</span>
        </button>
        <button dsCheckbox checked="checked"><span slot="label">Marketing email</span></button>
        <button dsCheckbox><span slot="label">Product updates</span></button>
        <button dsCheckbox checked="mixed"><span slot="label">Partly chosen</span></button>
        <button dsCheckbox [invalid]="true">
          <span slot="label">Required, and unanswered</span>
        </button>
        <button dsCheckbox [disabled]="true" checked="checked">
          <span slot="label">Disabled</span>
        </button>
      </ds-specimen>

      <ds-specimen
        name="TextField"
        of="TextField"
        note="Angular binds the DOM's own input event, as Vue does. React's onChange is React's synthetic per-keystroke invention and is the odd one out — two of three backends agree, and the contract is right to name neither."
      >
        <input dsTextField placeholder="Uncontrolled" />
        <input dsTextField size="s" placeholder="Small" />
        <input dsTextField size="l" placeholder="Large" />
        <input dsTextField [invalid]="true" value="not an email" />
        <input dsTextField [readOnly]="true" value="Read-only" />
        <input dsTextField [disabled]="true" placeholder="Disabled" />
      </ds-specimen>

      <ds-specimen
        name="Slider"
        of="Slider"
        note="Arrow keys, Page Up/Down, Home/End and pointer drag, all from the same pure range-stepping core the React and Vue builds run — literally the same file, in a third copy. The track element is reached with a viewChild query where React attaches a callback ref and Vue a function ref."
      >
        <div dsSlider [(value)]="volume" aria-label="Volume"></div>
        <span class="readout">value: {{ volume() }}</span>
        <button type="button" class="ghost" (click)="volume.set(max(0, volume() - 10))">−10</button>
        <button type="button" class="ghost" (click)="volume.set(min(100, volume() + 10))">
          +10
        </button>
      </ds-specimen>

      <ds-specimen
        name="Tabs + TabItem + TabPanel"
        of="Tabs"
        note="A collection with two kinds of member. React publishes the selection over context, Vue over provide/inject, Angular over the hierarchical injector. Three protocols, one contract sentence, and the keyboard model transcribed field for field from collection.navigation in all three."
      >
        <div dsTabs [(value)]="tab" aria-label="Project sections">
          <button dsTabItem value="overview"><span slot="label">Overview</span></button>
          <button dsTabItem value="activity"><span slot="label">Activity</span></button>
          <button dsTabItem value="settings" [disabled]="true">
            <span slot="label">Settings</span>
          </button>
          <div dsTabPanel value="overview">
            A collection with two kinds of member. This panel and its tab compare against the same
            value; neither holds it.
          </div>
          <div dsTabPanel value="activity">
            Selection follows focus in this pattern, which suits panels already in memory and is the
            wrong default for one that fetches. The contract cannot say which was chosen.
          </div>
          <div dsTabPanel value="settings">
            A panel for the disabled tab, so the tab's aria-controls resolves to something.
          </div>
        </div>
      </ds-specimen>

      <ds-specimen
        name="Dialog"
        of="Dialog"
        note="A native dialog element opened with showModal(). React needs useEffect, Vue a post-flush watcher, Angular an effect() — three primitives, one platform obligation, and @ds/platform-web supplied the method names to all three."
      >
        <button dsButton hierarchy="primary" (click)="dialogOpen.set(true)">Open the dialog</button>
        <dialog dsDialog [(open)]="dialogOpen">
          <span slot="title">Delete this project?</span>
          <span slot="body">
            Everything in it goes with it. Escape and the backdrop both close this, and neither is
            code any emitter wrote by choice — one comes from the platform, one from the contract.
          </span>
          <span slot="actions">
            <button dsButton hierarchy="secondary" (click)="dialogOpen.set(false)">Cancel</button>
            <button dsButton hierarchy="primary" variant="danger" (click)="dialogOpen.set(false)">
              Delete
            </button>
          </span>
        </dialog>
      </ds-specimen>

      <ds-specimen
        name="Switch"
        of="Switch"
        note="control: shared compiles to THREE React props and to ONE declaration in both Vue and Angular. Two independent backends collapsed it the same way, which is the strongest evidence in the repo that ADR 0004 described the state rather than React's spelling of it."
      >
        <span class="labelled">
          <button dsSwitch id="s1" [checked]="true"></button>
          <label for="s1">Notifications</label>
        </span>
        <span class="labelled">
          <button dsSwitch id="s2" [(checked)]="wifi"></button>
          <label for="s2">Wi-Fi (two-way bound)</label>
        </span>
        <button type="button" class="ghost" (click)="wifi.set(!wifi())">Toggle from outside</button>
        <span class="labelled">
          <button dsSwitch id="s3" [disabled]="true" [checked]="true"></button>
          <label for="s3">Disabled</label>
        </span>
        <span class="labelled">
          <button dsSwitch id="s4" [readOnly]="true" [checked]="true"></button>
          <label for="s4">Read-only</label>
        </span>
      </ds-specimen>

      <ds-specimen
        name="Accordion + AccordionItem"
        of="Accordion"
        note="cardinality: many, so the selection is a list rather than a string — and the model is still one declaration. The aria-expanded/controls/labelledby triangle and the hidden panel are generated from the contract's anatomy in all three backends."
      >
        <div dsAccordion [(value)]="openSections">
          <div dsAccordionItem value="what">
            <span slot="heading">What is a contract?</span>
            <span slot="panel">
              The agnostic specification a component is generated from. It is the thing this library
              ships; the component is output.
            </span>
          </div>
          <div dsAccordionItem value="why">
            <span slot="heading">Why does this one open?</span>
            <span slot="panel">
              Because the contract says what opening means: the accordion holds a selection, this
              item is a member of it, and the trigger toggles that membership.
            </span>
          </div>
          <div dsAccordionItem value="disabled" [disabled]="true">
            <span slot="heading">This one is disabled</span>
            <span slot="panel">You should not be able to read this.</span>
          </div>
        </div>
      </ds-specimen>

      <ds-specimen
        name="RadioGroup + RadioItem"
        of="RadioGroup"
        note="cardinality: one, and the sold-out option is skipped by the arrows rather than kept focusable — the one place these contracts disagree with the tabs, declared in collection.navigation and read identically by all three backends."
      >
        <div dsRadioGroup [(value)]="plan" aria-label="Billing period" class="radio-row">
          <div dsRadioItem value="monthly"><span slot="label">Monthly</span></div>
          <div dsRadioItem value="yearly"><span slot="label">Yearly (2 months free)</span></div>
          <div dsRadioItem value="lifetime" [disabled]="true">
            <span slot="label">Lifetime (sold out)</span>
          </div>
        </div>
        <span class="readout">chosen: {{ plan() }}</span>
      </ds-specimen>

      <ds-specimen
        name="Tooltip"
        of="Tooltip"
        note="Correct structure, and nothing opens it — exactly as in React and Vue. The contract says hover-after-a-delay and focus in prose; activates covers clicks only. A gap in the CONTRACT reproducing identically in a third backend is as close to proof as this repo gets that it is not an emitter's fault."
      >
        <div dsTooltip [(open)]="tipOpen">
          <span slot="trigger">
            <button type="button" class="ghost" (click)="tipOpen.set(!tipOpen())">
              Toggle the tooltip from outside
            </button>
          </span>
          <span slot="content">
            A contract can describe this bubble. It cannot yet say what opens it, or where it goes.
          </span>
        </div>
      </ds-specimen>

      <ds-specimen
        name="Field"
        of="Field"
        note="A generated component composing another generated component. The ARIA wiring is identical across the three: named by the label, described by the description and the error, error hidden until invalid."
      >
        <div dsField [invalid]="invalid()">
          <span slot="label">Email address</span>
          <span slot="description">We only use this to send receipts.</span>
          @if (invalid()) {
            <span slot="error">That does not look like an email address.</span>
          }
          <input
            slot="control"
            dsTextField
            [(value)]="email"
            placeholder="you@example.com"
            [invalid]="invalid()"
          />
        </div>
      </ds-specimen>
    </main>
  `,
})
export class App {
  readonly wifi = signal(true);
  readonly email = signal('');
  readonly plan = signal('monthly');
  readonly tipOpen = signal(false);
  readonly terms = signal<'unchecked' | 'checked' | 'mixed'>('mixed');
  readonly volume = signal(40);
  readonly dialogOpen = signal(false);
  readonly tab = signal('overview');
  readonly openSections = signal(['what']);

  readonly invalid = computed(() => this.email().length > 0 && !this.email().includes('@'));

  // Angular templates cannot call arbitrary globals, only members of this class.
  protected readonly min = Math.min;
  protected readonly max = Math.max;
}
