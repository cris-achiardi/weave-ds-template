# RadioGroup — contract changelog

## Unreleased

### Added

- Initial contract. `status.level` is `experimental`.
- `collection` with `cardinality: one` — the first use of it. Selection is `shared`.
- States: `disabled` and `read-only`, both `consumer`.

### Known gaps — measured, not guessed

**The keyboard model does not compile.** The APG for this pattern is normative and complete, and
requires: arrow keys that move focus AND change the selection, wrapping at both ends; a roving
tabindex with exactly one option in the Tab sequence, entering on the chosen option; and disabled
options skipped. `intent.behaviour` states all of it in prose and the contract can express none of
it, so every option is tabbable and the arrow keys do nothing.

This is the behaviour-vocabulary gap in its sharpest form: unlike the accordion, where the APG had
removed roving focus and the platform's own button behaviour was enough, here the normative source
demands a keyboard model and the contract has no way to carry it.

- `read-only` has no designed visual, recorded rather than filled.
- No form participation, so a generated group cannot be submitted.
