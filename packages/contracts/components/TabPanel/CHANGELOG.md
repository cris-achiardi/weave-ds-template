# TabPanel — contract changelog

## Unreleased

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
