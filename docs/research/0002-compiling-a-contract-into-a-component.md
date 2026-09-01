# Compiling contracts into components — the emitter spike

- **Date:** 2026-09-01
- **Source:** the four contracts in `packages/contracts/components/` — `Switch`, `Field`,
  `Accordion`, `AccordionItem` — with their bindings in `packages/react/bindings/`, compiled by
  `packages/react/src/emit/emit.mjs` (a throwaway probe, not the emitter). Output rendered in
  `apps/sandbox` and driven in Chrome.
- **Method:** Wrote the smallest emitter that could produce a working React Switch, ran it, wired the
  result into the sandbox, and exercised it in a browser. Then pointed the same emitter at the other
  three contracts to find out what it had silently assumed. Accessibility was checked by reading the
  browser's accessibility tree rather than by inspecting markup — which turned out to matter.

  The emitter records every decision it had to make that the contract could not supply, in an
  `EMITTER_ASSUMPTIONS` list it prints on each run. **That list is the actual finding**; the working
  components are only evidence that the list is complete enough to compile.

  **Not covered:** one framework, one backend author, four contracts. No second framework, which is
  the case most likely to break the rules in ADR 0004. No test suite — correctness was established by
  driving the page. Regeneration was run repeatedly but never against a consumer who had edited the
  emitted files. The emitted components are not covered by `pnpm typecheck`, which reaches only
  `packages/react`; they were typechecked by invoking `tsc` directly, and nothing in CI does that.

## What is there (measured)

### A contract compiled into a working component

`node packages/react/src/emit/emit.mjs Switch --out apps/sandbox/src/components` produced four
files. Three are regenerated on every run; `Switch.theme.css` is written once and then left alone.

The sandbox renders it, and it behaves:

| Exercise                                 | Result                                                       |
| ---------------------------------------- | ------------------------------------------------------------ |
| Uncontrolled switch, clicked             | toggled on; thumb travelled; component owned its own state   |
| Controlled switch, toggled from the page | flipped, and the page's own label updated — callback fired   |
| `disabled`, clicked                      | did not toggle                                               |
| `readOnly`, clicked                      | did not toggle                                               |
| Browser accessibility tree               | seven nodes, each `switch` with its label as accessible name |

Console was clean; the only exception came from a browser extension.

### The prop surface was generated, not written

`states` produced exactly what ADR 0004's `controlRules` specify, with no per-component mapping:

| State in contract | `control`  | Props emitted                                  |
| ----------------- | ---------- | ---------------------------------------------- |
| `checked`         | `shared`   | `checked`, `defaultChecked`, `onCheckedChange` |
| `disabled`        | `consumer` | `disabled`                                     |
| `read-only`       | `consumer` | `readOnly`                                     |
| `hover`           | `internal` | — none —                                       |
| `focus-visible`   | `internal` | — none —                                       |

The controlled/uncontrolled machinery — `const controlled = checked !== undefined`, the internal
`useState` seeded from `defaultChecked`, the callback firing either way — was generated from the
single word `shared`.

### The emitter had to decide three things the contract does not state

It printed these itself:

**1. How a state reaches the DOM.** The contract says `checked` exists and who may set it. It never
says whether that becomes `aria-checked`, a `data-ds-state`, or a native attribute. The emitter chose
ARIA where one exists, the native attribute for `disabled`, and `data-<prefix>-state` otherwise.

**2. Structural CSS.** Nothing in the contract states that the thumb must be out of flow. The
emitter hardcodes `position: absolute` on every non-root part.

**3. A scoping selector.** With no CSS Modules there is no hashing, so `[data-ds-part='root']` would
match every component on a page. The emitter invented `data-ds-component="Switch"` on the root.

### The theme file is a complete list of sockets

`Switch.theme.css` was emitted with 18 commented channels across two parts and four states, each
grouped under a selector the emitter derived. Filling it took one pass with no reference to any other
file — and one line had to be added that the contract never named: `inset-inline-start` on the thumb,
which is positioning rather than paint.

### Regeneration preserves the consumer's file, and is not byte-stable

Re-running the emitter over its own output:

| File                   | Result                                                    |
| ---------------------- | --------------------------------------------------------- |
| `Switch.theme.css`     | **kept** — reported as `kept (yours — never regenerated)` |
| `Switch.structure.css` | byte-identical                                            |
| `Switch.tsx`           | **differs**                                               |

The cause is not the emitter being non-deterministic. It emits this:

```tsx
export interface SwitchProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'checked' | 'defaultChecked' | ...> {
```

