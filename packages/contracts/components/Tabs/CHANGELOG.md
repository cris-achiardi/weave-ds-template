# Tabs — contract changelog

## Unreleased

### Changed — BREAKING (#44)

- **The tabs move to a named `tabs` slot that fills the `list` part; the panels stay children.**
  Before, `composition.children` admitted both kinds and every emitter rendered the `list` part
  as an EMPTY, self-closing `role="tablist"`, with every tab and panel projected as its sibling.
  No `role="tab"` was owned by the tablist, which breaks ARIA's required context for `tab` and
  the set position assistive technology announces. A consumer now passes the tabs in the slot:
  React `tabs={…}`, Vue `<template #tabs>`, Angular and web components `slot="tabs"` on each
  tab element. Panels are unchanged and render after the tablist, as its siblings.
- **`anatomy.root.parts.list` declares `namedByConsumer: true`** (schema
  `component-contract-14.json`). The `aria-label` / `aria-labelledby` a consumer passes to Tabs
  now lands on the tablist instead of the generic root, where ARIA prohibits it and it named
  nothing. Web components forward `aria-label` only: an `aria-labelledby` IDREF cannot resolve
  inside the shadow root, and that gap is reported as non-conforming, not claimed.
- The `a11y` note on the tablist's name now says where the name lands.

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
- ~~**Tabs and panels are not sorted into regions.**~~ Closed by the `tabs` slot above (#44). The
  original claim was worse than stated: the emitter did not render children in declaration order
  inside the tablist — it never rendered anything inside it.
- `selection.initial: first-enabled` is declared and read by nothing.
