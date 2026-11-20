# ADR 0007 — A consumer's accessible name lands on the part the contract names, not always on the root

- **Status:** Draft
- **Date:** 2026-11-20
- **Deciders:** cris (implementation delegated)
- **Tags:** components, a11y
- **Related:** [ADR 0005 — Unsupported contract claims are non-conforming](./0005-unsupported-contract-claims-are-non-conforming.md)

## Context

Issue #44 measured, in all four backends, that `Tabs` rendered an empty `role="tablist"` with every
tab and panel as its sibling, and put the consumer's `aria-label` on the root `<div>`. Two separate
contract gaps produced that DOM:

1. **Placement.** `composition.children` admitted both `TabItem` and `TabPanel`, which belong in
   different containers, through one outlet. The schema could already express the fix: a named slot
   with `part` routes content into an anatomy part. `Tabs` now takes its tabs in a `tabs` slot
   filling `list`, and its panels as children of the root. No schema change; recorded here only as
   the context the second gap was found in.
2. **The consumer's name.** Nothing in the contract said where a consumer-supplied name lands. Every
   emitter spread it onto the root, which is right when the root carries the component's role and
   wrong when the role is on an inner part. For `Tabs` the root is generic: ARIA prohibits naming
   it, so the name labelled nothing and the tablist stayed unnamed. An emitter heuristic ("if the
   root has no role and exactly one part has one, name that part") would have fixed `Tabs` with a
   rule no contract states — the kind of invented claim the repository forbids.

Web components add a constraint: the named part sits inside a shadow root, and an
`aria-labelledby` IDREF written on the host names ids in the consumer's tree, which cannot resolve
from inside that shadow root.

## Decision

1. An anatomy part may declare `namedByConsumer: true`. That part, not the root, receives the
   accessible name the consumer passes to the component. Omitted everywhere, the name stays on the
   root.
2. At most one part declares it; that part declares a `role`; and it never also declares `namedBy`.
   These are enforced once, in the shared contract reader every emitter calls, and an emitter
   throws on a violation rather than guessing.
3. Every backend routes the name to that part and removes it from the root, so the generic wrapper
   is not named as well. A backend that cannot deliver part of the claim forwards what it can and
   reports the rest as non-conforming under ADR 0005. Web components forward `aria-label` onto the
   shadow-internal part, and resolve `aria-labelledby`'s ids in the host's own tree into element
   references on that part (element reflection keeps a target in a shadow-including ancestor
   tree). Updated in place for #36; until then `aria-labelledby` was reported as an omitted
   cross-shadow reference.
4. The flag is agnostic: it names the region, not the attribute. Web backends read it as
   `aria-label` and `aria-labelledby`.

## Contract

| Concern                         | Where                                                                                   |
| ------------------------------- | --------------------------------------------------------------------------------------- |
| The field                       | `packages/contracts/schema/component.schema.json` (`$defs.part.namedByConsumer`)        |
| Rules the schema cannot express | `packages/emit-web/contract.mjs` (`consumerNamedPart`)                                  |
| Routing per backend             | `packages/{react,vue,angular,wc}/src/emit/emit.mjs`                                     |
| Gap classifier (web components) | `scripts/relationship-conformance.mjs` (`pnpm verify:parity`)                           |
| First use                       | `packages/contracts/components/Tabs/Tabs.contract.json` (`anatomy.root.parts.list`)     |
| Authoring guidance              | `packages/contracts/components/README.md`, `packages/contracts/schema/README.md`        |
| Enforcement                     | `tests/tablist-ownership.test.mjs` (`pnpm test`), `tests/browser/tablist.mjs` (browser) |
| WC `aria-labelledby` (#36)      | `tests/browser/tab-relations.mjs` (browser)                                             |

## Consequences

**Positive**

- A component whose role is on an inner part can be named by its consumer without the consumer
  knowing the anatomy.
- The rule is stated in the contract, so the four backends agree by construction rather than by
  each inventing the same heuristic.

**Negative / trade-offs**

- Web components honour `aria-labelledby` on a shadow-internal part only by element reference,
  resolved when the attribute changes or the element connects: a label element inserted LATER is
  not picked up until one of those happens. Element references are invisible to DOM-based tooling
  (Playwright's role engine, Testing Library), so that link is asserted through the browser's own
  accessibility tree in Chromium and as API state in Firefox and WebKit, whose trees were not
  observed. The WC host also keeps its `aria-label` / `aria-labelledby` attributes, because they
  are the input the component reads.
- Only `aria-label` and `aria-labelledby` move. `aria-describedby` and other consumer ARIA still
  land on the root; a component that needs them elsewhere needs a further decision.
- Fails quietly when a contract with an inner role omits the flag: the name lands on the root,
  every gate stays green, and the role goes unnamed. Nothing detects a role-bearing sub-part that
  "should" have been flagged.

## Alternatives considered

**Emitter inference** — route the name to the only role-bearing part when the root has none. Fixes
`Tabs` with no schema change, but states a rule no contract declares, and silently changes meaning
the day a second role-bearing part is added.

**A required `label` prop on `Tabs`** — explicit, but a second naming API beside the platform's own
`aria-label`, and it does not generalise to `aria-labelledby`.
