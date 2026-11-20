# Spatial hierarchy

- **Status:** Draft
- **Owns:** grouping through space — white space, proximity, rhythm, common region, continuity and connecting lines
- **Contracts:** [`Field`](../../packages/contracts/components/Field/Field.contract.json) · [`Tabs`](../../packages/contracts/components/Tabs/Tabs.contract.json) · [`TabPanel`](../../packages/contracts/components/TabPanel/TabPanel.contract.json) · [`RadioGroup`](../../packages/contracts/components/RadioGroup/RadioGroup.contract.json) · [`Accordion`](../../packages/contracts/components/Accordion/Accordion.contract.json)

## Intent

A person should understand what belongs together before reading a single label. Distance says how
things relate; boxes and lines are added only when distance alone cannot. Empty space is part of
the design — and it does not have to be white.

## Principles

- **DR1 — Closer means related.** Elements that belong together MUST sit closer to each other than
  to anything else. The space inside a group MUST be clearly smaller than the space between groups.
  Labels sit next to the fields they describe; actions sit next to what they affect.
- **DR2 — Gaps come from a scale.** Every margin, padding and gap SHOULD come from one small
  spacing scale, so the spacing has a steady rhythm. A one-off value is a defect unless it is
  intended.
- **DR3 — A bigger gap starts a new thought.** The space before a new section SHOULD be visibly
  larger than the space within one. In long reading, rhythm comes from steady line height and
  paragraph spacing.
- **DR4 — Space before containment.** Content SHOULD be grouped with space and alignment first. A
  card, tint or border — a common region — is added when proximity alone cannot hold a group,
  usually because the content inside it varies. Containers MUST NOT nest more than two deep, and a
  border or background that does not change the grouping is removed.
- **DR5 — Shared axis, broken only at a boundary.** Items in a sequence SHOULD share an axis so the
  eye can travel along it. A break in alignment reads as the end of a group, so it MUST only happen
  where a group ends.
- **DR6 — Connecting lines are rare.** A connecting line groups more strongly than proximity or
  similarity. Lines SHOULD be used only for steps, relationships and flows, and the layout MUST
  still read without the ones that are not essential.
- **DR7 — Crowded means remove.** When a layout feels cramped, authors SHOULD remove something
  before shrinking the spacing. Content MUST NOT touch, or nearly touch, its container.

## Checks

| Principle | Check                                                                                                                                                                                                                             |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DR1       | For each label and control, measure the distance to the element it belongs to and to the nearest unrelated element. The related one must be clearly closer. For each group, compare the inner gap with the gap to the next group. |
| DR2       | List every margin, padding and gap value. Check they come from a small set such as 4, 8, 16, 24, 32. Flag one-off values.                                                                                                         |
| DR3       | Compare the gap before each section heading with the gaps inside the section. The former must be visibly larger.                                                                                                                  |
| DR4       | Count nested containers. Flag nesting deeper than two, and borders or backgrounds that do not change the grouping.                                                                                                                |
| DR5       | Collect the left edges of items in each sequence. Flag edges off by a few pixels, and alignment breaks that do not mark the end of a group.                                                                                       |
| DR6       | Count connecting lines. Confirm each joins related items, and that the design still reads with the non-essential ones removed.                                                                                                    |
| DR7       | Flag sections where content touches or nearly touches its container.                                                                                                                                                              |

## In this system

| Principle | Carried by                                                                                                                                                                                                                                                                           |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DR1       | [`Field`](../../packages/contracts/components/Field/Field.contract.json) — binds a label, its help text and its error to one control, so the group that should sit together is declared, not inferred                                                                                |
| DR6       | [`Tabs`](../../packages/contracts/components/Tabs/Tabs.contract.json) and [`TabPanel`](../../packages/contracts/components/TabPanel/TabPanel.contract.json) — the tab strip and its panel are one object; the visual connection between them is the strongest grouping on the screen |
| DR4       | [`RadioGroup`](../../packages/contracts/components/RadioGroup/RadioGroup.contract.json) and [`Accordion`](../../packages/contracts/components/Accordion/Accordion.contract.json) — a declared collection: their members are a group whether or not a box is drawn around them        |
| DR2, DR3  | Nothing yet. The spacing scale is a token group (`space.json`) that is not authored — see [`packages/tokens/tokens/README.md`](../../packages/tokens/tokens/README.md)                                                                                                               |
| DR5, DR7  | Nothing mechanical. Composition review                                                                                                                                                                                                                                               |

## Don't

- Space everything equally, so nothing groups.
- Put a label closer to the wrong field.
- Use a card or a divider where proximity would do.
- Put boxes inside boxes inside boxes.
- Shrink spacing to fit more in.
- Nudge a single element with a one-off value.

## Open questions

- **OQ1 — The spacing scale does not exist.** DR2 and DR3 need one. It is measured from the design
  source, not invented — the tokens README says why.
- **OQ2 — Who owns the gap.** No contract in this repo is a layout primitive (a stack or a row), so
  the gap between components belongs to whatever the consumer composes them in. Whether the system
  should ship a layout contract that owns spacing — so a gap is set once, on the container — is
  undecided.

## Boundary

This record defines grouping through space. It does not define the spacing values (tokens), what is
emphasised ([`visual-hierarchy`](./visual-hierarchy.md)), or layering and elevation
([`form-and-layering`](./form-and-layering.md)).
