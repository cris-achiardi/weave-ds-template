# ADR 0005 - Unsupported contract claims are non-conforming

- **Status:** Accepted
- **Date:** 2026-09-15
- **Deciders:** cris (implementation delegated)
- **Tags:** components, a11y, governance
- **Related:** [ADR 0002](./0002-agnostic-contracts-live-in-their-own-package.md)

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

## Consequences

Field is reported across all four backends. WC TabItem and TabPanel additionally report
omitted cross-shadow references. Local references and literal labels are distinct and
continue working. Fixing those implementations requires an explicit composition design;
this decision does not claim that unsupported accessibility behavior has been implemented.
