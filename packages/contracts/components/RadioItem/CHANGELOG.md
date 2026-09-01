# RadioItem — contract changelog

## Unreleased

### Added

- Initial contract. `status.level` is `experimental`. Only meaningful inside a `RadioGroup`.
- `member` of `RadioGroup`, identity `value`, reflecting `checked`.
- Root declares `role: radio` and `activates: { toggles: member }`.
- `mark` part uses `visibleWhen: checked` — the non-colour signal that this option is the answer.

### Known gaps — measured, not guessed

- **`activates.toggles` is the wrong word here.** In a `cardinality: one` collection, activating a
  member SELECTS it and can never unselect it. The emitter does the right thing because it reads
  cardinality from the ancestor, so the generated code is correct and the field name is a lie.
- **Roving tabindex is not generated.** `semantics.focusable` produces `tabIndex={0}` on every
  option, so Tab walks through the whole group instead of entering it once. See the RadioGroup
  changelog.
- Renders `role="radio"` on a div rather than a native input, so there is no form participation.
