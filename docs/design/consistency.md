# Consistency

- **Status:** Draft
- **Owns:** what makes the product read as one system — repetition, pattern, similarity, unity, and the variety that keeps it from monotony
- **Contracts:** every contract in [`packages/contracts/components/`](../../packages/contracts/components/) — one contract per role is the mechanism

## Intent

A person who has learned one part of the product should already know the rest: the same kind of
thing looks and behaves the same everywhere, so they can skim instead of read. Variety is still
used, but deliberately, to mark something that really is different.

## Principles

- **DR1 — One role, one style.** Every element doing the same job — a primary action, a card, a
  section heading, a link — MUST look the same everywhere. Three button styles for one kind of
  action is a defect.
- **DR2 — Looks alike means acts alike.** Elements that look the same MUST behave the same, and
  elements that behave differently MUST look different. Otherwise people guess wrong about one of
  them.
- **DR3 — Patterns hold their shape.** A repeated group of elements — an image, a title and its
  metadata — MUST keep the same parts in the same order with the same spacing in every instance.
  Once someone has read one, they have read them all. A pattern is broken only to signal that
  something is actually different.
- **DR4 — A few decisions, kept.** Unity comes from making few choices and holding to them: one
  grid, one or two type families, one corner radius, one accent colour. A value used only once
  SHOULD be removed or justified.
- **DR5 — Variety is deliberate.** Variety SHOULD be introduced on purpose — to mark a new section
  or pull attention to a key point — and by changing one property at a time, so the variation looks
  chosen. On a long page, total sameness is a defect too.

## Checks

| Principle | Check                                                                                                                                                       |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DR1       | Group elements by role (buttons, cards, headings, links) and list the distinct styles in each. Flag any role with more than one style that is not intended. |
| DR2       | Group elements by appearance, then by behaviour. Flag any mismatch between the two groupings.                                                               |
| DR3       | Compare repeated components side by side. Confirm the same parts appear in the same order with the same spacing.                                            |
| DR4       | Count distinct font families, text sizes, colours, corner radii and shadow styles. Flag counts that look high for the scope, and any value used once.       |
| DR5       | On a long page, note where the layout pattern changes. Confirm each change serves a purpose. Flag both monotony and variation with no purpose.              |

## In this system

| Principle | Carried by                                                                                                                                                                                                                                                              |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DR1, DR3  | The contracts themselves. A component varies only along the axes its contract declares, so "the same role styled two ways" has to be an axis value or it is off-system — see [`packages/contracts/components/README.md`](../../packages/contracts/components/README.md) |
| DR2       | The prop glossary, [`.ai/maps/prop-map.md`](../../.ai/maps/prop-map.md), regenerated and gated by `pnpm prop-map:check` — the same idea gets the same name and values across components                                                                                 |
| DR2       | `pnpm verify:parity` — the four backends render the same element for one contract, so one component does not behave differently by framework                                                                                                                            |
| DR4       | Nothing yet. Counts of radii, colours and shadows need the token groups, which are not authored                                                                                                                                                                         |
| DR5       | Nothing mechanical. Composition review                                                                                                                                                                                                                                  |

## Don't

- Style one kind of action several ways.
- Make a decorative element look like a control, or a control look like decoration.
- Reorder the parts of a repeated component from one instance to the next.
- Introduce a colour, radius or shadow for a single use.
- Vary several properties at once to make something "interesting".

## Open questions

- **OQ1 — How many is too many.** DR4's counts depend on the scope of the design and need the
  token set before they can be stated for this system.
- **OQ2 — Pattern-level components.** Repeated groups such as a card with image, title and metadata
  are composition, not components here; no contract fixes their part order. Whether patterns get
  contracts of their own is undecided.

## Boundary

This record defines sameness and deliberate difference. It does not define the components' own
anatomy (their contracts) or the token values (tokens).
