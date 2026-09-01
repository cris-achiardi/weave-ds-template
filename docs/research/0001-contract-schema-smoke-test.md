# Contract schema smoke test — Switch, Field, Accordion

- **Date:** 2026-09-01
- **Source:** `packages/contracts/schema/component.schema.json` (`$id` `component-contract-2.json`).
  Reference material: [Base UI](https://base-ui.com/react/components/switch) component API pages for
  Switch, Field and Accordion; W3C ARIA APG patterns for
  [switch](https://www.w3.org/WAI/ARIA/apg/patterns/switch/) and
  [accordion](https://www.w3.org/WAI/ARIA/apg/patterns/accordion/).
- **Method:** Four contracts were drafted by hand — `Switch`, `Field`, `Accordion`,
  `AccordionItem` — written the way the unstyled, contract-driven library intends them, then
  validated against the current schema with Ajv 2020 (`allErrors: true`). A second control run
  replaced every `null` paint with the legal prefix `--ds-placeholder-` and re-validated, to
  establish whether `null` was the sole cause of rejection or merely the loudest.

  The drafts are working artifacts and were **not** committed. The deliverable is this report.

  **Revised after review.** The first version of this report read the 28 untranslatable props as a
  missing `props` block in the schema. That was wrong, and wrong in the specific way this package
  exists to prevent: a prop name is a framework's spelling of a fact, not the fact, and putting
  `checked`/`defaultChecked`/`onCheckedChange` in a contract would encode React into the artifact
  whose whole value is that it is not React. The measurements below are unchanged — the census was
  accurate — but the interpretation of them is rewritten. The measured/inferred split is what made
  that separable, which is the argument for the split.

  **Not covered:** no component was built and no emitter was written, so nothing here reports on
  whether a contract is sufficient to _generate_ from — only on whether it can be _written_. Base UI
  was read as documentation, not as source; its runtime behaviour was not tested. Radix and React
  Aria were not consulted, so "naming consensus" rests on one library plus the APG rather than the
  three the authority order calls for. Only three patterns were drafted: nothing here touches
  floating/positioned components, and the `layout` question that motivates the structure/theme split
  is therefore barely exercised.

## What is there (measured)

### The schema accepts 10 top-level keys

`$schema`, `component`, `status`, `intent`, `states`, `axes`, `semantics`, `a11y`, `composition`,
`anatomy`. Four are required: `component`, `status`, `intent`, `anatomy`. `additionalProperties` is
`false` at every level, so an unrecognised key is an error rather than a silent no-op.

### Validation result: 53 distinct rejection sites across the four drafts

| Contract        | Rejection sites | Raw Ajv errors |
| --------------- | --------------- | -------------- |
| `Switch`        | 19              | 91             |
| `Field`         | 12              | 60             |
| `Accordion`     | 4               | 20             |
| `AccordionItem` | 18              | 90             |
| **Total**       | **53**          | **261**        |

### 52 of the 53 are the same rejection

Every one of them is a paint channel written as `null`:

```
/anatomy/root/paints/background          type, enum, oneOf :: must be string
/anatomy/root/states/checked/background  type, enum, oneOf :: must be string
```

`$defs.tokenPolicyAtom` permits a namespace prefix matching `^--[a-z][a-z0-9-]*-$`, or the enums
`component-property` and `literal`. `null` is not among them.

### The control run isolates the cause

With every `null` swapped for `--ds-placeholder-` and nothing else changed:

| Contract        | Result      | Null channels swapped |
| --------------- | ----------- | --------------------- |
| `Field`         | **VALID**   | 12                    |
| `Accordion`     | **VALID**   | 4                     |
| `AccordionItem` | **VALID**   | 18                    |
| `Switch`        | **INVALID** | 18                    |

Three of four validate. `Switch` fails on one remaining error, unrelated to paints:

```
/composition/children/max  minimum :: must be >= 1
```

`$defs.slot.max` has `"minimum": 1`, so `max: 0` — "this component accepts no children at all" — is
not expressible.

### 28 public props from the reference implementations have no direct counterpart

The schema has **no `props` key**. That is by design — a prop name is a framework's spelling, not a
fact about the component — so what follows is a census of what had to be translated, not a list of
fields the schema is missing. Counting only props that carry an agnostic fact, and excluding
React-specific ones (`className`, `style`, `render`, `inputRef`, `nativeButton`):

| Component       | Props with no home | Names                                                                                                                                  |
| --------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `Switch`        | 9                  | `checked`, `defaultChecked`, `onCheckedChange`, `name`, `value`, `uncheckedValue`, `disabled`, `readOnly`, `required`                  |
| `Field`         | 9                  | `name`, `dirty`, `touched`, `disabled`, `invalid`, `validate`, `validationMode`, `validationDebounceTime`, `match` (on the error part) |
| `Accordion`     | 7                  | `value`, `defaultValue`, `onValueChange`, `multiple`, `disabled`, `hiddenUntilFound`, `keepMounted`                                    |
| `AccordionItem` | 3                  | `value`, `onOpenChange`, `disabled`                                                                                                    |

`axes` covers only variant axes drawn from the canon — `Accordion` was able to declare
`orientation: ["vertical"]` and nothing else. None of the 28 above is a variant axis.

Sorting the 28 by the agnostic fact each one spells:

| Category                        | Count | Examples                                                                                                                                                           | Does the schema hold it?                                      |
| ------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| Externally settable state       | 14    | `checked`/`defaultChecked`/`onCheckedChange`, `value`/`defaultValue`/`onValueChange`, `open`/`onOpenChange`, `disabled`, `invalid`, `readOnly`, `touched`, `dirty` | **partly** — the states are declared; who may set them is not |
| Behaviour parameter             | 6     | `multiple`, `keepMounted`, `hiddenUntilFound`, `validationMode`, `validationDebounceTime`, `match`                                                                 | **no**                                                        |
| Form participation              | 5     | `name`, `value`, `uncheckedValue`, `form`, `required`                                                                                                              | **no**                                                        |
| Custom logic supplied by caller | 1     | `validate`                                                                                                                                                         | **no**                                                        |
| Already covered elsewhere       | 2     | `orientation`, `loopFocus` (both deprecated upstream)                                                                                                              | **yes** — `axes`                                              |

The largest category collapses further. Nine of the 14 are three spellings of three facts:
`checked` + `defaultChecked` + `onCheckedChange` is one state that can be set from outside;
`value` + `defaultValue` + `onValueChange` is another; `open` + `onOpenChange` a third.

### `states` records who tracks a state, never who may set it

`$defs` requires `kind`, which is `intrinsic` (the platform provides it) or `authored` (the
implementation tracks it). Across the four drafts, three distinct setter relationships occurred and
all three had to be written as `authored` or `intrinsic` with the difference left to prose:

| State                  | Who may set it                     | Recorded as |
| ---------------------- | ---------------------------------- | ----------- |
| `checked` (Switch)     | the consumer, **and** the user     | `authored`  |
| `disabled` (Switch)    | the consumer only; never the user  | `intrinsic` |
| `hover` (Switch)       | nobody; the platform observes it   | `intrinsic` |
| `open` (AccordionItem) | the parent component, not the item | `authored`  |

### The schema accepted three states that paint nothing

`Field` declares `touched`, `dirty` and `valid`. All three validated. `$defs` requires only `kind`;
`visual` is optional prose, and the drafts recorded the absence in words:

```json
"touched": {
  "kind": "authored",
  "description": "The control has been focused and then blurred at least once. Gates WHEN an error is allowed to show.",
  "visual": "NONE. This state paints nothing on its own — it only gates whether `invalid` may display."
}
```

The schema's own description of `visual` reads: _"What must visibly change. A state nobody can see is
not a state, it is a variable."_

### Base UI hardcodes a heading level the APG says must vary

`Accordion.Header` "Renders: `<h3>` element". The APG requires the header wrapper to carry
`role heading` with _"aria-level appropriate to page structure"_.

### The APG has removed roving focus from the accordion pattern

The APG's keyboard table for accordion specifies `Enter`/`Space` and `Tab`/`Shift+Tab` only. Arrow
keys, `Home` and `End` are absent. Base UI's `orientation` and `loopFocus` props are both marked
deprecated, with the stated reason _"Deprecated per APG guidance; no longer affects keyboard
behavior."_

### There is no APG pattern for Field

The APG indexes patterns by widget role. `Field` is a labelling-and-validation relationship, not a
widget, so the layered authority order has no normative top layer for it.

## What it appears to mean (inferred)

Every item below is a reading, not a measurement.

**The `null` change is smaller than the count suggests.** 52 rejections at one site in `$defs`
implies a one-line schema change — adding `{ "type": "null" }` to `tokenPolicyAtom`'s `oneOf` — clears
all of them. The control run showing three of four contracts otherwise valid suggests the rest of the
schema already accommodates unstyled contracts, and that the styling question was the only structural
blocker in this sample.

**The 28 props are not a missing `props` block, and reading them as one would be the mistake this
package exists to prevent.** `checked` + `defaultChecked` + `onCheckedChange` is React's spelling of
a single fact — _this state can be set from outside_ — and Vue spells the same fact `modelValue` +
`update:modelValue`. Recording the triple in a contract would encode React into the artifact whose
whole value is that it is not React. The census above is therefore a measure of translation work, not
of schema gaps.

**What does look genuinely missing is one bit per state: who may set it.** The categories collapse to
almost nothing once that bit exists. An externally settable state that the user can also change is
the controlled/uncontrolled pattern; one only the consumer sets is a plain input; one nobody sets is
an observation with no input at all. Those three shapes appear to cover 14 of the 28 outright.

**If that reading holds, the prop-map becomes a small set of rules rather than a per-component
table.** A rule of the form _externally settable state `X` → `X`, `default X`, `on X Change`_ would
generate `checked`/`defaultChecked`/`onCheckedChange` for Switch and `open`/`defaultOpen`/
`onOpenChange` for Accordion from the same line, and a Vue map would emit `modelValue` +
`update:modelValue` from the same input. This is inferred from four contracts and has not been tested
against a framework that is not React, which is the case most likely to break it.

**Behaviour parameters look like they belong to the behaviour vocabulary, not to the contract's
surface.** `multiple` reads as a choice between two named primitives — single-select and
multi-select — rather than as a property of the accordion. `keepMounted` and `validationMode` have
the same shape. If so they arrive free once the vocabulary exists, and need no separate mechanism.

**Form participation looks like the one category with no home in any current plan.** `name`, `value`,
`uncheckedValue` and `required` are not states, not behaviour, and not styling. They describe how a
control takes part in a form, which every platform has some version of and no two spell alike.

**State names are themselves inherited vocabulary, and nothing currently guards them.** The Switch
draft named its state `checked`, which is HTML's checkbox word; the APG uses `aria-checked` only
because ARIA reuses the checkbox attribute, while its prose consistently says _on_ and _off_.
`prop-canon.json` already polices this for values — `danger`, never `error` — but its glossary covers
values only. On this reading, framework vocabulary can enter through a state name as easily as
through a prop name, and the second door is currently unwatched.

**`touched` and `dirty` appear to be a genuine third kind, not a mistake.** They are not intrinsic —
no platform tracks them — and they are not authored in the sense `selected` is, because nothing
paints them. They exist to gate _when another state may display_. If that reading is right, the
schema's `intrinsic | authored` pair is missing a category, and the rule that a state must be visible
is wrong rather than merely unenforced.

**The APG's removal of roving focus looks like evidence for the layered authority order rather than
against it.** A contract mirroring an older accordion implementation would have encoded arrow-key
navigation, and a "faithful" backend would then have implemented behaviour the normative source no
longer asks for. Reading the APG first appears to be what caught it.

**Base UI's `<h3>` looks like a defect inherited by anyone who mirrors it.** A component cannot know
its position in a document outline, so the level has to come from the consumer. This appears to be a
concrete instance of the general risk in mirroring one library's API.

**`Field` may indicate the contract needs a relationship vocabulary.** Most of what `Field` does is
wire ARIA relationships between parts that are not its own children — pointing a control at its
description and its error. `anatomy` describes a containment tree; nothing in the schema describes an
association between two nodes. This is a reading based on one component.

## Problems found

**1. `paints: null` is rejected, and it is the library's whole styling model.**
52 of 53 rejections. `$defs.tokenPolicyAtom` permits a prefix, `component-property` or `literal`, and
nothing else. Until this changes, no contract expressing the unstyled surface can validate, and
`packages/contracts/components/README.md` §3 documents a JSON shape that the schema in the adjacent
directory rejects.

**2. A state does not say who may set it, so the controlled/uncontrolled decision has no home.**
Not a missing `props` block — props are a framework's spelling and belong in that framework's
prop-map. What is missing is one bit further up: `kind` records who _tracks_ a state, never who may
_set_ it. `checked` is set by the consumer and changed by the user; `disabled` is set by the consumer
and never by the user; `hover` is set by nobody. All three were written as `authored` or `intrinsic`
with the difference surviving only in prose. That bit is what a prop-map needs in order to decide
between a controlled/uncontrolled triple, a plain input, and no input at all — and without it the
single most consequential API decision in a component is unrecorded in the artifact that is supposed
to be generated from.

**2b. Behaviour parameters and form participation have no home either.**
Six props select between behaviours (`multiple`, `keepMounted`, `validationMode`); five describe how
a control takes part in a form (`name`, `value`, `uncheckedValue`, `required`). The first group
plausibly belongs to the behaviour vocabulary once that exists. The second belongs to nothing
currently planned, and every platform has some version of it.

**3. `states` has two kinds and needs three.**
`touched`, `dirty` and arguably `valid` track something real, are set by the implementation, and paint
nothing. They validate today only because `visual` is optional prose — so the schema's stated rule is
unenforced, and applying it as written would delete states the component genuinely needs.

**4. A childless component cannot say so.**
`slot.max` has `"minimum": 1`. `Switch` accepts no children — its label is a sibling, not a child —
and the natural spelling `max: 0` is rejected. The available workaround is `accepts: []`, which says
"accepts nothing from this list" rather than "accepts nothing", and relies on a reader inferring the
difference.

**5. There is no way to require a value the consumer must supply.**
`AccordionItem` needs a heading level, and no default is safe: the APG requires it to fit the
surrounding page. It is not a variant axis, not a state, and not a slot. Base UI's answer is to
hardcode `<h3>`, which is wrong on any page whose outline differs. Nothing in the schema can express
"this must be supplied and has no default", so nothing can gate it either.

**6. `Field`'s core job — wiring relationships between parts — is not expressible.**
Pointing a control at its description and error, and naming a panel from its trigger, are
associations between nodes. `anatomy` can express containment and nothing else. Both `Field` and
`AccordionItem` had to record these relationships as English prose in `intent.behaviour` and
`a11y.notes`, where no gate can reach them.

**7. The heading-level problem is a category the repo has no answer for.**
It is a **structural obligation on the consumer**: something the component cannot supply, cannot
default, and cannot verify. `a11y.notes` was the only available home, and that field is explicitly
unenforceable. This is distinct from problem 5: even with a way to declare a required prop, nothing
would check that what arrives is _correct for the page_.

## Open questions

1. **Should `null` mean "unbound" and channel-omission mean "not described", as
   `packages/contracts/components/README.md` §3 already claims?** The distinction is documented and
   unimplemented. Adding `{"type": "null"}` to `tokenPolicyAtom` is one line; deciding whether the two
   notations really carry different meanings, and whether anything will ever check the difference, is
   not.

2. **How does a state declare who may set it?** The minimum appears to be one field with three
   values — set by the consumer and changeable by the user, set by the consumer only, set by nobody.
   Whether that is a new field on `states`, a widening of `kind` beyond `intrinsic | authored`, or a
   separate block is open. So is whether three values are enough: `open` on `AccordionItem` is set by
   its parent rather than by the consumer, which may be a fourth relationship or may be a detail of
   composition rather than of state.

2b. **Does the prop-map hold rules or tables?** If a rule of the form _externally settable state `X`
→ `X`, `default X`, `on X Change`_ generates the React surface for every such state, the prop-map is
a handful of rules and stays small. If each component needs its own entry, it is a table that grows
with the library and drifts. The four drafts here are consistent with the rule form, but all four
were read through one framework, which is the condition least likely to expose a mismatch.

2c. **Where does form participation live?** `name`, `value`, `uncheckedValue` and `required` are not
states, not behaviour and not styling. A `formControl` block on the contract, a behaviour primitive,
and "out of scope, the consumer wires their own form" are all defensible, and nothing in the repo
currently points at one.

2d. **Should the value glossary in `prop-canon.json` cover state names as well as values?** It
currently polices values (`danger`, never `error`). Nothing polices a state name, and `checked`
entered the Switch draft straight from HTML's checkbox vocabulary without being questioned — for a
control whose own spec talks about _on_ and _off_.

3. **Is there a third state kind, and what is it called?** Candidates: a `gating` kind, a boolean
   `visible: false`, or removing the visibility rule and letting `visual` be genuinely optional. The
   first names the concept; the last is one line and explains nothing.

4. **Where do relationship obligations live?** Problems 6 and 7 are the same shape: a fact about how
   parts relate, or what a consumer must supply, with no home but prose. Does the schema grow an
   `obligations` or `relationships` block, or is this deliberately the boundary where contracts stop
   and documentation begins?

5. **Does `AccordionItem` confirm or undermine one-contract-per-addressable-piece?** Splitting
   `Accordion` from `AccordionItem` followed the existing `Tabs`/`TabItem` precedent and read
   naturally. But `Field` was drafted as a _single_ contract with `label`, `description` and `error`
   as anatomy parts, because those are not independently useful. Nothing in the schema or the docs
   says which shape to reach for, and the two drafts made opposite choices without a stated rule.

6. **What is the second reference library?** The authority order calls for three read together, on
   the grounds that agreement across three establishes convention while one library's API is just its
   opinion. Only Base UI was read here, and its hardcoded `<h3>` is a live example of the risk.

7. **Does the `layout` block survive contact with a component that needs it?** None of these three
   stressed it: `Switch`'s thumb position and `AccordionItem`'s panel reveal are the closest, and both
   were recorded as ordinary paint channels (`transform`, `padding`). A positioned component —
   a popover, a tooltip — would exercise the structure/theme split properly, and none was drafted.
