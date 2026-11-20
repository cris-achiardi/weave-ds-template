# Visual hierarchy

- **Status:** Draft
- **Owns:** what a person sees first, second and last — contrast, emphasis, proportion, balance, symmetry and the path of the eye
- **Contracts:** [`Button`](../../packages/contracts/components/Button/Button.contract.json) · [`Switch`](../../packages/contracts/components/Switch/Switch.contract.json) · [`Dialog`](../../packages/contracts/components/Dialog/Dialog.contract.json)

## Intent

A person should know within a second what a screen is for and what to do first, because the most
important thing is visibly the most important, and the eye is led from it to the action. Hierarchy
is a ranking decided before styling; this record is how that ranking becomes visible.

## Principles

- **DR1 — Rank before styling.** Content MUST be ranked — first, second, third — from the brief
  ([`design-priorities/DR1`](./design-priorities.md)) before any size, weight or colour is chosen.
  The design then says that order through size, weight, colour, placement and space.
- **DR2 — One focal point per view.** Each view MUST have one focal point. Two equal focal points
  make the person choose, and they may choose wrong. In an interface the primary action is the
  usual place to spend it — not something decorative.
- **DR3 — Contrast is not only colour.** Contrast comes from value, size, weight, shape and
  isolation as well as hue. Emphasis SHOULD use the one property that does the job and leave the
  rest calm. Information carried by colour MUST also be carried by something else.
- **DR4 — High contrast is scarce.** If everything is high contrast, nothing stands out. The
  highest contrast SHOULD be reserved for the few things the person should see first. Text MUST meet
  at least 4.5:1 against its background, and large text and essential UI at least 3:1.
- **DR5 — Sizes differ obviously or not at all.** Sizes SHOULD come from a ratio (a type scale, a
  spacing scale) so they feel related. Two elements that differ by a little read as a mistake: if
  they are meant to differ, the difference MUST be obvious.
- **DR6 — Balance is intended.** Visual weight — size, darkness, saturation — SHOULD be distributed
  so the layout feels stable. A heavy element is answered by space or by lighter elements.
  Imbalance is allowed only as deliberate emphasis. Near-symmetry, where two halves almost match,
  MUST be resolved one way or the other.
- **DR7 — The eye path ends at the action.** The path the eye takes — led by alignment, lines,
  direction and the gaze of people in imagery — MUST run from an entry point, through the intended
  stops, to the intended action, and never lead off the page or away from the focal point. This is
  movement in the static sense; animated movement is [`motion`](./motion.md).

## Checks

| Principle | Check                                                                                                                                                                                                                                                   |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DR1       | Write out the likely reading order, from largest and highest contrast down. Compare it with the intended order in the brief. Count distinct levels and flag more than three or four.                                                                    |
| DR2       | Rank elements by size, contrast, colour and isolation. The top-ranked element must be the intended focal point. Flag it when the top two are close.                                                                                                     |
| DR3       | For each emphasised element, list which properties carry the emphasis. Flag more than one where one would do. Flag any state or meaning carried by colour alone.                                                                                        |
| DR4       | Compute the contrast ratio of every text and background pair from their hex values. Flag body text under 4.5:1 and large text or essential UI under 3:1. List the highest-contrast elements and confirm they are the focal points.                      |
| DR5       | List the sizes of comparable elements. Flag pairs that differ by less than about 15% unless they are meant to be identical.                                                                                                                             |
| DR6       | Divide the layout into halves and quadrants and estimate the weight in each from area, darkness and saturation. Flag a large imbalance unless it creates intended emphasis. In symmetric layouts, flag small unintended differences between the halves. |
| DR7       | Trace the eye from the entry point through each stop to the action, using alignment, lines, direction and gaze as cues. Compare it with the path in the brief.                                                                                          |

## In this system

| Principle     | Carried by                                                                                                                                                                                                                                                                           |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DR2           | [`Button`](../../packages/contracts/components/Button/Button.contract.json) — the `hierarchy` axis is the action's rank, separate from its colour; its description states a page holds one primary action, and the default is `secondary` so an unconsidered button does not compete |
| DR3           | [`Button`](../../packages/contracts/components/Button/Button.contract.json) — rank (`hierarchy`) and kind (`variant`) are separate axes, so emphasis and colour are chosen separately                                                                                                |
| DR3           | [`Switch`](../../packages/contracts/components/Switch/Switch.contract.json) — the thumb's position carries the state for anyone who cannot rely on colour                                                                                                                            |
| DR2           | [`Dialog`](../../packages/contracts/components/Dialog/Dialog.contract.json) — while open it is the only reachable thing, which makes it the focal point by construction                                                                                                              |
| DR4, DR5      | Nothing yet. Contrast and size ratios need the colour and size tokens, which are not authored — see [`packages/tokens/tokens/README.md`](../../packages/tokens/tokens/README.md)                                                                                                     |
| DR1, DR6, DR7 | Nothing mechanical. Composition review                                                                                                                                                                                                                                               |

## Don't

- Give two elements equal claim to be the focal point.
- Spend emphasis on decoration.
- Combine size, colour and weight to emphasise one thing when one of them would do.
- Use text that passes contrast only on a bright monitor.
- Make two sizes almost the same.
- Leave one side of a layout heavy with nothing answering it, unless that is the point.

## Open questions

- **OQ1 — Contrast pairs cannot be computed yet.** DR4 needs the colour roles the components paint
  with. Until the colour tokens exist, contrast is checked by hand on the Figma source.
- **OQ2 — One primary action per what.** Button's contract says "a page"; this record says "a
  view". A dialog over a page is a view with its own primary action. Which unit applies needs a
  decision, then one wording in both places.

## Boundary

This record defines emphasis and reading order. It does not define the colour palette or type
scale (tokens), grouping ([`spatial-hierarchy`](./spatial-hierarchy.md)), or text styling
([`typography`](./typography.md)).
