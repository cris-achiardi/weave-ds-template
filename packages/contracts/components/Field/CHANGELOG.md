# Field — contract changelog

The contract is the versioned artifact. A component generated from it is output and is not versioned
at all, so this file is the only record of what a consumer's regenerated component will do
differently.

## Unreleased

### Changed

- The `control` part's `namedBy`/`describedBy` are now generated onto the element supplied to the
  `control` slot, not the part's wrapper, in all four backends (#35, ADR 0005). The supplied
  element is also marked `aria-invalid` while `invalid` holds, because the described `error` part is
  `visibleWhen: invalid`. The `label` part renders as a native `<label for>` in React, Vue and
  Angular; in WC clicking it focuses the slotted control. No contract field changed.
- Known gap: in WC, a slotted control that is itself a shadow host (`ds-switch`, `ds-text-field`)
  receives the relations on its host only (#52).

### Added

- Initial contract. `status.level` is `experimental`.
- States: `invalid`, `touched`, `dirty` (`shared`), `disabled` (`consumer`), `focused`, `valid`,
  `filled` (`internal`).
- Slots: `label` and `control` (both required), `description`, `error`.
- Anatomy: `root` containing `label`, `description`, `error`.

### Known gaps — measured, not guessed

Compiling this contract produced a component that **renders correctly and does nothing**. See
`docs/research/0002-compiling-a-contract-into-a-component.md`.

- **No relationships.** Field exists to associate a control with its label, description and error.
  The contract states those associations only as prose in `intent.behaviour`, so the generated
  component wires none of them: the control is named by its placeholder, the error is not announced,
  and `aria-invalid` is absent.
- **Nothing says what changes `invalid`, `touched` or `dirty`.** They are `shared`, so they work when
  controlled from outside; their uncontrolled form can never move, and the generated file says so
  where the setter would be.
- **The `control` slot has no matching anatomy part**, so generated markup places it after the
  error rather than before it.
- `valid` has no designed visual, recorded rather than filled.
