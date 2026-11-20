# Tooltip — contract changelog

## Unreleased

### Changed

- The `trigger` part's `describedBy: [popup]` is now generated onto the element supplied to the
  `trigger` slot, not the part's wrapper, in all four backends (#46, ADR 0005), merged after any
  `aria-describedby` the consumer put on it. No contract field changed.
- Known gap: in WC, a slotted trigger that is itself a shadow host receives the description on its
  host only (#52).

### Added

- Initial contract. `status.level` is `experimental`.
- States: `open` (`shared`), `disabled` (`consumer`).
- `placement` axis, narrowed to eight of the overlay profile's twelve values.
- Parts: `trigger` (describedBy `popup`) and `popup` (`role: tooltip`, `visibleWhen: open`).

### Known gaps — measured, not guessed

**The authority order breaks here.** The W3C ARIA APG's tooltip pattern is explicitly _"work in
progress; it does not yet have task force consensus"_ and does not say what SHOWS a tooltip — only
that Escape dismisses one. The normative layer is incomplete, so the naming layer is carrying more
weight than intended.

- **Nothing opens it.** Hover-after-a-delay and focus are stated in `intent.behaviour` as prose.
  `activates` covers activation only, so the emitted component exposes `open` and never sets it.
- **No delay.** The duration is a behaviour parameter with nowhere to live.
- **No Escape.** There is no way to declare a key that is not activation.
- **No positioning.** No anchor, no side, no offset, no collision handling, no portal or layer. The
  `placement` axis is declared and read by nothing; the generated tooltip is absolutely positioned
  inside its wrapper and will be clipped by any ancestor with `overflow: hidden`.
- A tooltip that only ever appears on hover is invisible on touch. Recorded in `a11y.notes`; nothing
  can enforce it.
