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
 * Fifteen contracts went in. They did NOT come out equal, and the page says so per specimen — the
 * point of this harness is to show how far each contract got, not to hide the difference.
 */

import { useState, type ReactNode } from 'react';
import { CROSS_CUTTING, COUNTS, STATUS, verdictOf, type Verdict } from './status';
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
import { Dialog } from './components/Dialog';
import { Tabs } from './components/Tabs';
import { TabItem } from './components/TabItem';
import { TabPanel } from './components/TabPanel';

/**
 * A specimen labels itself from `status.ts` rather than carrying its own verdict, so the board at
 * the top of the page and the section heading can never disagree. `of` names the contracts on show;
 * the label is the worst of them.
 */
function Specimen({
  name,
  of,
  note,
  children,
}: {
  name: string;
  of: string[];
  note: string;
  children: ReactNode;
}) {
  const verdict = verdictOf(...of);
  return (
    <section className="specimen" id={`specimen-${of[0]}`}>
      <h2>
        {name} <span className={`verdict verdict-${verdict}`}>{verdict}</span>
      </h2>
      <p className="specimen-note">{note}</p>
      <div className="specimen-row">{children}</div>
    </section>
  );
}

/**
 * The board. Fifteen contracts, what each one produced, and what it still owes — the thing that was
 * previously only reconstructable by reading every specimen note on the page.
 */
