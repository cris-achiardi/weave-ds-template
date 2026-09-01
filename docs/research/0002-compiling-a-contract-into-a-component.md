# Compiling a contract into a component — the Switch spike

- **Date:** 2026-09-01
- **Source:** `packages/contracts/components/Switch/Switch.contract.json` +
  `packages/react/bindings/Switch.react.json`, compiled by `packages/react/src/emit/emit.mjs` (a
  throwaway probe, not the emitter). Output rendered in `apps/sandbox` and driven in Chrome.
- **Method:** Wrote the smallest emitter that could produce a working React Switch from a contract,
  then ran it, wired the result into the sandbox, and exercised it in a browser: uncontrolled toggle,
  controlled toggle driven from the page, and the disabled and read-only refusals. Accessibility was
  checked by reading the browser's accessibility tree, not by inspecting the markup.

  The emitter records every decision it had to make that the contract could not supply, in an
  `EMITTER_ASSUMPTIONS` list it prints on each run. **That list is the actual finding**; the working
  component is only the evidence that the list is complete enough to compile.

  **Not covered:** one component, one framework, one backend author. `Switch` has a single `shared`
  state, no compound structure, and no keyboard model beyond the platform's own — so nothing here
  exercises the behaviour vocabulary, the `layout` block against a positioned component, or a second
  framework, which is the case most likely to break the rules in ADR 0004. Regeneration was run
  repeatedly but never against a consumer who had edited the emitted files. No test suite was
  written; correctness was established by driving the page.

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

5. **Is `internal` too coarse?** It behaved correctly here, where both `internal` states are
   platform-observed. It has not been tested against an ancestor-owned state, which is the case ADR
   0004 flagged as the reason three values might be too few.

6. **What does form participation look like, given the button-not-checkbox choice?** The binding chose
   a button for styleability and lost form submission. A hidden input alongside is the usual answer
   and is a decision no contract currently records.
