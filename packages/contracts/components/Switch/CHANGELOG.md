# Switch — contract changelog

The contract is the versioned artifact. A component generated from it is output, and is not
versioned at all — so this file is the only record of what a consumer's regenerated component will do
differently.

Classify every entry. **Breaking** means a consumer's existing usage stops working or starts behaving
differently: a state removed, a state's `control` narrowed, a part renamed, a role changed.
**Additive** means new surface that existing usage can ignore.

## Unreleased

### Added

- Initial contract. `status.level` is `experimental`, so nothing here is stable yet and breaking
  changes are expected without ceremony until it is not.
- States: `checked` (`shared`), `disabled` (`consumer`), `read-only` (`consumer`), `hover`
  (`internal`), `focus-visible` (`internal`).
- Anatomy: `root` (the track) containing `thumb`.
- `composition.children.max: 0` — a switch accepts no children. Its label is a sibling the consumer
  associates with it, not something it contains.

### Known gaps, recorded rather than filled

- **`read-only` has no designed visual.** A read-only switch is currently indistinguishable from an
  interactive one. Naming a treatment here would be a guess.
- **No form participation.** `name`, `value` and `required` have no home in the schema yet, so a
  generated Switch cannot take part in a form submission. See `packages/contracts/README.md`.
- **No `layout` block.** The structural CSS a generated Switch needs — the thumb being out of flow so
  its position can carry the state — is not stated in this contract. The emitter supplies it, which
  means it is not the contract's decision and nothing checks it.
