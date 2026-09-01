/**
 * The sandbox page.
 *
 * SPIKE STATE. Everything under ./components was GENERATED from a contract:
 *
 *   node packages/react/src/emit/emit.mjs <Name> --out apps/sandbox/src/components
 *
 * Nothing is imported from @ds/react, which exports no components and never will. The components
 * live here, in the consumer's own tree, which is the architecture in one import path.
 *
 * Eleven contracts went in. They did NOT come out equal, and the page says so per specimen — the
 * point of this harness is to show how far each contract got, not to hide the difference.
 */

import { useState, type ReactNode } from 'react';
import { Switch } from './components/Switch';
import { Field } from './components/Field';
import { Accordion } from './components/Accordion';
import { AccordionItem } from './components/AccordionItem';
import { RadioGroup } from './components/RadioGroup';
import { RadioItem } from './components/RadioItem';
import { Tooltip } from './components/Tooltip';
import { Button } from './components/Button';
import { Checkbox } from './components/Checkbox';
import { TextField } from './components/TextField';
import { Slider } from './components/Slider';

function Specimen({
  name,
  verdict,
  note,
  children,
}: {
  name: string;
  verdict: 'works' | 'partial' | 'shell';
  note: string;
  children: ReactNode;
}) {
  return (
    <section className="specimen">
      <h2>
        {name} <span className={`verdict verdict-${verdict}`}>{verdict}</span>
      </h2>
      <p className="specimen-note">{note}</p>
      <div className="specimen-row">{children}</div>
    </section>
  );
}

function Labelled({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <span className="labelled">
      {children}
      <label htmlFor={id}>{label}</label>
    </span>
  );
}