and Prettier reflows it to this:

```tsx
export interface SwitchProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'checked' | 'defaultChecked' | ...
> {
```

So `emit → format` and `format → emit` produce different bytes, indefinitely.

### One check ran here that runs nowhere else

The emitter resolves `binding.contract` and fails if it does not point at the contract it just read.
`verify:contract` does not do this — the gap ADR 0002 named as a way this could fail quietly.

### The other three contracts did not compile equally

Pointing the same emitter at `Field`, `Accordion` and `AccordionItem`:

| Contract        | Verdict     | What compiled                         | What did not                                                        |
| --------------- | ----------- | ------------------------------------- | ------------------------------------------------------------------- |
| `Switch`        | **works**   | everything                            | —                                                                   |
| `Field`         | **partial** | anatomy, and 4 slots as content props | all 3 of its `shared` states; every ARIA relationship               |
| `Accordion`     | **shell**   | a wrapper and `disabled`              | the open set — no `value`, no `onValueChange`, no `multiple`        |
| `AccordionItem` | **shell**   | anatomy, 2 slots, `disabled`          | its identity, its open state, and its role landed on the wrong node |

**The first emitter was Switch-shaped, and the other contracts proved it.** v1 hardcoded
`ButtonHTMLAttributes`, `type="button"`, `aria-checked` and a click-to-toggle handler into every
component it touched. Run against `Field` it produced a `<div>` carrying `type="button"` and
`aria-checked`, referencing an undeclared `readOnly` variable. Those were emitter bugs, not contract
gaps, and v2 moved each one out of the template — element type now comes from the binding, and
activation is wired only for roles that are self-toggling.

**TypeScript then found a gap the emitter had not logged.** With the assumptions removed, `Field`
emitted three state setters that nothing calls:

```
Field.tsx(47,27): error TS6133: 'setInvalidInternal' is declared but its value is never read.
Field.tsx(50,27): error TS6133: 'setTouchedInternal' is declared but its value is never read.
Field.tsx(53,25): error TS6133: 'setDirtyInternal' is declared but its value is never read.
```

`invalid`, `touched` and `dirty` are all `control: shared`, so a consumer may set them — but nothing
in the contract says what _changes_ them. The emitter now emits the setter with a comment saying so,
because the developer reading the file is the person who needs to know.

### Field renders correctly and does not work

The most consequential result, and it is invisible in a screenshot. Reading the accessibility tree
of the rendered `Field`:

```
generic "Email address"                            <- the label, not a label
generic "We only use this to send receipts."       <- the description, unassociated
generic "That does not look like an email address." <- the error, unannounced
textbox "you@example.com"                          <- named by its PLACEHOLDER
```

Every part rendered. Nothing was wired. The control's accessible name is its placeholder, the error
is not announced when it appears, and `aria-invalid` is absent — because the relationships between
those parts exist only as prose in `intent.behaviour`. `Field` exists to do exactly one job, and the
generated component does not do it while looking complete.

### A component's role landed on the wrong node

`AccordionItem` declares `semantics.role: "button"`, and its binding says in prose:

> The contract's `semantics.role` of `button` lands on the `trigger` part, not on the rendered root.

The emitter put it on the root. The accessibility tree confirms the result: the whole item —
heading _and_ panel together — is announced as one button. Nothing in either schema has a field for
which node a role belongs to, so the binding could only say it in a note.

### Slot names and part names do not have to match, and nothing reconciles them

`Field` declares slots `label`, `control`, `description`, `error`; its anatomy names parts `label`,
`description`, `error`. `control` has no part, so the emitter rendered it bare, after the parts —
putting the input _below its own error message_. `AccordionItem` has the same mismatch between its
`heading` slot and its `header` part.

### Guessing structure from prose failed silently

Between v1 and v2 the emitter stopped hardcoding layout and tried to infer it, by matching
`/out of flow|position/i` against each state's `visual` prose. `Switch`'s prose says _"The thumb sits
at the end of the track"_ — no match — so it emitted `display: block` and no positioning. **The thumb
collapsed onto the track**, silently, and the contract's stated promise about position carrying the
state became false.

v3 therefore emits no layout at all and says so in the file. `Switch`'s real layout now lives in the
consumer's `theme.css` under a banner explaining that it is in the wrong place.

## What it appears to mean (inferred)

Every item below is a reading, not a measurement.

**The central claim of ADR 0004 survived its first contact with a compiler.** One word in a contract
generated three correctly-wired props, and `internal` correctly generated nothing. That is one
component in one framework, so it is evidence rather than proof — but it is the first evidence of any
kind that a contract can be compiled rather than only read.

