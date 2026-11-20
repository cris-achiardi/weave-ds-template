# Design priorities

- **Status:** Draft
- **Owns:** the brief every design starts from, the order principles yield in when they conflict, and the create and review procedures
- **Contracts:** every contract in [`packages/contracts/components/`](../../packages/contracts/components/) — this record ranks concerns, it does not replace any

## Intent

The principles in the other records are tools for judgement, not a checklist to apply everywhere.
Applied without knowing what a screen is for, they put emphasis, hierarchy and movement in the wrong
places, and each fix looks correct on its own while the screen gets worse. This record fixes three
things: what has to be known before any principle is applied, the order principles give way in when
they conflict, and the procedure for making or reviewing a design. Every other record is reached
from here.

## Principles

- **DR1 — Start from the brief.** Before applying any principle, the author MUST know, or state
  as an assumption:
  1. the purpose of the piece, and who it is for;
  2. the intended focal points, in order of importance;
  3. where the eye should land first, where it moves next, and where it ends — usually an action;
  4. whether this is a new design or a review or refinement of an existing one;
  5. the fixed constraints — brand system, platform, accessibility requirements, content that
     cannot change.

  The rest of this directory calls these answers **the brief**. When they are not available, the
  assumptions MUST be written down before work continues.

- **DR2 — Conflicts resolve in a fixed order.** When two principles pull against each other,
  protect, in order:
  1. accessibility and legibility;
  2. clarity of purpose and focal point;
  3. hierarchy and reading order;
  4. consistency and unity;
  5. visual interest and variety.

  The usual tensions are unity against variety, emphasis against repetition, and symmetry against
  movement. A decision that favours one side MUST name the tension and say which side it favoured
  and why.

- **DR3 — Structure, then systems, then surface, then motion.** A design SHOULD be made, and
  reviewed, in that order: grouping and hierarchy first; then the spacing scale, type scale,
  palette and component styles; then contrast, typography and alignment; motion last. Polish on a
  screen whose structure is wrong is wasted.
- **DR4 — Change one property at a time.** A fix MUST change one property. Changing size, colour
  and position together to solve one problem usually creates another, and hides which change
  worked.
- **DR5 — Judged at real size, rendered.** Type, spacing and contrast MUST be judged at the size and
  on the devices they will be seen on. A value can be correct and still look wrong.
- **DR6 — A broken rule may be the point.** Asymmetry, a broken pattern or extra contrast is often
  intentional. A reviewer MUST ask before "fixing" one.
- **DR7 — A finding names its consequence.** Every review finding MUST be written as location →
  principle → consequence → fix. A finding with no consequence for the people using the design is a
  preference, and MUST be labelled as one.
- **DR8 — Numbers are starting points.** The thresholds in these records are where to start, not
  laws. Evidence from people using the design overrides them — except accessibility minimums,
  which DR2 puts first.

## Checks

### Procedure — creating a design

1. Confirm the brief (DR1).
2. Define the structure: group content with proximity and common region, then set the hierarchy so
   the reading order matches the intended order — [`spatial-hierarchy`](./spatial-hierarchy.md),
   [`visual-hierarchy`](./visual-hierarchy.md).
3. Set up systems before details — a spacing scale, a type scale, a small palette, one set of
   component styles — [`consistency`](./consistency.md), [`typography`](./typography.md).
4. Apply contrast and emphasis only to the intended focal points —
   [`visual-hierarchy`](./visual-hierarchy.md).
5. Set typography: line length, line height, weight, case, alignment —
   [`typography`](./typography.md).
6. Add motion last, and only where it explains change or directs attention —
   [`motion`](./motion.md).
7. Run the review below on the result and fix what fails before presenting.

### Procedure — reviewing or refining a design

1. Confirm the brief (DR1).
2. Record a first impression: where the eye lands first, and what the piece seems to be for.
   Compare that with the brief.
3. Structure — grouping, hierarchy, reading order: [`spatial-hierarchy`](./spatial-hierarchy.md),
   [`visual-hierarchy`](./visual-hierarchy.md).
