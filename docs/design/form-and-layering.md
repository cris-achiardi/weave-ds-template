# Form and layering

- **Status:** Draft
- **Owns:** which layer is in front (figure and ground), how simple a shape can be and still read (closure, Prägnanz), and the minimum size of a target
- **Contracts:** [`Dialog`](../../packages/contracts/components/Dialog/Dialog.contract.json) · [`Tooltip`](../../packages/contracts/components/Tooltip/Tooltip.contract.json) · [`AccordionItem`](../../packages/contracts/components/AccordionItem/AccordionItem.contract.json)

## Intent

A person should never wonder what they are supposed to act on. The thing in front is clearly in
front; icons and marks are as simple as they can be and still be recognised; and anything that can
be pressed is big enough to press.

## Principles

- **DR1 — What is in front is unmistakable.** Every layered element — a modal, an overlay, text on
  an image — MUST differ clearly from what is behind it in contrast, elevation or dimming. When
  figure and ground are ambiguous, people cannot tell what to act on.
- **DR2 — A modal dims what it blocks.** A surface that blocks the page SHOULD dim the page behind
  it, so the visual layering matches what can actually be used.
- **DR3 — Simplest readable form.** Icons and marks SHOULD be reduced to the simplest shape that
  still carries their meaning. Detail that does not help recognition is removed.
- **DR4 — Leave out only what can be filled in.** A shape MAY drop strokes or be cropped — a card
  peeking from the edge of a carousel says there is more — but only where the intended reading is
  still the most likely one.
- **DR5 — Targets are big enough.** Anything that can be pressed or tapped MUST offer a target of
  at least 44 × 44 points, whatever its visible size.

## Checks

| Principle | Check                                                                                                                        |
| --------- | ---------------------------------------------------------------------------------------------------------------------------- |
| DR1       | For each layered element, confirm a clear difference in contrast, elevation or dimming between it and what is behind it.     |
| DR2       | For each blocking surface, confirm the content behind it is visibly dimmed.                                                  |
| DR3       | For each icon or mark, ask whether a simpler shape would carry the same meaning. Flag detail that does not help recognition. |
| DR4       | For simplified marks and partial shapes, confirm the intended shape is still the most likely reading.                        |
| DR5       | Measure the hit area of every interactive element. Flag any under 44 × 44 points.                                            |

## In this system

| Principle | Carried by                                                                                                                                                                                                          |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DR1, DR2  | [`Dialog`](../../packages/contracts/components/Dialog/Dialog.contract.json) — shows over the page with everything behind made inert. The contract makes the background unusable; it does not say how it looks (OQ1) |
| DR1       | [`Tooltip`](../../packages/contracts/components/Tooltip/Tooltip.contract.json) — sits over its trigger without taking focus, so it must read as in front without reading as something to act on                     |
| DR3       | [`AccordionItem`](../../packages/contracts/components/AccordionItem/AccordionItem.contract.json) — its indicator rotates rather than swapping glyph, so one simple shape carries both states                        |
| DR5       | Nothing yet. No contract declares a minimum target size, and no size token exists                                                                                                                                   |
| DR4       | Nothing mechanical. Design review                                                                                                                                                                                   |

## Don't

- Put text over an image with nothing separating them.
- Open a modal over an undimmed page.
- Use shadow or elevation on things that do not float.
- Draw an icon with more detail than it needs, or strip one until it reads as something else.
- Make a small icon button with a small hit area.

## Open questions

- **OQ1 — Dialog's backdrop is not specified.** The contract makes the page behind it inert but
  declares no backdrop part or paint, so DR2 is not carried yet. Adding one is a contract change.
- **OQ2 — Target size has no home.** DR5 needs either a size token every interactive contract
  paints against, or a check in the contract gate. Neither exists.
- **OQ3 — No icon set.** DR3 and DR4 have nothing to apply to until the system has icons.

## Boundary

This record defines layering, shape simplicity and target size. It does not define elevation or
shadow token values, grouping by containers ([`spatial-hierarchy`](./spatial-hierarchy.md)), or the
behaviour of overlays (their contracts).
