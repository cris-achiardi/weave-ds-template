# Dialog — contract changelog

## Unreleased

### Added

- Initial contract. `status.level` is `experimental`.
- State: `open` (`shared`). Axis: `size`.
- Parts: `root` (the scrim, `visibleWhen: open`) containing `panel` (`role: dialog`,
  `namedBy: title`) containing `title`, `body` and `actions`.

### Known gaps — measured, not guessed

**This contract compiles to a styled box that appears and disappears.** Everything that makes a
dialog modal is missing, and all four are stated in the contract:

- **No focus containment.** Tab walks straight out of the open dialog and into the page behind it.
- **No focus movement in, and no return.** Focus stays wherever it was; on close it is not restored.
- **No inert background.** The scrim paints over the page; every control behind it is still
  focusable and still readable by a screen reader. This is the most common way the pattern is got
  wrong, and the generated component gets it wrong.
- **No Escape.** There is no way to declare a key that is not activation.

**What was traded away.** A native `<dialog>` opened with `showModal()` supplies focus containment,
background inertness and Escape for free. It was rejected because it cannot be portalled into an
arbitrary container and brings a top-layer stacking model the unstyled approach cannot reason about.
That trade is worth re-examining: three of the four gaps above are gaps only because of it.