4. Systems — spacing, type, colour, component consistency: [`consistency`](./consistency.md).
5. Surface — contrast, typography, alignment: [`typography`](./typography.md),
   [`form-and-layering`](./form-and-layering.md).
6. Motion, if any: [`motion`](./motion.md).
7. Report in the format below. When refining, change the highest-impact issues first and leave
   everything else as it is (DR4).

### Review targets

Each target is owned by the record linked beside it; this table only collects them.

| Check                          | Target                                     | Owner                                       |
| ------------------------------ | ------------------------------------------ | ------------------------------------------- |
| Body text contrast             | at least 4.5:1                             | [visual-hierarchy](./visual-hierarchy.md)   |
| Large text and UI contrast     | at least 3:1                               | [visual-hierarchy](./visual-hierarchy.md)   |
| Line length, body text         | about 45 to 75 characters                  | [typography](./typography.md)               |
| Line height, body text         | about 1.4 to 1.6                           | [typography](./typography.md)               |
| Line height, large headings    | about 1.1 to 1.2                           | [typography](./typography.md)               |
| Type scale ratio               | about 1.2 dense UI, 1.33 or more editorial | [typography](./typography.md)               |
| Distinct text sizes per screen | 3 or 4                                     | [typography](./typography.md)               |
| Font families                  | 1 or 2                                     | [typography](./typography.md)               |
| Font weights                   | 2 or 3                                     | [typography](./typography.md)               |
| Touch targets                  | at least 44 × 44 points                    | [form-and-layering](./form-and-layering.md) |
| Small UI motion                | about 150 to 300 ms                        | [motion](./motion.md)                       |
| Feedback after input           | within about 100 ms                        | [motion](./motion.md)                       |
| List stagger                   | about 20 to 50 ms per item                 | [motion](./motion.md)                       |

### Reporting format

1. **Context.** The brief, or the assumptions made in its place (DR1).
2. **Strengths.** What works and should be kept.
3. **High-impact issues.** Anything that blocks understanding, use or access — unreadable text, a
   missing or wrong focal point, a confusing reading order.
4. **Refinements.** Polish and consistency.
5. **Open questions.** Anything that needs more context.

A weak finding: _"The typography feels off."_ A strong one (DR7): _"The plan cards (location) use
two text sizes that differ by only 1px (proportion), so the price reads as a typo rather than a
choice (consequence). Use one size, or make the difference at least one step on the type scale
(fix)."_

## In this system

| Principle               | Carried by                                                                                                                                                                                      |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DR2.1                   | Each contract's `a11y` section in [`packages/contracts/components/`](../../packages/contracts/components/), enforced by `pnpm verify:contract`                                                  |
| DR4                     | Contract axes: a component varies only along the axes its contract declares, so a fix is a change to one axis value, not a restyle                                                              |
| DR5                     | The four sandboxes (`pnpm dev`, `pnpm dev:vue`, `pnpm dev:angular`, `pnpm dev:wc`) render every contract; the Figma source is read as described in [`.figma/README.md`](../../.figma/README.md) |
| DR1, DR3, DR6, DR7, DR8 | Nothing mechanical. These are review practice                                                                                                                                                   |

## Don't

- Apply a principle before the brief is known or assumed in writing.
- Polish a screen whose focal point or reading order is still wrong (DR3).
- Fix one problem by changing several properties at once (DR4).
- Judge type or spacing zoomed out on a canvas instead of at real size (DR5).
- Report a preference as an issue (DR7).

## Open questions

- **OQ1 — Which checks become gates.** Contrast, distinct text sizes, line height and duration
  ranges are computable once tokens exist; grouping, focal point and eye path stay human review.
  Nothing is gated until a clean baseline exists — see the enforcement rules in
  [`AGENTS.md`](../../AGENTS.md).
- **OQ2 — Where "use the components as they ship" sits in DR2.** Some systems rank "compose with
  the components and tokens; do not restyle them" directly after accessibility. This order does not
  include it. Deciding it needs the first real composition review.

## Boundary

This record ranks concerns and holds the procedures. Each concern's rules live in its own record;
this one does not restate them.
