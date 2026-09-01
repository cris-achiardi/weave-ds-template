# TextField — contract changelog

## Unreleased

### Added

- Initial contract. `status.level` is `experimental`.
- **First state whose value is free text.** `valueType: "string"` was added to the schema for it:
  a text field's value is not a boolean and cannot be enumerated, so neither of the two shapes that
  existed could describe it.
- States: `value` (`shared`, string), `disabled`, `read-only`, `invalid` (`consumer`), `hover` and
  `focus-visible` (`internal`).
- Axis: `size`.

### Known gaps — measured, not guessed

- **Nothing in the contract says typing changes the value.** It works only because the binding
  renders a native `<input>` and the emitter knows an input edits its own value. That is platform
  knowledge in a React emitter; a backend rendering anything else would have to reimplement editing
  with nothing to guide it.
- **No `type`.** Password, email and search are different keyboards on a phone, which is a real
  difference and not a styling one. Each would need its own contract or a prop this one lacks.
- The emitter had to be taught that a free-form value must NOT reach the DOM as a data attribute:
  the first version mirrored whatever was typed into `data-ds-state-value`. A boolean or an
  enumerated state is a styling hook; free text is content.
