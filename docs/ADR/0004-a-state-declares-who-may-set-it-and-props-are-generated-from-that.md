# ADR 0004 — A state declares who may set it, and prop names are generated from that

- **Status:** Draft
- **Date:** 2026-09-01
- **Revised:** 2026-09-02 — returned to Draft. The five decisions below have all held under
  compilation; the record stays open because the vocabulary AROUND them is still moving, and each
  new component keeps finding the next thing a contract cannot say.
- **Deciders:** cris
- **Tags:** components, governance, packaging, a11y
- **Related:** [ADR 0002 — Agnostic contracts live in their own package, not at the repo root](./0002-agnostic-contracts-live-in-their-own-package.md)

## Context

A contract must be complete enough to generate a component from. The obvious reading of that is
that it should list the component's props — and it is wrong, in the specific way this package exists
to prevent.

`checked` + `defaultChecked` + `onCheckedChange` is not a fact about a switch. It is **React's
spelling** of a fact: _this state can be set from outside, and the user can also change it_. Vue
spells the same fact `modelValue` + `update:modelValue`; a web component spells it as an attribute
plus an event. Writing the React triple into a contract puts a framework inside the artifact whose
entire value is that it does not contain one.

[Report 0001](../research/0001-contract-schema-smoke-test.md) censused 28 framework-agnostic props
across four drafted contracts and sorted them by the fact each one spells:

| Category                        | Count | Held by the schema?                                         |
| ------------------------------- | ----- | ----------------------------------------------------------- |
| Externally settable state       | 14    | partly — the states were declared; who may set them was not |
| Behaviour parameter             | 6     | no                                                          |
| Form participation              | 5     | no                                                          |
| Custom logic supplied by caller | 1     | no                                                          |
| Already covered by `axes`       | 2     | yes                                                         |

The largest category collapses further: nine of the 14 are three spellings of three facts.

The schema's `states` block recorded `kind` — `intrinsic` (the platform tracks it) or `authored`
(the implementation tracks it) — and nothing about who may _set_ it. Across the four drafts, three
distinct setter relationships occurred and all three were flattened into `kind` with the difference
surviving only in prose:

| State                  | Who may set it                    | Was recorded as |
| ---------------------- | --------------------------------- | --------------- |
| `checked` (Switch)     | the consumer, **and** the user    | `authored`      |
| `disabled` (Switch)    | the consumer only; never the user | `intrinsic`     |
| `hover` (Switch)       | nobody; the platform observes it  | `intrinsic`     |
| `open` (AccordionItem) | the ancestor Accordion            | `authored`      |

## Decision

1. **Every declared state states `control`, and it is required.** One of three values:
   - `consumer` — the consumer sets it; the user cannot change it.
   - `shared` — the consumer may set it **and** the user may change it.
   - `internal` — nothing outside sets it: the platform observes it, the component derives it, or an
     ancestor owns it.
2. **`kind` and `control` are orthogonal and both are required.** `kind` says who _tracks_ the state,
   `control` says who may _set_ it. `disabled` is the proof they cannot be merged: the platform
   tracks it, and only the consumer sets it.
3. **A contract never names a prop.** Prop names, event names and the controlled/uncontrolled idiom
   are a framework's vocabulary and belong to that framework's binding.
4. **A framework's `prop-bindings.json` holds rules keyed by `control`, not entries keyed by
   component.** One rule — _a `shared` state `X` becomes `X`, `defaultX`, `onXChange`_ — generates
   the React surface for `checked` on Switch and `open` on Accordion identically. A per-component
   table would grow with the library and drift; a rule set does not.
5. **`internal` states produce no public input at all.** This is what makes `AccordionItem` correct
   without a special case: its `open` state is owned by the surrounding Accordion, so the item gets
   no open prop in any framework, and the contract says so mechanically rather than in a note.

## Why this is still Draft

The three-value `control` field is mechanized and has compiled fifteen components without a special
case, which would ordinarily make this Accepted. It is held at Draft because **this record is now a
chapter of a vocabulary it does not describe.** Everything below was added after it was written, and
none of it is recorded in any ADR:

| Added                                                                  | Answers                                                     |
| ---------------------------------------------------------------------- | ----------------------------------------------------------- |
| `states.*.values` / `default`                                          | a state with more than two values                           |
| `states.*.valueType` / `min` / `max` / `step`                          | a state that is free text, or a number in a range           |
| `activates`, and `activates.between`                                   | what CHANGES a state, and which two values a user may reach |
| `collection` + `member`                                                | a selection held by a parent on behalf of its children      |
| `collection.navigation`                                                | how a keyboard moves between those children                 |
| `range`                                                                | how a keyboard and a pointer move a number                  |
| part-level `role`, `controls`, `namedBy`, `describedBy`, `visibleWhen` | that an anatomy is a graph, not a tree of boxes             |
| `controls` / `namedBy` in `{ member, part }` form                      | a reference that crosses a component boundary               |
| `backdrop`                                                             | a layer that on some platforms is not an element            |

