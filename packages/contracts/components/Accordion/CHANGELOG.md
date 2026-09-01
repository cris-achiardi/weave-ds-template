# Accordion — contract changelog

## Unreleased

### Added

- Initial contract. `status.level` is `experimental`.
- State: `disabled` (`consumer`).
- Axis: `orientation`, narrowed to `vertical` only.
- Composition: children accept `AccordionItem`, minimum 1.

### Known gaps — measured, not guessed

**This contract cannot currently be compiled into a working component.** Compiling it produces a
correct, inert wrapper. See `docs/research/0002-compiling-a-contract-into-a-component.md`.

- **The open set is not in the contract.** Which sections are expanded — the component's central
  fact — appears only as prose in `intent.behaviour`. It is not a state, not an axis and not a slot,
  so the generated component has no `value`, no `onValueChange` and no `multiple`, and nothing can
  open a section.
- This is the behaviour-vocabulary gap. No emitter improvement can close it, because the information
  is not there to read.
