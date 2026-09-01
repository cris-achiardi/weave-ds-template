# TabItem — contract changelog

## Unreleased

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
