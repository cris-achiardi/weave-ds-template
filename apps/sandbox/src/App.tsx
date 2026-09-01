/**
 * The sandbox page.
 *
 * SPIKE STATE. It is rendering a Switch that was GENERATED from a contract, not written by hand:
 *
 *   node packages/react/src/emit/emit.mjs Switch --out apps/sandbox/src/components
 *
 * The import below therefore points at ./components/Switch — the consumer's own directory — and
 * NOT at @ds/react, which exports no components and never will. That is the whole architecture in
 * one import path: the library ships a specification, and the component lives in your repo.
 *
 * Switch.tsx and Switch.structure.css are regenerated on every run. Switch.theme.css is emitted
 * once, empty, and is ours to fill — it is the only file here a person wrote.
 */

import { useState, type ReactNode } from 'react';
import { Switch } from './components/Switch';

function Specimen({ name, note, children }: { name: string; note?: string; children: ReactNode }) {
  return (
    <section className="specimen">
      <h2>{name}</h2>
      {note ? <p className="specimen-note">{note}</p> : null}
      <div className="specimen-row">{children}</div>
    </section>
  );
}

function Labelled({ id, children, label }: { id: string; label: string; children: ReactNode }) {
  // The contract says a Switch accepts no children and has no accessible name of its own:
  // `composition.children.max: 0`, and an a11y note saying the consumer must supply the name.
  // This is what supplying it looks like.
  return (
    <span className="labelled">
      {children}
      <label htmlFor={id}>{label}</label>
    </span>
  );
}

export function App() {
  const [wifi, setWifi] = useState(true);

  return (
    <main className="sandbox">
      <header>
        <h1>Design system sandbox</h1>
        <p>
          A live harness. The Switch below was generated from{' '}
          <code>packages/contracts/components/Switch/Switch.contract.json</code> — its props came
          from the contract&rsquo;s <code>states</code>, and nothing about it was typed by hand
          except its theme.
        </p>
      </header>

      <Specimen
        name="Switch — uncontrolled"
        note="No value passed. The component owns its own state, because the contract declares checked as control: shared."
      >
        <Labelled id="s1" label="Notifications">
          <Switch id="s1" defaultChecked />
        </Labelled>
        <Labelled id="s2" label="Auto-save">
          <Switch id="s2" />
        </Labelled>
      </Specimen>

      <Specimen
        name="Switch — controlled"
        note={`Value and callback come from the page. Currently ${wifi ? 'on' : 'off'}.`}
      >
        <Labelled id="s3" label="Wi-Fi">
          <Switch id="s3" checked={wifi} onCheckedChange={setWifi} />
        </Labelled>
        <button type="button" className="ghost" onClick={() => setWifi((v) => !v)}>
          Toggle from outside
        </button>
      </Specimen>

      <Specimen
        name="Switch — disabled and read-only"
        note="Both are control: consumer, so each generated exactly one prop and no callback. Disabled leaves the focus order; read-only stays in it and cannot be toggled — try tabbing to each."
      >
        <Labelled id="s4" label="Disabled, off">
          <Switch id="s4" disabled />
        </Labelled>
        <Labelled id="s5" label="Disabled, on">
          <Switch id="s5" disabled defaultChecked />
        </Labelled>
        <Labelled id="s6" label="Read-only, on">
          <Switch id="s6" readOnly defaultChecked />
        </Labelled>
      </Specimen>
    </main>
  );
}
