# ADR 0003 — A paint names the channel and leaves its source unbound

- **Status:** Draft
- **Date:** 2026-09-01
- **Revised:** 2026-09-02 — returned to Draft; decision 5 corrected against what the emitter
  actually produces, and decisions 6 and 7 added.
- **Deciders:** cris
- **Tags:** components, tokens, packaging
- **Related:** [ADR 0002 — Agnostic contracts live in their own package, not at the repo root](./0002-agnostic-contracts-live-in-their-own-package.md)

## Context

This library is unstyled. It ships no palette, no scale and no visual opinion; a consumer wires
their own token system to what it generates.

`component.schema.json` did not permit that. `$defs.tokenPolicyAtom` required every paint channel to
name a token namespace prefix (`--ds-color-fill-`), or the enum `component-property`, or `literal`.
There was no way to say _this part paints a background, and the library does not say from where_.

[Report 0001](../research/0001-contract-schema-smoke-test.md) measured the cost. Four contracts —
Switch, Field, Accordion, AccordionItem — drafted the way this library intends produced **53 distinct
schema rejections, 52 of them this one issue**. A control run swapping every `null` for a legal
prefix left three of the four valid unchanged, establishing that styling was the only structural
blocker in that sample.

The tension is what to do _instead_ of naming a token. Deleting `paints` entirely was the obvious
alternative and is worse: a consumer would then have no list of what needs wiring, and would have to
reverse-engineer a stylesheet to find out — which is the failure this library exists to remove.

## Decision

1. **A paint channel may be `null`, meaning the library deliberately does not say where the value
   comes from.** The channel is still named, because the list of channels _is_ the wiring surface.
2. **`null` and omission mean different things.** `"background": null` is _unbound by design_; the
   channel simply absent is _not described yet_. This is the repo's standing rule — a gap is a
   finding, not a blank to fill — applied to styling, and the two facts get two notations so neither
   can be mistaken for the other.
3. **Contracts in `@ds/contracts` use `null`.** A named token policy stays legal in the schema,
   because a consumer's own wiring and a reference implementation both need to express one, but a
   contract this library ships does not name one.
4. **`@ds/tokens` is a reference implementation, not a dependency.** It is one worked example of
   wiring a token system to an unbound surface. Nothing in `@ds/contracts` or the emitters requires
   it, and a consumer may ignore it entirely.
5. **The emitter produces two stylesheets, not one.** _This decision is the WEB BACKEND's, not the
   contract's_ — see the note under Consequences. A stylesheet is one delivery mechanism for an
   unbound channel; it is not the only one and must not become the definition. A token-free `<Name>.structure.css` that it
   owns and regenerates; and a `<Name>.theme.css` emitted once, empty but for one commented socket
   per unbound channel, which belongs to the consumer and is never rewritten.

   **`structure.css` currently emits almost nothing, and that is the open question in this record.**
   The intended content was "the layout a contract's stated behaviour depends on" — but a contract
   has no way to say where a part sits, so there is nothing to derive it from and the emitter
   refuses to guess. It emits exactly two things: a scoping handle, and the rule below.

   The consequence is that every component's real layout lives in the consumer's `theme.css`, which
   is the wrong file for it. That is a known gap, not a settled design.

6. **A part's visibility is a contract claim, and `structure.css` enforces it.** Where a contract
   declares `visibleWhen`, the emitter writes a scoped `display: none !important` for the hidden
   state. This is the one structural rule the emitter is willing to write, because it is not a guess
   about layout: it is what makes a statement the contract already makes come true.

   `!important` is deliberate. Whether a part is showing is not the consumer's to cancel by accident
   while styling something else — a single `display` in a theme file otherwise outranks the
   browser's own `[hidden]` rule and silently disables hiding. This is not hypothetical; it is what
   made the generated Dialog render permanently open with its buttons firing the whole time.

7. **A paint channel names appearance, never structure.** The schema carries a denylist of
   structural channels — `display`, `position`, `inset*`, `float` and the rest — because a contract
   that paints `display` has moved layout into the consumer's file by another route, and the
   paint/theme split a consumer relies on would hold only by the care of whoever wrote the contract.
   `gap` deliberately stays a paint: spacing carries design intent.

