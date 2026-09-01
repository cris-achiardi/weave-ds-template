# AccordionItem — contract changelog

## Unreleased

### Added

- Initial contract. `status.level` is `experimental`. Only meaningful inside an `Accordion`.
- States: `open` (`internal` — owned by the ancestor), `disabled` (`consumer`), `hover` and
  `focus-visible` (`internal`).
- Slots: `heading` and `panel`, both required.
- Anatomy: `root` containing `header` (internal), `trigger` (containing `indicator`), and `panel`.

### Known gaps — measured, not guessed

- **`semantics.role` lands on the wrong node.** The role is `button` and it belongs to the `trigger`
  part, not the root. Neither schema has a field for which part carries a role, so the binding says
  it in a prose note and the emitter put it on the root — making the whole section, heading and panel
  together, announce as one button.
- **No identity.** Which item this is — the value an ancestor compares against — is not expressible.
- **`open` is correctly `internal`**, so the item takes no open prop in any framework. That part
  worked exactly as ADR 0004 intends.
- **The `heading` slot does not match the `header` part**, so its content renders outside the region
  meant to hold it.
- The heading level has no home: the APG requires one that fits the surrounding page, no default is
  safe, and nothing in the schema can declare a required consumer-supplied value.