**The three assumptions look like one problem wearing three hats: the contract describes a
component's meaning but not its realisation.** Which attribute carries a state, where a part sits,
how a component is scoped — each is a decision a second backend must also make, with nothing to guide
it toward the same answer. Two backends would produce components that satisfy the same contract and
disagree about the DOM, which would surface as consumers' CSS working in React and not in Vue.

**The `layout` gap now looks larger than a missing block.** It is not only that structural CSS has
nowhere to be declared — the emitter had to _invent_ the structure, meaning the layout on which the
contract's stated promise depends is currently a property of the emitter, per component, unreviewable
and ungated. The `inset-inline-start` line that ended up in the consumer's theme file is the same
problem leaking one layer further out.

**`data-ds-component` looks like a real gap in the anatomy convention, not just this spike's
shortcut.** The repo documents `data-<prefix>-part` and `data-<prefix>-state` and stops there. Any
unstyled library that abandons CSS Modules needs a component-level handle, and inventing one per
backend would break the promise that part attributes are a stable styling surface.

**The four contracts appear to fall into three kinds, and only one kind compiles today.** A
component whose behaviour the platform already provides (`Switch`) compiles completely. One whose job
is wiring relationships between its own parts (`Field`) compiles its shape and none of its purpose.
One whose central fact is a shared piece of state across children (`Accordion`) compiles to an inert
wrapper. If that reading holds, the missing pieces are not a list of fields — they are one missing
layer, and `Switch` only worked because the browser supplied that layer for free.

**`Field` looks like the strongest argument yet that relationships need a home in the schema.** It is
not that the generated component is unfinished; it is that it is _finished-looking and inert_, which
is the failure mode this repo repeatedly says it fears. A reviewer glancing at the sandbox sees a
label, a description, an error and an input, and has no way to notice that none of them know about
each other.

**Role-on-a-part looks like a small schema change with a large blast radius.** `semantics.role`
currently implies "the root", and for `AccordionItem` that is wrong in a way that produces a real
accessibility defect. Whether the fix belongs in the contract (a role per anatomy part) or in the
binding (a `roleTarget`, alongside the existing `refTarget` and `classNamePassthrough`) turns on
whether "which region carries the meaning" is a framework question. It does not appear to be one.

**The slot/part mismatch suggests slots and anatomy are describing the same thing twice.** A slot is
where content goes; a part is a named region. `Field`'s `label` slot and `label` part are the same
place, and the emitter reconciled them by name — which worked by luck, and failed for `control` and
for `heading`/`header`.

**Regeneration safety is currently a convention, not a mechanism.** The emitter skips
`theme.css` when it exists, which is the right behaviour and is enforced by one `existsSync`. Nothing
marks the generated files as generated in a way a tool could check, and nothing would stop a
consumer's edit to `Switch.tsx` being silently overwritten.

**The read-only state is a live example of a contract promising something no one can see.** It
declares `visual: "NOT DECIDED"`, and the rendered switch confirms it: read-only looks identical to
interactive. The honesty worked — nothing was invented — but the component ships a state a user
cannot perceive.

## Problems found

**1. The contract cannot say how a state reaches the DOM, and that is a portability problem.**
A consumer styling `[aria-checked='true']` against a React build would find a Vue build using
`data-state="checked"`, with both backends conformant. The binding notes say what React chose, in
prose that no tool reads.

**2. Structural CSS is invented by the emitter, per component.**
The contract's promise — _the thumb's position carries the state for anyone who cannot rely on
colour_ — is implemented by three lines the emitter hardcoded. No contract states them, no gate
checks them, and a second backend would rewrite them from scratch.

**3. Positioning leaked into the consumer's file.**
`inset-inline-start` on the thumb is structure, and it ended up in `theme.css` because the emitter did
not know it was needed. A consumer who deletes their theme file gets a broken component rather than an
unstyled one, which is not the promise.

**4. There is no component-level styling handle in the convention.**
The emitter invented `data-ds-component`. It works, and it is undocumented, unversioned and unowned.

**5. Nothing marks generated files as generated, mechanically.**
`Switch.tsx` and `Switch.structure.css` carry a comment. `prop-map.md` solves the same problem with a
byte-equality check; nothing equivalent protects emitted components, and the regeneration check that
ADR 0002 anticipated is still unwritten.

