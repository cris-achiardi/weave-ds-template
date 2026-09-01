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
 * Seven contracts went in. They did NOT come out equal, and the page says so per specimen — the
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
  const invalid = email.length > 0 && !email.includes('@');

  return (
    <main className="sandbox">
      <header>
        <h1>Design system sandbox</h1>
        <p>
          Seven contracts, compiled by <code>packages/react/src/emit/emit.mjs</code>. Each specimen
          is labelled with how far its contract actually got — see{' '}
          <code>docs/research/0002-compiling-a-contract-into-a-component.md</code>.
        </p>
      </header>

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
        note="Slots and the ARIA wiring now compile: the control is named by the label and described by the description and the error, in that order, and the error is hidden until invalid. Its STATES still do not — invalid, touched and dirty are control: shared, but nothing says what changes them, so they work controlled and their uncontrolled form cannot move."
      >
        <Field
          label="Email address"
          description="We only use this to send receipts."
          error={invalid ? 'That does not look like an email address.' : undefined}
          invalid={invalid}
          control={
            <input
              className="text-input"
              value={email}
              placeholder="you@example.com"
              onChange={(e) => setEmail(e.target.value)}
            />
          }
        />
      </Specimen>
    </main>
  );
}