export function App() {
  const [wifi, setWifi] = useState(true);
  const [email, setEmail] = useState('');
  const [plan, setPlan] = useState('monthly');
  const [tipOpen, setTipOpen] = useState(false);
  const [terms, setTerms] = useState<'unchecked' | 'checked' | 'mixed'>('mixed');
  const [volume, setVolume] = useState(40);
  const invalid = email.length > 0 && !email.includes('@');

  return (
    <main className="sandbox">
      <header>
        <h1>Design system sandbox</h1>
        <p>
          Eleven contracts, compiled by <code>packages/react/src/emit/emit.mjs</code>. Each specimen
          is labelled with how far its contract actually got — see{' '}
          <code>docs/research/0002-compiling-a-contract-into-a-component.md</code>.
        </p>
      </header>

      <Specimen
        name="Button"
        verdict="works"
        note="The first component to use `axes` and `whenAxis`, which had sat in the schema unread since before this branch. Three axes became three typed props with defaults, each value reaches the DOM as its own data attribute, and every socket in the theme file below was generated from whenAxis rather than written by hand. hierarchy is the RANK of the action; variant is its colour. They are separate axes so that a secondary destructive action can be said at all."
      >
        <Button hierarchy="primary">Save changes</Button>
        <Button hierarchy="secondary">Cancel</Button>
        <Button hierarchy="tertiary">Learn more</Button>
        <Button hierarchy="primary" variant="danger">
          Delete project
        </Button>
        <Button hierarchy="secondary" variant="danger">
          Delete
        </Button>
        <Button hierarchy="secondary" variant="brand">
          Upgrade
        </Button>
      </Specimen>

      <Specimen
        name="Button — size and state"
        verdict="works"
        note="size is a contiguous subset of the canon's ladder. loading is control: consumer and authored — no platform provides it — and the contract promises the label does not move, so the spinner takes the leading icon's slot rather than replacing the text."
      >
        <Button size="s">Small</Button>
        <Button size="m">Medium</Button>
        <Button size="l">Large</Button>
        <Button hierarchy="primary" loading>
          Saving
        </Button>
        <Button disabled>Disabled</Button>
        <Button hierarchy="primary" iconStart={<span>+</span>}>
          With icon
        </Button>
      </Specimen>

      <Specimen
        name="Checkbox"
        verdict="works"
        note="The first state in this library with THREE values rather than two. `checked` is unchecked | checked | mixed, and mixed is not a third click target — activates.between names the two a user may reach, so a mixed checkbox resolves to checked, which is what the APG specifies. The tick and the dash are different shapes, not one mark at two opacities, because they report different facts."
      >
        <Checkbox
          checked={terms}
          onCheckedChange={setTerms}
          label={`Select all (currently ${terms})`}
        />
        <Checkbox defaultChecked="checked" label="Marketing email" />
        <Checkbox label="Product updates" />
        <Checkbox defaultChecked="mixed" label="Partly chosen" />
        <Checkbox invalid label="Required, and unanswered" />
        <Checkbox disabled defaultChecked="checked" label="Disabled" />
      </Specimen>

      <Specimen
        name="TextField"
        verdict="partial"
        note="The first state whose value is free text: not a boolean, not one of a fixed set. valueType: string was added to the schema for it. Typing works — but only because the binding renders a native input and the emitter knows an input edits its own value. Nothing in the contract says typing changes anything."
      >
        <TextField placeholder="Uncontrolled" />
        <TextField size="s" placeholder="Small" />
        <TextField size="l" placeholder="Large" />
        <TextField invalid defaultValue="not an email" />
        <TextField readOnly defaultValue="Read-only" />
        <TextField disabled placeholder="Disabled" />
      </Specimen>

      <Specimen
        name="Slider"
        verdict="shell"
        note="A number in a range — valueType: number with min, max and step, all new to the schema. aria-valuemin/max/now are generated from them. Nothing else is: no arrow keys, no drag, no stepping. And the fill's length and the thumb's offset ARE the value. The page has to hand the number back in as a CSS custom property for the theme to do arithmetic on, because the contract cannot say that a part's size is derived from a state."
      >
        <Slider
          value={volume}
          onValueChange={setVolume}
          aria-label="Volume"
          style={{ ['--value' as string]: volume }}
        />
        <span className="readout">value: {volume}</span>
        <button
          type="button"
          className="ghost"
          onClick={() => setVolume((v) => Math.max(0, v - 10))}
        >
          −10
        </button>
        <button
          type="button"
          className="ghost"
          onClick={() => setVolume((v) => Math.min(100, v + 10))}
        >
          +10
        </button>
      </Specimen>

      <Specimen
        name="Switch"
        verdict="works"
        note="checked is control: shared and the root declares activates, so the emitter generated the controlled/uncontrolled trio and wired the click. disabled and read-only are control: consumer — one prop each, no callback."
      >
        <Labelled id="s1" label="Notifications">
          <Switch id="s1" defaultChecked />
        </Labelled>
        <Labelled id="s2" label="Wi-Fi (controlled)">
          <Switch id="s2" checked={wifi} onCheckedChange={setWifi} />
        </Labelled>
        <button type="button" className="ghost" onClick={() => setWifi((v) => !v)}>
          Toggle from outside
        </button>
        <Labelled id="s3" label="Disabled">
          <Switch id="s3" disabled defaultChecked />
        </Labelled>
        <Labelled id="s4" label="Read-only">
          <Switch id="s4" readOnly defaultChecked />
        </Labelled>
      </Specimen>

      <Specimen
        name="Accordion + AccordionItem"
        verdict="works"
        note="The parent declares a collection with cardinality: many; the item declares membership, and its trigger declares activates. From that the emitter generated the context, the toggle, the aria-expanded/controls/labelledby triangle and the hidden panel."
      >
        <Accordion defaultValue={['what']}>
          <AccordionItem
            value="what"
            heading="What is a contract?"
            panel="The agnostic specification a component is generated from. It is the thing this library ships; the component is output."
          />
          <AccordionItem
            value="why"
            heading="Why does this one open?"
            panel="Because the contract says what opening means: the accordion holds a selection, this item is a member of it, and the trigger toggles that membership."
          />
          <AccordionItem
            value="disabled"
            disabled
            heading="This one is disabled"
            panel="You should not be able to read this."
          />
        </Accordion>
      </Specimen>

      <Specimen
        name="RadioGroup + RadioItem"
        verdict="partial"
        note="Mouse selection works, and cardinality: one behaves correctly — clicking the chosen option does nothing, unlike the accordion. The KEYBOARD does not. The APG requires arrow keys that move and select, wrapping, and a roving tabindex with exactly one option in the Tab order. Nothing in the contract can express any of that, so every option is tabbable and the arrows do nothing. Tab through it and compare with what the contract describes in prose."
      >
        <RadioGroup
          aria-label="Billing period"
          value={plan}
          onValueChange={setPlan}
          className="radio-row"
        >
          <RadioItem value="monthly" label="Monthly" />
          <RadioItem value="yearly" label="Yearly (2 months free)" />
          <RadioItem value="lifetime" disabled label="Lifetime (sold out)" />
        </RadioGroup>
        <span className="readout">chosen: {plan}</span>
      </Specimen>

      <Specimen
        name="Tooltip"
        verdict="shell"
        note="Correct structure — role=tooltip, the trigger described by the popup only while it is open, hidden when closed. Nothing opens it. The contract says hover-after-a-delay and focus, in prose; activates covers clicks only, so the emitted component exposes open and never sets it. Positioning is absent too: no anchor, no side, no collision handling, and the placement axis it declares is read by nothing."
      >
        <Tooltip
          open={tipOpen}
          onOpenChange={setTipOpen}
          trigger={
            <button type="button" className="ghost" onClick={() => setTipOpen((v) => !v)}>
              Toggle the tooltip from outside
            </button>
          }
          content="A contract can describe this bubble. It cannot yet say what opens it, or where it goes."
        />
      </Specimen>

      <Specimen
        name="Field"
        verdict="partial"
        note="Now composing a generated TextField rather than a raw input — the first contract whose slot is filled by another contract's output. Slots and the ARIA wiring compile: the control is named by the label and described by the description and the error, in that order, and the error is hidden until invalid. Its STATES still do not — invalid, touched and dirty are control: shared, but nothing says what changes them, so they work controlled and their uncontrolled form cannot move."
      >
        <Field
          label="Email address"
          description="We only use this to send receipts."
          error={invalid ? 'That does not look like an email address.' : undefined}
          invalid={invalid}
          control={
            <TextField
              value={email}
              placeholder="you@example.com"
              invalid={invalid}
              onValueChange={setEmail}
            />
          }
        />
      </Specimen>
    </main>
  );
}
