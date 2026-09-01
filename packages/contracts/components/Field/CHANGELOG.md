# Field — contract changelog

The contract is the versioned artifact. A component generated from it is output and is not versioned
at all, so this file is the only record of what a consumer's regenerated component will do
differently.

## Unreleased

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