function StatusBoard() {
  const order: Verdict[] = ['shell', 'partial', 'works'];
  const rows = [...STATUS].sort(
    (a, b) =>
      order.indexOf(a.verdict) - order.indexOf(b.verdict) ||
      // Code-point comparison, not localeCompare — the repo's rule, so an ordering never depends
      // on the machine that produced it.
      (a.component < b.component ? -1 : a.component > b.component ? 1 : 0),
  );
  return (
    <section className="specimen status-board">
      <h2>Status</h2>
      <p className="specimen-note">
        <strong>{COUNTS.works} works</strong>, {COUNTS.partial} partial, {COUNTS.shell} shell. A
        verdict records that someone drove the component in this page against what its contract says
        — not that the code looks right.
      </p>
      <p className="specimen-note">
        The two right-hand columns are deliberately different questions.{' '}
        <strong>Not doing what it says</strong> is a broken promise, and it alone decides the
        verdict: <em>works</em> means that column is empty. <strong>Known, and whose</strong> is
        everything accounted for — an obligation the contract hands to the consumer, or a gap it
        openly admits it cannot express. Mixing the two would make a finished component look
        unfinished and, worse, make a real defect read as a footnote.
      </p>
      <table className="status-table">
        <thead>
          <tr>
            <th>Contract</th>
            <th>Generated</th>
            <th>Not doing what it says</th>
            <th>Known, and whose</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.component}>
              <th scope="row">
                <a href={`#specimen-${r.component}`}>{r.component}</a>{' '}
                <span className={`verdict verdict-${r.verdict}`}>{r.verdict}</span>
              </th>
              <td>{r.supplies}</td>
              <td>
                {r.remaining.length === 0 ? (
                  <span className="nothing">nothing</span>
                ) : (
                  <ul>
                    {r.remaining.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                )}
              </td>
              <td>
                {(r.alsoKnown ?? []).length === 0 ? (
                  <span className="none">—</span>
                ) : (
                  <ul>
                    {(r.alsoKnown ?? []).map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3>True of all fifteen</h3>
      <ul className="cross-cutting">
        {CROSS_CUTTING.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tab, setTab] = useState('overview');
  const invalid = email.length > 0 && !email.includes('@');

  return (
    <main className="sandbox">
      <header>
        <h1>Design system sandbox</h1>
        <p>
          Fifteen contracts, compiled by <code>packages/react/src/emit/emit.mjs</code>. Each
          specimen is labelled with how far its contract actually got — see{' '}
          <code>docs/research/0002-compiling-a-contract-into-a-component.md</code>.
        </p>
      </header>

      <StatusBoard />

      <Specimen
        name="Button"
        of={['Button']}
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
        of={['Button']}
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
        of={['Checkbox']}
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
        of={['TextField']}
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
        of={['Slider']}
        note="A number in a range — valueType: number with min, max and step. It now steps and drags: all four arrows move by one step whatever the orientation, Page Up and Page Down by the jump the contract declares, Home and End to the ends, and a press anywhere on the track jumps the value there and follows the pointer. The fill and the thumb are positioned from --ds-fraction, which the component publishes on its own root, so the page no longer computes geometry and hands it back. What is still the consumer&rsquo;s: the 44px hit area, and aria-valuetext for a range where a bare number means nothing."
      >
        <Slider value={volume} onValueChange={setVolume} aria-label="Volume" />
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
        name="Tabs + TabItem + TabPanel"
        of={['Tabs', 'TabItem', 'TabPanel']}
        note="A collection whose members come in TWO kinds. collection.items had to become a list — a tab and its panel both read the same selection, and a single component name could only admit one of them. The keyboard is generated from collection.navigation: Left/Right move and select, wrapping; Home/End jump to the ends; Down and Up are deliberately left alone so the page still scrolls. The disabled tab stays focusable and refuses to be chosen, which is why it carries aria-disabled rather than the native attribute — a disabled button cannot be focused at all. Each tab now points at its panel and each panel is named by its tab, across the component boundary: controls and namedBy grew a form that names a sibling MEMBER, and the id root grew the component name because a tab and its panel share one identity."
      >
        <Tabs value={tab} onValueChange={setTab} aria-label="Project sections">
          <TabItem value="overview" label="Overview" />
          <TabItem value="activity" label="Activity" />
          <TabItem value="settings" disabled label="Settings" />
          <TabPanel value="overview">
            A collection with two kinds of member. This panel and its tab compare against the same
            value; neither holds it.
          </TabPanel>
          <TabPanel value="activity">
            Selection follows focus in this pattern, which suits panels already in memory and is the
            wrong default for one that fetches. The contract cannot say which was chosen.
          </TabPanel>
          <TabPanel value="settings">
            A panel for the disabled tab. It exists so the tab&rsquo;s aria-controls resolves to
            something: a reference to an id nothing renders is a broken reference, and nothing in
            this system can tell that from a panel that has not mounted yet.
          </TabPanel>
        </Tabs>
      </Specimen>

      <Specimen
        name="Dialog"
        of={['Dialog']}
        note="Now a native <dialog> opened with showModal(). Focus moves inside on open, the page behind is genuinely inert — a programmatic focus() on a button back there is refused — Escape closes it, and focus returns to whatever opened it. The contract states all four and can declare none of them; they follow from an element name. The costs are real and visible: the theme file opens with a reset cancelling the browser&rsquo;s own border, padding and colours, and the open state has to be synced back from the element&rsquo;s attribute with a MutationObserver because the close event never fired. Still missing: pressing the backdrop does nothing, because a backdrop is a pseudo-element and can never be an event target."
      >
        <Button hierarchy="primary" onClick={() => setDialogOpen(true)}>
          Open the dialog
        </Button>
        <Dialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          title="Delete this project?"
          body="Everything in it goes with it. Try tabbing — you will walk straight out of this dialog and into the page behind it, which is the whole gap."
          actions={
            <>
              <Button hierarchy="secondary" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button hierarchy="primary" variant="danger" onClick={() => setDialogOpen(false)}>
                Delete
              </Button>
            </>
          }
        />
      </Specimen>

      <Specimen
        name="Switch"
        of={['Switch']}
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
        of={['Accordion', 'AccordionItem']}
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
        of={['RadioGroup', 'RadioItem']}
        note="Mouse selection works, and cardinality: one behaves correctly — clicking the chosen option does nothing, unlike the accordion. The keyboard now works too, and from the same primitive the tabs use: all four arrows move and select, because the APG groups Right with Down; the sold-out option is skipped rather than kept focusable, which is the one place these two contracts disagree; and exactly one option sits in the Tab order. Home and End are left alone, since the APG lists neither for this pattern — press them and the page scrolls."
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
        of={['Tooltip']}
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
        of={['Field']}
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
