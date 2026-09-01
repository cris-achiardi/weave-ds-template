# Tabs — contract changelog

## Unreleased

### Added

- Initial contract. `status.level` is `experimental`.
- `collection` with `cardinality: one` and `initial: first-enabled`.
- **`collection.items` is a LIST** — `["TabItem", "TabPanel"]`. It had to become one: a tab and its
  panel both compare against the same selection, so both are members, and a single component name
  could only admit one of them. The emitter refused to compile `TabPanel` until the schema widened,
  which is the check working.
- The `tablist` role sits on the `list` part, not the root, because a tablist may contain only tabs.

### Known gaps — measured, not guessed

- **No keyboard.** Same gap as `RadioGroup`, and the reason Tabs was chosen: it confirms one
  navigation primitive would serve both. Arrow keys do nothing and every tab is in the Tab order.
- **Tabs and panels are not sorted into regions.** The contract says tabs go inside the tablist and
  panels after it; the emitter renders `children` in declaration order, so a consumer must place
  them correctly by hand.
- `selection.initial: first-enabled` is declared and read by nothing.
