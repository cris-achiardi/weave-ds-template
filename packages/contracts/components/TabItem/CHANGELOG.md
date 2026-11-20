# TabItem — contract changelog

## Unreleased

### Changed — BREAKING for the web-components backend (#36)

- **WC: the tab's root moves from an inner `<button part="root">` to the `<ds-tab-item>` host.**
  The contract is unchanged; this is how the web-components backend realizes it (ADR 0008).
  The host now carries `role`, the ARIA states, `tabindex` and focus as host attributes, takes the
  UA box of the element it stands in for instead of `display: contents`, and is linked to its
  sibling member by an IDREF between hosts — the host gets a generated fallback `id` when the
  consumer gave none. Consumer ids and IDREF tokens on the host are kept; only what the component
  wrote is removed when it disconnects.
  - `[part="root"]` is now a presentational `<div>`. Script or styles that reached the inner
    `<button>` (`shadowRoot.querySelector('button')`, `::part(root)` relying on button UA
    styles) break. Enter and Space now activate through the host, by dispatching a click.
  - `aria-controls` now names the panel (it was omitted, reported non-conforming under ADR 0005).
  - The sandbox theme needed no selector change: it already selects states on `:host(...)` and
    paints `[part="root"]`, and the WC styling browser tests pass unchanged.

### Added

- Initial contract. `status.level` is `experimental`. Member of `Tabs`, reflecting `selected`.
- Root declares `role: tab` and `activates: { toggles: member }`.
- `indicator` part uses `visibleWhen: selected` — the non-colour signal for the chosen tab.

### Known gaps — measured, not guessed

- **`aria-controls` pointing at its panel is not generated.** `controls` can only name a sibling
  part within the same component, and a tab's panel is a different component. The schema has no way
  to reference across a collection.
- **Roving tabindex is not generated.** Every tab is in the Tab order.
- Shipped briefly with **no `aria-selected` at all**: the emitter's state-to-ARIA table did not
  contain `selected`, and the member branch had no fallback, so an unlisted state name emitted
  nothing. Fixed, and the branch now falls back to a data attribute.
