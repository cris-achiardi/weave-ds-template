# Checkbox — contract changelog

## Unreleased

### Added

- Initial contract. `status.level` is `experimental`.
- **First state in this library with more than two values.** `checked` is
  `unchecked | checked | mixed`, declared with `states.*.values` and `states.*.default` — both added
  to the schema for this component.
- `activates.between` names the two values a **user** may move between. `mixed` is not a click
  target: it is reported by a parent whose children disagree, and activating a mixed checkbox
  resolves it to `checked`, which is what the APG specifies.
- `visibleWhen` now takes `state=value`, so the tick is `checked=checked` and the dash is
  `checked=mixed` — two different marks for two different facts.
- States: `checked` (`shared`, valued), `disabled` and `invalid` (`consumer`), `hover` and
  `focus-visible` (`internal`).

### Why three values and not two booleans

`checked` plus `indeterminate` as separate flags admits `checked: true, indeterminate: true`, which
is meaningless, and no gate in this repo could reject it. One state with three values makes the
illegal combination unrepresentable.

### Known gaps — measured, not guessed

- **The ARIA mapping is emitter knowledge.** This contract's values are `unchecked`/`checked`/
  `mixed`; ARIA's are `false`/`true`/`mixed`. Only the third coincides. The table that maps them
  lives in the emitter and in neither schema — the same gap the state-to-attribute mapping has.
- Renders `role="checkbox"` on a button rather than a native `<input type="checkbox">`. The native
  input cannot express `mixed` from markup at all — `indeterminate` is a DOM property with no
  attribute — and it brings styling constraints the unstyled model cannot accept. The cost is the
  usual one: no form participation.
- Nothing derives `mixed` from a set of child checkboxes. The contract says that is where it comes
  from; expressing "this checkbox summarises those" would need the collection vocabulary pointed
  the other way, and has not been tried.