8. **The obscuring layer behind a part is declared as `backdrop`, not as a child part.** It holds
   paints and nothing else, because on some platforms IT IS NOT AN ELEMENT: a native `<dialog>`
   renders its backdrop as a pseudo-element that can be painted and can never hold a child, carry an
   attribute, or be the target of an event. Modelling it as a part would promise three things the
   platform cannot give.

## Contract

| Concern                                 | Where                                                                                                     |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| The permitted shapes of a paint policy  | `packages/contracts/schema/component.schema.json` → `$defs.tokenPolicy`                                   |
| What `null` means, and how to write one | `packages/contracts/components/README.md` §3                                                              |
| The two-stylesheet split and its rules  | `packages/react/src/emit/README.md`                                                                       |
| The reference implementation            | `packages/tokens/README.md`                                                                               |
| Evidence                                | `docs/research/0001-contract-schema-smoke-test.md`                                                        |
| Enforcement                             | `packages/react/scripts/verify-contract.mjs` (`pnpm verify:contract`, gated in CI) — schema legality only |

## Consequences

**Positive**

- Contracts expressing this library's actual styling model now validate. Before this change, the
  authoring guide in `packages/contracts/components/README.md` §3 documented a JSON shape that the
  schema in the adjacent directory rejected.
- The wiring surface is explicit and enumerable. A consumer can list every channel they must supply
  without reading anyone's CSS.
- It removes a whole class of argument. There is no "what should the default blue be" discussion in a
  library that ships no blue.

**Negative / trade-offs**

- **Adoption costs more.** A generated component arrives visually unstyled. Every consumer does
  wiring work that a batteries-included library would have done for them, and some will not want to.
- **`report:paints` loses most of its meaning.** It resolves part → class → declarations → `var()`
  chain and compares against a declared policy. Against `null` there is nothing to compare, so the
  report will have little to say until a consumer's own contracts name policies.
- **Nothing enforces decision 3.** A contract in this package could name a token policy and every
  gate would stay green, because the schema permits it for the consumer's sake. The unstyled
  commitment is a convention here, not a mechanism.
- **Decision 5 is scoped to a backend, and was written as though it were universal.** The contract's
  half of this record — a channel is named, its source is unbound, `null` and omission differ — holds
  on any target. "Two stylesheets" does not: there is no stylesheet in Flutter, and a Tailwind or
  NativeWind backend delivers the same unbound channel as a class rather than a custom property. The
  wording is left in place because it accurately describes what the React emitter does today, and
  flagged here because it is exactly the kind of web assumption a second backend exists to catch —
  see ADR 0002, "Why this is still Draft".
- **Leaving the source unbound is what makes those backends possible at all.** A channel that named
  a CSS custom property would have decided the delivery mechanism for every target in advance. `null`
  says the library does not know where the value comes from, which is equally true of a design token
  resolved to a Dart constant, a Tailwind class, or a JavaScript object — and is why the token
  pipeline here is a Style Dictionary reference implementation rather than a fixed set of variables.
- **`structure.css` not carrying layout is the reason this record is Draft.** Three incompatible
  shapes of layout have surfaced — declarations (a thumb out of flow), constraints (a size that must
  not depend on which parts are visible), and arithmetic over a state (a fill's length that IS the
  value). The third now has an answer: the component publishes a number as a custom property and the
  theme turns it into a percentage. The other two do not, and designing a `layout` block before they
  do would mean designing it wrong.
- **How it will fail quietly:** the `null`-versus-omitted distinction is the load-bearing part of
  decision 2 and **nothing checks it**. A channel dropped by accident and a channel deliberately left
  for the consumer are indistinguishable to every tool in this repo; the difference lives only in
  whether somebody typed four characters. The first consumer to hit an unstyleable part will discover
  it, and by then the contract will look complete.

## Alternatives considered

**Drop `paints` from unstyled contracts entirely.** Simplest schema change — none at all, since
`paints` is already optional. Rejected because the channel list is the wiring surface: without it a
consumer has no way to know a part paints a block-end border except by reading generated CSS, which
is exactly the reverse-engineering this library is meant to eliminate.

**Keep requiring a token prefix and ship a default token set.** Would make the library work out of
the box. Rejected because it makes the library styled, which contradicts its premise — and because
the resulting tokens would be a visual opinion that every consumer then has to override rather than
supply.

**Use `component-property` for every channel.** Already legal, and superficially similar: it means
"an unprefixed custom property on the component". Rejected because it says something different and
more specific — that a knob exists at a particular name — when what is meant is that the source is
not decided here at all.
