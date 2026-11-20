# TabPanel — contract changelog

## Unreleased

### Changed — BREAKING for the web-components backend (#36)

- **WC: the panel's root moves from an inner `<div part="root" role="tabpanel">` to the
  `<ds-tab-panel>` host.**
  The contract is unchanged; this is how the web-components backend realizes it (ADR 0008).
  The host now carries `role`, the ARIA states, `tabindex` and focus as host attributes, takes the
  UA box of the element it stands in for instead of `display: contents`, and is linked to its
  sibling member by an IDREF between hosts — the host gets a generated fallback `id` when the
  consumer gave none. Consumer ids and IDREF tokens on the host are kept; only what the component
  wrote is removed when it disconnects.
  - `aria-labelledby` now names its tab (it was omitted, reported non-conforming under ADR 0005).
  - The host is focusable (`tabindex="0"`), as `semantics.focusable` declares; the previous WC
    panel set no `tabindex` anywhere (read from its code, not measured).

### Added

- Initial contract. `status.level` is `experimental`. Member of `Tabs`, reflecting `selected`.
- Root uses `visibleWhen: selected` — hidden rather than unmounted, so scroll position and anything
  a consumer measured survive switching away and back.
- `composition.children` names the `root` part.

### Known gaps — measured, not guessed

- **`aria-labelledby` pointing at its tab is not generated**, for the same reason `aria-controls` is
  not generated on `TabItem`: the reference crosses a component boundary. The panel is therefore
  announced unnamed.
- It is the second kind of member in one collection, which is why `collection.items` had to become a
  list. Nothing validates that a panel exists for every tab, or the reverse.
