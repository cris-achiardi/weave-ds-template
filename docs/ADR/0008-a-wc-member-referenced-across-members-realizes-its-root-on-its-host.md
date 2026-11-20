# ADR 0008 — A WC member referenced across members realizes its root on its host, as host attributes

- **Status:** Draft
- **Date:** 2026-11-20
- **Deciders:** cris (implementation delegated)
- **Tags:** components, a11y
- **Related:** [ADR 0005 — Unsupported contract claims are non-conforming](./0005-unsupported-contract-claims-are-non-conforming.md), [ADR 0007 — A consumer's accessible name lands on the part the contract names](./0007-a-consumers-accessible-name-lands-on-the-part-the-contract-names.md)

## Context

Issue #36. `TabItem`'s root `controls` its `TabPanel`, and the panel is `namedBy` its tab — two
relations between two MEMBERS of one collection. In the web-components backend each member renders
its semantic element inside its own shadow root, so the two ends live in sibling shadow trees. ADR
0005 recorded the result: the relation was omitted and reported non-conforming.

The platform facts, measured in Playwright-bundled Chromium 153, Firefox 155 and WebKit 26.6:

- An IDREF cannot cross a shadow boundary. Element reflection (`ariaControlsElements`, …) is
  present in all three engines but keeps a target only in the element's own tree or a
  shadow-including ancestor tree: a sibling's shadow-internal element is rejected (0 retained, all
  three), its host is kept (1 retained).
- Reference target (`attachShadow({ referenceTarget })`), which forwards a reference to a host onto
  an inner element, gave the correct relation and name in Chromium's accessibility tree and is
  absent in Firefox and WebKit.
- A custom-element host with `display: contents` cannot take focus in any of the three engines.
- Semantics set through `ElementInternals` (role, states, element references) produced the correct
  relation and name in Chromium's accessibility tree, and are invisible to Playwright's role/name
  engine in all three engines (`getByRole('tab')` found 0). DOM-based a11y tooling such as Testing
  Library's `getByRole` reads the same DOM and is affected the same way; that was inferred from the
  mechanism, not separately measured.

Firefox and WebKit accessibility trees are not observable from Playwright. Everything said here
about them is DOM state or Playwright's own engine — a gap in the evidence, not a claim.

## Decision

1. A WC member whose ROOT is the source or target of a cross-member relation realizes that root on
   its **host**: the host carries `role`, the ARIA states, `tabindex` and focus. `[part="root"]`
   stays inside the shadow root as a presentational `<div>` that keeps every paint.
2. Those are written as **host attributes**, and a cross-member relation is a plain **IDREF**
   between the two hosts (`aria-controls`, `aria-labelledby`), which are in one tree. Each host
   carries an id: the consumer's own if it has one, otherwise a generated fallback.
3. Everything written onto the consumer-owned host follows the supplied-relations ownership policy
   (`@ds/behavior/supplied-relations`, #53): a consumer id is never replaced, consumer IDREF tokens
   are kept and come first, single-valued attributes remember and restore the consumer's prior value,
   only what the component wrote is removed on disconnect, and nothing is written while detached.
4. The collection pairs members by identity: the FIRST member of each kind with a given identity
   pairs; a duplicate, or an identity with no sibling, pairs with nothing. Joining, leaving and an
   identity change re-pair every member.
5. The host takes the UA box of the element it stands in for (`<button>` → `inline-block`, `<div>`
   → `block`), read from `@ds/platform-web` (`uaDisplay`), because a focusable host needs a box.
   Without the platform datum the emitter throws rather than guess.
6. The host supplies what the native element did: Enter activates on keydown, Space on keyup, by
   dispatching a click, so consumer click listeners and cancellation behave as before.

**Revisions.** The decision approved first was the same host-root design with semantics set through
`ElementInternals` and element references. It was built and worked in Chromium's accessibility tree,
then changed to host attributes + IDREFs before merge, because of the measured tooling blindness
above: 18 existing WC browser tests that locate tabs by role failed, and so would a consumer's own
role-based tests. With host attributes those 18 pass unchanged, and Playwright resolves the tab, its
selected state and the panel's name in all three engines.

**Future path.** Reference target keeps the semantics inside the shadow root and needs none of the
host-attribute machinery. Revisit this decision when it ships in Firefox and WebKit.

## Contract

| Concern                        | Where                                                                                                |
| ------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Which members realize the root | `packages/wc/src/emit/host-root.mjs` (`realizesRootOnHost`)                                          |
| Emission                       | `packages/wc/src/emit/emit.mjs`, `packages/wc/src/emit/css-shadow.mjs`                               |
| Ownership policy               | `packages/behavior/src/supplied-relations.ts` (`controls`, `attributes`)                             |
| Platform data                  | `packages/platform-web/profile.json` (`uaDisplay`, `relationElements`)                               |
| Gap classifier                 | `scripts/relationship-conformance.mjs` (`pnpm verify:parity`)                                        |
| Enforcement                    | `tests/browser/tab-relations.mjs`, `tests/browser/{navigation,activation,conformance}.mjs` (browser) |

## Consequences

**Positive**

- The WC tab identifies its panel and the panel is named by its tab, in Chromium's accessibility
  tree; the WC non-conformance for TabItem and TabPanel is closed.
- Role, state and relations are visible to DOM-based tooling, so role-based tests — ours and a
  consumer's — work.

**Negative / trade-offs**

- **Sprouting.** The component writes `role`, `aria-*`, `tabindex` and, when the consumer gave none,
  an `id` onto a host the consumer owns. A consumer can overwrite them; the ownership policy only
  guarantees we never destroy theirs. There is no default-versus-override layering of the kind
  `ElementInternals` would have given.
- The inner element is no longer a native `<button>`: focusability, keyboard activation and the
  box are now the component's responsibility, and any consumer styling or script that reached the
  inner `<button>` breaks. Breaking for WC TabItem and TabPanel; recorded in their changelogs.
- Firefox and WebKit accessibility trees were not observed. The relation there rests on IDREFs
  within one tree — the oldest mechanism ARIA has — but it is asserted only as DOM state.
- Fails quietly if a future member has a cross-member relation to a NON-root part: the emitter
  still omits it and the classifier reports it, but nothing makes that case work.
