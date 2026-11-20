# ADR 0005 - Unsupported contract claims are non-conforming

- **Status:** Accepted
- **Date:** 2026-09-15
- **Deciders:** cris (implementation delegated)
- **Tags:** components, a11y, governance
- **Related:** [ADR 0002](./0002-agnostic-contracts-live-in-their-own-package.md)
- **Amended:** 2026-11-20, in place (pre-v0) — relations on a supplied element (#35, #46)

## Context

Issue #10 asks what a relationship claim means when a backend cannot deliver it.
WC currently omits object-valued cross-member references. Field puts references on a
wrapper instead of its supplied control in all four emitters; ordinary ID resolution
does not establish that the control has an accessible name.

The [HTML reflection rules](https://html.spec.whatwg.org/multipage/common-dom-interfaces.html#reflecting-content-attributes-in-idl-attributes)
restrict explicitly assigned element references to valid ancestor tree scopes.
A sibling's internal shadow element is outside those scopes. Assigning an outer host
can work, but it is a different target from the semantic part the contract names.
This restriction is separate from whether a browser exposes the reflection property.

## Decision

Choose option 1 from #10: an unsupported claim is **non-conforming**. Do not weaken
contract meaning or count a platform exemption as success. Record known gaps per
backend, component, anatomy path and target in contract reports and the CI parity report.
A component with any known gap is non-conforming for that scope. An empty gap list
means **not-evaluated**, never a blanket assertion of accessibility conformance.

The experimental generators remain runnable, with explicit diagnostics. The structural
classifier applies to new contracts as well as existing ones. Browser characterization
checks keep the current evidence reproducible; when an implementation is fixed, update
its evidence and classification together. Full accessibility conformance requires a
separate evaluation of every claimed behavior.

### Relations on a supplied element (amendment, #35 and #46)

A part filled by a composition slot that declares `namedBy` or `describedBy`, and has no `role` of
its own, carries those relations on the element the consumer **supplies** to that slot, not on the
part's wrapper. ARIA names and descriptions are not inherited, so a wrapper's relation names
nothing. This covers Field `control` and Tooltip `trigger`. A described part shown only while a
state holds (`visibleWhen`) is referenced only while it holds; when that state maps to
`aria-invalid`, the supplied element is marked invalid at the same moment.

Ownership: a consumer's `id` is never replaced; consumer IDREF tokens are kept and come first; the
component removes only tokens, ids and `aria-invalid` values it wrote, so a state change or a
replaced element hands the old element back exactly as it was. Content that is not exactly one
element cannot carry a relation; it is left unwired with a diagnostic naming the slot.

Light-DOM backends point the supplied element at the part ids themselves, and render a part that
names it as a native `<label for>`, so clicking it reaches the control.

**WC mapping.** The slotted element is in the consumer's tree and the parts are in the component's
shadow root, so neither an IDREF nor element reflection can connect them. The slotted CONTENT of
each target part (the label, description, error, tooltip content) is in the same tree as the
slotted element, so WC writes plain IDREFs to that content. The relation therefore targets the
slotted content of the part the contract names rather than the shadow part element. While those
parts contain nothing but their slot the computed name and description are identical, and this
mapping **counts as conforming**. A target part no slot fills cannot be mapped and is an emitter
error. Clicking the label part focuses the slotted control (focus only — a checkable control is
not toggled as a native label would toggle it).

**Residual WC gap.** When the slotted element is itself a shadow host (this system's own `Switch`,
`TextField`, or any custom element a slot without an `accepts` list admits), the relations land on
its host and its focusable element does not receive them. Reported as `supplied-shadow-host`;
follow-up #52.

## Consequences

Field and Tooltip are no longer reported as wrapper gaps in React, Vue or Angular (status
`not-evaluated`). WC Field and Tooltip report `supplied-shadow-host`. WC TabItem and TabPanel reported
omitted cross-shadow references until #36, which realizes both roots on their hosts and links the
hosts by IDREF ([ADR 0008](./0008-a-wc-member-referenced-across-members-realizes-its-root-on-its-host.md)). Local references and literal labels are distinct and
continue working. This decision does not claim that unsupported accessibility behavior has been
implemented: browser tests demonstrate the computed name, description, `aria-invalid`, label
activation and replacement behaviour for native supplied elements only.

## Contract

| Concern                                           | Where                                                                          |
| ------------------------------------------------- | ------------------------------------------------------------------------------ |
| Which parts carry relations on a supplied element | `packages/emit-web/contract.mjs` — `suppliedRelations`, `labelsForSupplied`    |
| Ownership policy (one copy)                       | `packages/behavior/src/supplied-relations.ts`                                  |
| Per-backend binding                               | `packages/{react,vue,angular,wc}/src/behavior/supplyRelations.ts`              |
| Gap classification                                | `scripts/relationship-conformance.mjs` (`pnpm contract`, `pnpm verify:parity`) |
| Browser evidence                                  | `tests/browser/relations.mjs`, `tests/browser/wc.browser.mjs`                  |
