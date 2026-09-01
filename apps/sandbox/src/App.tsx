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
 * Four contracts went in. They did NOT come out equal, and the page says so per specimen — the
 * point of this harness is to show how far each contract got, not to hide the difference.
 */

import { useState, type ReactNode } from 'react';
import { Switch } from './components/Switch';
import { Field } from './components/Field';
import { Accordion } from './components/Accordion';
import { AccordionItem } from './components/AccordionItem';

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
  const invalid = email.length > 0 && !email.includes('@');

  return (
    <main className="sandbox">
      <header>
        <h1>Design system sandbox</h1>
        <p>
          Four contracts, compiled by <code>packages/react/src/emit/emit.mjs</code>. Each specimen
          is labelled with how far its contract actually got — see{' '}
          <code>docs/research/0002-compiling-a-contract-into-a-component.md</code>.
        </p>
      </header>

      <Specimen
        name="Switch"
        verdict="works"
        note="Fully compiled. checked is control: shared and the role is a known self-toggling one, so the emitter wired activation and generated the whole controlled/uncontrolled trio. disabled and read-only are control: consumer — one prop each, no callback."
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
        name="Field"
        verdict="partial"
        note="Structure and slots compiled: label, control, description and error became content props. Its STATES did not. invalid, touched and dirty are control: shared, but nothing in the contract says what changes them — so they work when controlled from outside, and their uncontrolled form can never move. The emitted file says so in a comment where the setter would be."
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

      <Specimen
        name="Accordion + AccordionItem"
        verdict="shell"
        note="Compiled to correct, inert markup. The contract never declares the open set as a state — it describes it only in intent.behaviour prose — so no value, no onValueChange, and no way to open a section. Nothing here is broken; the contract simply does not contain the component's central fact. This is the behaviour-vocabulary gap, made visible."
      >
        <Accordion>
          <AccordionItem
            heading="What is a contract?"
            panel="The specification a component is generated from."
          />
          <AccordionItem
            heading="Why is nothing opening?"
            panel="Because the contract does not say what opening means."
          />
        </Accordion>
      </Specimen>
    </main>
  );
}
