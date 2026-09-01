# Button — contract changelog

## Unreleased

### Added

- Initial contract. `status.level` is `experimental`.
- **First use of `axes` and `whenAxis`**, both of which had been in the schema since before this
  branch and had never been read by anything.
- Axes: `hierarchy` (primary · secondary · tertiary, default `secondary`), `variant`
  (neutral · brand · danger, default `neutral`), `size` (s · m · l, default `m`).
- States: `disabled` and `loading` (`consumer`); `hover`, `active`, `focus-visible` (`internal`).
- `composition.children` names the `label` part — the first contract where children fill a
  described region rather than landing wherever they land.

### Decisions worth knowing

- **`hierarchy` and `variant` are separate axes on purpose.** `hierarchy` is the rank of the action;
  `variant` is what kind of action it is. A secondary destructive action is both, and one axis could
  not say so. The sandbox renders that pair specifically.
- **`hierarchy` defaults to `secondary`, not to the canon's `primary`.** A page holds one primary
  action; defaulting to it makes every unconsidered button shout.
- **The axis is called `hierarchy`, not `role`.** `role` is a real HTML attribute that tells
  assistive technology what an element IS, and a button carrying `role="primary"` would stop being
  announced as a button. It is the one word in the vocabulary already spoken for.
- `success` and `warning` exist in the canon and are deliberately not taken: an action is not a
  status.

### Known gaps — measured, not guessed

- **`loading` reaches the DOM as `data-ds-state-loading` and not as `aria-busy`.** The contract says
  it must reach assistive technology, and cannot say how. A user who cannot see the spinner is told
  nothing.
- **No submit button.** `type` is fixed to `button`, so this cannot submit a form. That is a
  different contract or a prop this one does not have.
- No layout: the flex row, the icon sizing and the `:empty` icon collapse all live in the consumer's
  theme file. As everywhere else.