Recording each of those as it landed would have produced nine records describing one decision taken
nine times. The intent is a single successor covering the vocabulary as a whole, written once the
core component set is large enough that its shape has stopped changing — the same reason this one is
not being edited into that shape now.

**Until then, the schema is the specification and this record is the reasoning behind one field of
it.** A reader who needs the current vocabulary should read
`packages/contracts/schema/component.schema.json`, whose field descriptions carry the argument for
each block, and `packages/contracts/components/README.md`.

## Contract

| Concern                                  | Where                                                                                                     |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| The `control` field and its three values | `packages/contracts/schema/component.schema.json` → `states.*.control`                                    |
| How to choose a value                    | `packages/contracts/components/README.md` §3                                                              |
| The agnostic vocabulary                  | `packages/contracts/prop-canon.json`                                                                      |
| React's rules for translating it         | `packages/react/prop-bindings.json`                                                                       |
| Evidence                                 | `docs/research/0001-contract-schema-smoke-test.md`                                                        |
| Enforcement                              | `packages/react/scripts/verify-contract.mjs` (`pnpm verify:contract`, gated in CI) — schema legality only |

## Consequences

**Positive**

- The contract stays agnostic while becoming compilable. It states the rule; each binding compiles
  the rule into that framework's vocabulary, which is the translation this library is for.
- The prop-map becomes small. Rules keyed by `control` are a handful of lines per framework rather
  than a table with an entry per component.
- The single most consequential API decision in a component — whether a state is controllable — is
  now recorded in the artifact that is generated from, instead of being implied by which props
  somebody happened to write.
- Verified against the drafted contracts: they went from 53 schema rejections to 17 (all of them the
  new required field) to 0 once each state declared who sets it.

**Negative / trade-offs**

- **`control` is required, so every state must decide.** There is no honest-gap escape hatch here,
  which is deliberate — a generator cannot emit anything without it — but it does mean the schema
  refuses a partially-explored contract where it previously accepted one.
- **Three values may be too few.** `internal` currently covers three genuinely different situations:
  the platform observes it, the component derives it, and an ancestor owns it. They agree on
  producing no public input, which is why they are collapsed, but a generator that needs to _wire_ an
  ancestor-owned state will need a distinction this field does not make.
- **Nothing checks that a binding's rules cover every `control` value.** A framework could ship
  `prop-bindings.json` handling `consumer` and `shared` and silently emit nothing for `internal`.
- **`control` answers who may SET a state, and says nothing about what CHANGES it.** That turned out
  to be a separate question and the larger one. A `shared` state with no declared cause compiles to
  storage: it works when driven from outside and cannot move on its own. `Field`'s `invalid`,
  `touched` and `dirty` are all in that position today, and a Switch shipped unable to toggle for
  exactly this reason before `activates` existed. Whatever eventually closes that gap will sit beside
  `control`, not inside it.
- **The rule form is unproven off React.** Decision 4 is the load-bearing claim and every contract
  behind it was read through one framework's documentation — the condition least likely to expose a
  mismatch. Vue's `v-model` allows exactly one primary two-way binding per component, and a component
  with two `shared` states may not translate as cleanly as the rule assumes.
- **How it will fail quietly:** `control` is not derivable from anything and nothing can check it is
  _right_. A `shared` state mislabelled `consumer` produces a component that compiles, validates and
  ships, missing the callback that would let anyone observe it — and the omission looks like a design
  decision rather than a typo.

## Alternatives considered

**Add a `props` block to the contract.** The first reading of report 0001 recommended this, and it
was wrong. Prop names are framework vocabulary; recording them would make every contract React-shaped
and would have to be re-litigated for each new backend. It also encodes relationships between props —
`checked` is meaningless without `onCheckedChange` — which pushes the schema toward being a type
system in JSON, the same failure the behaviour vocabulary is designed to avoid.

**Widen `kind` to cover both facts.** Fewer fields, and it merges two orthogonal questions.
`disabled` breaks it immediately: platform-tracked and consumer-set, which no single enum value can
express without inventing a compound name for every combination.

**Infer `control` from `kind` plus convention.** Tempting, since `intrinsic` states are usually not
consumer-settable. `disabled` and `read-only` are both intrinsic and both consumer-settable, so the
convention is wrong often enough to be dangerous — and an inference that is usually right is worse
than an explicit field, because nobody checks it.
