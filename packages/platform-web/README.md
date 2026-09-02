# `@ds/platform-web`

**What the web platform is, as data.** Which ARIA attribute a state maps to, which roles accept it,
which elements have a native `disabled`, which are focusable, which carry an implicit role, and how
the browser hides a thing.

## Why this package exists

A survey of `packages/react/src/emit/emit.mjs` found **13 named lookup tables, of which exactly 2
were React** — the ones mapping an element to its React typings. The other eleven were web-platform
knowledge sitting in a React file, and they got there by default rather than by decision.

That matters because a **Vue, Angular or web-components emitter needs all eleven**, and a Flutter or
React Native emitter needs **none of them** and needs its own equivalent. So there are three layers,
not two:

| Layer                  | Holds                                   | Shared by           |
| ---------------------- | --------------------------------------- | ------------------- |
| `@ds/contracts`        | what the component _is_                 | everyone            |
| **`@ds/platform-web`** | **ARIA, DOM, focus, native attributes** | every _web_ backend |
| `@ds/react`            | one framework's idiom                   | React only          |

The evidence that this is worth separating is not tidiness. **The same class of defect appeared five
times in five code paths** — a state reaching no ARIA attribute or the wrong one: radios with no
`aria-checked`, tabs with no `aria-selected`, a tooltip with a bogus `aria-expanded`,
`aria-selected` on `role="tabpanel"`, `aria-expanded` on `role="dialog"`. Each was found by hand, and
none of them is something a typechecker or a linter in this repo can see. Those five are now
conformance cases in [`conformance/`](./conformance/).

## The boundary

The mirror of the rule in `@ds/contracts`:

> **If it would still be true in a Vue, Svelte or Lit backend rendering the same DOM, it belongs
> here.**

So `aria-checked`, `disabled`, `hidden` and `:focus-visible` belong. `tabIndex`, `readOnly`,
`className` and `htmlFor` do **not** — those are React's spellings of DOM names, and they stay in
`packages/react`. Neither does anything a contract already says: this package describes the
platform, never a component.

## What is here

| Path                             | Holds                                           |
| -------------------------------- | ----------------------------------------------- |
| `profile.json`                   | the data. The specification.                    |
| `resolve.mjs`                    | pure functions over it, for JavaScript backends |
| [`conformance/`](./conformance/) | executable cases a backend must satisfy         |

**The JSON is the specification; `resolve.mjs` is a convenience.** A Dart or Swift emitter reads the
same `profile.json`, writes its own resolver, and runs the same conformance cases. That is the whole
arrangement, and it is the same one `@ds/contracts/conformance` uses for keyboard behaviour.

## Three tables, not one

`profile.json` keeps `states`, `aria` and `elements` separate, and the separation is deliberate:

- **`states` is keyed by a CONTRACT word** — `checked`, `read-only`, `hover`. It says which channels
  the platform offers for carrying that word.
- **`aria` is keyed by an ARIA ATTRIBUTE** — because that is how WAI-ARIA defines these facts, and
  because two contract words can map to one attribute. Merging it into `states` would duplicate
  `aria-expanded`'s ten-role list the moment a contract spells the state `expanded` as well as
  `open`, and the two copies could then drift with nothing to catch it. Kept attribute-keyed, the
  role lists are one block a reader can diff against the specification.
- **`elements` is keyed by an ELEMENT NAME** and carries capabilities.

The collapse that _was_ worth doing: `disabled` used to live in three separate tables and is now one
entry with three keys.

## Transcription, not correction

**Every list here was copied as it was found, including where it is wrong.** `aria-expanded`'s roles
are incomplete against WAI-ARIA 1.2. `aria-disabled` is treated as unrestricted when the
specification supports it per role. `<a>` is marked unconditionally focusable when it is focusable
only with an `href`. Each carries a `_note` saying so.

That is not laziness. The extraction was proved correct by regenerating all fifteen components and
requiring a byte-identical diff, and a correction smuggled in alongside a move destroys that proof —
you can no longer tell which change caused a difference. **Corrections are separate commits with
their own diffs.**

## Known divergences, recorded rather than smoothed

- **`implicitRole` and `bearsRole` disagree on `textarea` and `dialog`.** They look like one fact and
  are two: one suppresses a `role` attribute, the other admits an ARIA state attribute. The emitter's
  role-bearing check listed two elements while its implicit-role table listed four. No binding
  renders a `<textarea>`, and Dialog declares its own role, so the disagreement has never been
  observable — which is exactly why collapsing them would have passed every test and shipped a
  silent behaviour change.
- **The member-reflection path does not apply the role-bearing gate** that the root path applies.
  A member reflecting `invalid` on a roleless element would get `aria-invalid` where the identical
  root state would get a data attribute. The conformance cases deliberately do **not** assert this,
  because asserting it would freeze an inconsistency as a requirement.
- **`read-only` has no `native` key** even though the platform has a `readonly` attribute on `input`
  and `textarea`. Adding it would reroute TextField's state. It currently emits both `aria-readonly`
  and React's `readOnly`, which is the duplication `packages/react/src/emit/README.md` §2 warns
  against.

## What did not move, and why that is not a failure

The `<dialog>` topology — two effects, a composed ref, a `MutationObserver` — stays in the React
emitter. It is not a lookup; it is a shape, and expressing it as data would mean inventing a template
language.

What moved is the **flag**. The emitter no longer asks `el === 'dialog'`; it asks whether this
element's visibility is `imperative`, and enters that code path _because the profile said so_. A
second web backend reads the same flag and knows it owes the topology. A non-web backend reads
`supplies` and learns exactly which four behaviours it must implement by hand, instead of
discovering them one accessibility bug at a time.
