# Slider — contract changelog

## Unreleased

### Added

- Initial contract. `status.level` is `experimental`.
- **First value that is a number in a range.** `valueType: "number"` with `min`, `max` and `step`,
  all added to the schema for it. `aria-valuemin`, `aria-valuemax` and `aria-valuenow` are generated
  from them.
- States: `value` (`shared`, number), `disabled` (`consumer`), `dragging`, `hover`,
  `focus-visible` (`internal`).

### Known gaps — measured, not guessed

**This contract compiles to a shell.** Everything that makes a slider a slider is missing:

- **No keyboard.** The APG requires arrow keys to move by a step, Page Up/Down by a larger jump, and
  Home/End to the ends. `intent.behaviour` says all of it and the contract can express none of it.
  Note that this is a DIFFERENT gap from RadioGroup's: that one navigates between items, this one
  steps a number. One navigation primitive will not cover both.
- **No drag.** Pointer tracking has no home at all.
- **The fill's length and the thumb's offset ARE the value**, computed at render time. That is
  arithmetic over a state, not a static declaration, so no `layout` block of CSS-shaped rules could
  express it either. The consumer currently has to hand the number back in as a custom property and
  do the arithmetic in their own theme file.
- **No `aria-valuetext`.** The contract's a11y notes say some ranges are meaningless as a bare
  number — a rating, a date, named tiers — and there is no way to supply the text.
- **The drawn size and the hit area are different numbers** and only one is stated. `minHitArea: 44`
  is recorded and read by nothing.
