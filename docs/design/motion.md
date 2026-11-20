# Motion

- **Status:** Draft
- **Owns:** when things animate and how — timing, easing, weight, sequence, grouping in motion, staging, and the reduced-motion fallback
- **Contracts:** [`Switch`](../../packages/contracts/components/Switch/Switch.contract.json) · [`AccordionItem`](../../packages/contracts/components/AccordionItem/AccordionItem.contract.json) · [`Tooltip`](../../packages/contracts/components/Tooltip/Tooltip.contract.json) · [`Dialog`](../../packages/contracts/components/Dialog/Dialog.contract.json)

## Intent

Motion should explain what changed and where to look, then get out of the way. A person should feel
the interface respond immediately, see related things move as one, and never have to wait for an
animation to finish — and someone who has asked for less motion should lose nothing by it.

Movement of the eye through a still layout is not this record; it is
[`visual-hierarchy/DR7`](./visual-hierarchy.md).

## Principles

- **DR1 — Motion explains change or directs attention.** An animation MUST do one of those two
  things. Motion is added last, after structure and surface are right.
- **DR2 — Reduced motion loses nothing.** Every animation MUST have a calmer fallback — a short
  fade, or none — when the person has asked for reduced motion. Essential information MUST NOT exist
  only in motion.
- **DR3 — Respond within 100 ms.** Visible feedback MUST start within about 100 ms of input. A
  wind-up before an action (anticipation) is allowed only if it does not delay that feedback.
- **DR4 — Short, and longer for bigger things.** Small UI changes SHOULD take about 150 to 300 ms;
  larger moves across the screen MAY take longer, up to about 500 ms. Large surfaces — sheets,
  dialogs — SHOULD move slower and softer than small ones such as chips and toggles, and the same
  kind of object SHOULD move the same way everywhere.
- **DR5 — Ease out to enter, ease in to leave.** Entering elements SHOULD ease out and leaving
  elements ease in. Linear motion is kept for progress bars, loops and continuous rotation.
- **DR6 — Related things move together; children follow parents.** Elements that belong together
  SHOULD animate together, and unrelated ones MUST NOT. A menu, tooltip or attached panel MUST move
  with the element that opened it.
- **DR7 — One star per transition.** Each transition SHOULD have one focal element; everything else
  supports it. A secondary movement — an icon nudge, a badge pulse — MUST be smaller and shorter
  than the main one.
- **DR8 — Stagger briefly.** Items entering in sequence SHOULD be staggered by about 20 to 50 ms,
  and the whole sequence SHOULD stay under about 500 ms.
- **DR9 — Physical, and subtle.** Arcs on long paths, a little squash on press (keeping volume),
  content settling a beat after its container, a small overshoot — these MAY be used to make motion
  feel physical, kept subtle in an interface. Exaggerated motion is reserved for moments worth
  remembering, such as success.

## Checks

| Principle | Check                                                                                                                                                             |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DR1       | For each animation, name the change it explains or the attention it directs. Flag any that does neither.                                                          |
| DR2       | For each animation, confirm a reduced-motion fallback exists and that no information is available only through the animation.                                     |
| DR3       | Confirm visible feedback starts within about 100 ms of input, including where anticipation is used.                                                               |
| DR4       | List durations by element size. Flag small UI transitions over about 300 ms, large ones over about 500 ms, and larger surfaces moving faster than smaller ones.   |
| DR5       | List easing curves. Flag linear easing outside progress, loops and continuous rotation. Confirm entering elements ease out and leaving elements ease in.          |
| DR6       | List elements that animate or change state together and confirm each set is related. Confirm menus, tooltips and attached panels move with their trigger.         |
| DR7       | For each transition, name the single focal element. Flag transitions where several unrelated elements move at once, or a secondary motion outweighs the main one. |
| DR8       | Multiply the stagger by the number of items. Flag totals over about 500 ms.                                                                                       |
| DR9       | Confirm deformation keeps volume (width and height change in opposite directions) and stays subtle, and that exaggerated motion is limited to memorable moments.  |

## In this system

| Principle          | Carried by                                                                                                                                                                                                                                                                                                                   |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DR4                | [`Switch`](../../packages/contracts/components/Switch/Switch.contract.json) (the thumb) and [`AccordionItem`](../../packages/contracts/components/AccordionItem/AccordionItem.contract.json) (the indicator) — each declares a `transition-duration` paint with no source yet. The slot exists; the value is undecided (OQ1) |
| DR1, DR6           | [`AccordionItem`](../../packages/contracts/components/AccordionItem/AccordionItem.contract.json) — the indicator rotates rather than swapping glyph, so the change reads as one object moving. The contract also records that animating the panel's height has to handle the first frame                                     |
| DR3, DR6           | [`Tooltip`](../../packages/contracts/components/Tooltip/Tooltip.contract.json) — opens immediately on focus and after a short delay on hover, and positions itself against its trigger                                                                                                                                       |
| DR7                | [`Dialog`](../../packages/contracts/components/Dialog/Dialog.contract.json) — the dialog is the only reachable thing while open, so it is the natural star of its own entrance                                                                                                                                               |
| DR2, DR5, DR8, DR9 | Nothing yet. No contract declares a reduced-motion fallback or an easing, and the `motion.json` token group is not authored — see [`packages/tokens/tokens/README.md`](../../packages/tokens/tokens/README.md)                                                                                                               |

## Don't

- Animate something only because it can be animated.
- Hide essential information inside an animation.
- Use the same duration for everything regardless of size.
- Let a wind-up delay the response to a click.
- Let a menu or tooltip drift away from its trigger.
- Animate several unrelated things at once.
- Use bouncy, exaggerated motion on routine interactions.

## Open questions

- **OQ1 — Motion tokens.** Switch and AccordionItem already have a `transition-duration` slot with
  no source. Durations and easings need a `motion.json` token group before DR4 and DR5 can be
  carried.
- **OQ2 — Where the reduced-motion fallback is declared.** No contract field can say what a
  component does under reduced motion. Whether that belongs in the contract schema or stays in each
  backend's CSS is a schema decision — see
  [`packages/contracts/schema/README.md`](../../packages/contracts/schema/README.md).

## Boundary

This record defines motion. It does not define the movement of the eye through a still layout
([`visual-hierarchy`](./visual-hierarchy.md)), duration or easing values (tokens), or when an
overlay opens and closes (its contract).