**5b. And that regeneration check cannot be byte-equality, which is what ADR 0002 assumed.**
Prettier owns formatting in this repo and reflows the emitter's output, so `emit → format` and
`format → emit` disagree forever. A byte-comparing gate would fail on every run and be switched off
within a week — the exact failure the repo's own rule about day-one gates warns about. This is not a
new problem here: `adr-index.mjs` compares _parsed rows_ rather than bytes for the same reason, and
says so in its header.

**5c. `pnpm verify` does not typecheck emitted components.**
`typecheck` runs against `packages/react/tsconfig.json`, whose `include` is `src`. The sandbox has no
tsconfig at all. The three dead-setter errors above were found by invoking `tsc` by hand; nothing in
`pnpm verify` or CI would have caught them, and nothing would catch an emitter that starts producing
uncompilable code.

**7. `Field` compiles to something that looks right and does nothing.**
Every part renders; no relationship is wired. The control is named by its placeholder, the error is
not announced, `aria-invalid` is absent. The relationships are stated only as prose in
`intent.behaviour`, so the emitter cannot see them — and a reviewer looking at the rendered result
cannot see their absence.

**8. `semantics.role` is assumed to belong to the root, and sometimes does not.**
`AccordionItem`'s role belongs to its `trigger`. The emitter put it on the root, making the entire
section — heading and panel — announce as a single button. The binding states the correct target in
a prose note because neither schema has a field for it.

**9. A slot with no matching anatomy part has nowhere to go.**
`Field`'s `control` slot rendered after the parts, placing the input below its own error message.
Nothing declares which part a slot fills, and nothing declares the order parts render in.

**10. `Accordion` cannot be compiled from its contract at all.**
Its central fact — which sections are open — is described in `intent.behaviour` prose and appears in
no machine-readable field. It is not a state, not an axis, not a slot. The generated component is
correct and inert, and no emitter improvement can fix that: the information is not there.

**6. The generated Switch cannot participate in a form.**
It renders a `<button role="switch">` with no form control behind it. The contract has no way to
express form participation, so the emitter correctly did not fake it — but the component is
consequently unusable in a plain HTML form, which a consumer will discover at integration time.

## Open questions

1. **Where does the state-to-DOM mapping live?** It is not agnostic — `aria-checked` is a web idea —
   so it does not belong in the contract. But leaving it to each backend guarantees divergence. A
   third artifact, owned by the contracts package and describing the _web platform_ rather than any
   framework, is one possible answer; a required section in each binding is another.

2. **What is in the `layout` block, and who writes it?** Enough to place a thumb out of flow, a
   popover against an anchor, a panel that animates from zero height. The risk is obvious: a layout
   vocabulary rich enough to be useful is CSS with extra steps, which is the failure the behaviour
   vocabulary is designed to avoid. Does it name a small set of named layout primitives, the way the
   behaviour vocabulary names interaction primitives?

3. **Should `data-<prefix>-component` be part of the anatomy convention?** If part attributes are the
   library's stable styling surface, they need scoping, and scoping is currently invented per backend.

4. **How does regeneration prove it has not destroyed consumer work, given that byte-equality is
   ruled out?** Three candidates, none obviously right: the emitter runs Prettier on its own output
   before writing, so emitted and formatted are the same thing; the check formats both sides before
   comparing; or the comparison is structural rather than textual, the way `adr-index` compares
   parsed rows. The first is the smallest and makes the emitter depend on the repo's formatter
   config, which a consumer running it in their own repo will not share.

5. **Where do relationships between parts live?** `Field` needs _this control is named by that
   label, described by that description, and invalidated by that error_. It is not styling, not a
   state and not a slot. An `associations` block on the contract is one answer; making it the
   behaviour vocabulary's job is another, since ARIA relationships are arguably interaction wiring.

6. **Does a role belong to a part rather than a component?** And is that a contract fact or a
   binding one? The evidence says contract — which region carries the meaning is not a framework
   question — but that makes `semantics` a per-part concern rather than a top-level one.

7. **Should a slot name a part?** Something like `"control": { "part": "control" }`, with the schema
   requiring the named part to exist. That reconciles the two vocabularies and gives orphaned slots
   nowhere to hide.

8. **Is `internal` too coarse?** It behaved correctly here, where both `internal` states are
   platform-observed. It has not been tested against an ancestor-owned state, which is the case ADR
   0004 flagged as the reason three values might be too few.

9. **What does form participation look like, given the button-not-checkbox choice?** The binding chose
   a button for styleability and lost form submission. A hidden input alongside is the usual answer
   and is a decision no contract currently records.
