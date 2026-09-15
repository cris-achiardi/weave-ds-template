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

## Four tables, not one

`profile.json` keeps `states`, `aria`, `native` and `elements` separate, and the separation is
deliberate:

- **`states` is keyed by a CONTRACT word** — `checked`, `read-only`, `hover`. It says which channels
  the platform offers for carrying that word.
- **`aria` is keyed by an ARIA ATTRIBUTE** — because that is how WAI-ARIA defines these facts, and
  because two contract words can map to one attribute. Merging it into `states` would duplicate
  `aria-expanded`'s ten-role list the moment a contract spells the state `expanded` as well as
  `open`, and the two copies could then drift with nothing to catch it. Kept attribute-keyed, the
  role lists are one block a reader can diff against the specification.
- **`native` is keyed by a NATIVE HTML ATTRIBUTE**, for exactly the reason `aria` is keyed by an
  ARIA one: these are facts about the attribute, not about the contract word that reaches it. It was
  added when the first correction below landed, and it is a table rather than a flag on `states` so
  that two contract words mapping to one attribute cannot hold two answers.
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

### The first correction, and what it took to see it

`channelFor` returned a hardcoded `rendersFalse: true` for every native channel. As a statement
about the web platform that was false: an HTML boolean attribute is presence-only, so
`disabled="false"` disables an element exactly as thoroughly as `disabled=""`.

**It was invisible to two of the three backends, and for reasons that are nowhere in this package.**
React never renders a boolean DOM prop as an attribute; Vue special-cases boolean attributes. Both
removed the attribute anyway and neither could have reported the error. Angular's `[attr.x]` does
what it is told, and produced a button that could never be enabled — found by pressing it, not by
reading the code.

The fix is the `native` table, not a corrected literal: **a literal here is what the bug was.** Its
diff is exactly eight lines of generated output across React and Vue, and none in Angular, which had
been working around it. `conformance/aria-mapping.json` now pins it as
`native-disabled-must-not-render-false`. The whole episode is written up in
[`docs/research/0005`](../../docs/research/0005-a-third-backend-and-what-only-it-could-find.md), and
it is the strongest argument in the repo for building a backend you do not need.

### The second one was not a correction: the field was right and was read wrong

`rendersFalse` appears in both the `aria` and the `native` tables, and it does not mean the same
thing to a reader in each — which is a property of the reader, not of the field. It says **whether
the false value is worth writing down**, and nothing else. On a native boolean attribute the false
value has no spelling at all, so `rendersFalse: false` and "presence-only" happen to coincide. On an
ARIA state they do not: `aria-invalid` omits the false case, and its true case is still the string
`"true"`.

The web-components emitter read the second as the first and wrote `aria-invalid=""` with
`toggleAttribute`. An empty string is not a valid `true/false` token, so WAI-ARIA falls back to the
default and the field announced as valid while the contract said invalid. **The other three backends
cannot reach this mistake**, because each stringifies a boolean on the way into the DOM — so no gate
in this repo could have caught it, and a review did.

`aria._doc` now says the distinction where the field is defined, and
`aria-invalid-omits-false-but-is-not-presence-only` pins it beside the case that pins the native
half.

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

## Per-component roots and styling

[`components.json`](./components.json) declares each contract's semantic root element once.
Its [schema](./components.schema.json) and `verify:parity` reject missing roots, orphan entries,
unknown platform elements, and copies reintroduced into backend bindings. `loadPair` augments the
validated binding with this resolved element for emitter use; the field is not persisted there.

WC's host tag stays derived by `tagFor(component, prefix)`. Its inner root comes from the same
map as the other backends. No host-only field is imposed on their bindings.

[`styling.md`](./styling.md) specifies the component, part, and axis handles for both DOM models.
