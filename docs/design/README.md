# Design direction

How screens built with this system should look and behave — one record per design concern. A
record states **intent**: what a person should perceive, the principles that deliver it, how to
check each one, and what is ruled out. It then **points at the component contract** that carries
each principle ([`packages/contracts/components/`](../../packages/contracts/components/)). It never
restates a prop, a token step or a value; those change with the code and live in the contract or
the token source. Where a principle needs a mapping no contract or token carries yet, the record
says so under _Open questions_ rather than pinning a value here.

**Start with [`design-priorities`](./design-priorities.md).** It holds the brief every design
starts from, the order principles give way in when they conflict, the create and review procedures,
and the reporting format for a review. Every other record is reached from there.

Why this layer exists, and why it holds principles rather than recipes, is
[ADR 0006](../ADR/0006-design-guidelines-live-in-docs-design-as-principles-agents-can-check.md).

## How this differs from the ADRs and the research

| Directory                        | Holds                                                   | Answers                   |
| -------------------------------- | ------------------------------------------------------- | ------------------------- |
| [`docs/research/`](../research/) | what is measurably true, ending in open questions       | what is there?            |
| [`docs/ADR/`](../ADR/)           | structural decisions about the system and its machinery | how is the system built?  |
| `docs/design/`                   | design direction for what is built with the system      | how should a screen look? |

A design record never decides architecture. When a principle can only be carried by changing a
contract's schema, the record raises it as an open question and the decision goes to an ADR.

## Reading a record

- **Status** — `Draft` until the design side has reviewed it, then `Current`.
- **Principles** are numbered `DR1…DRn` and cited as `<record>/DRn` (e.g. `spatial-hierarchy/DR2`),
  so a contract, a review finding or another record can point at one rule.
- **Checks** say how to test each principle on a real design — from code and tokens where
  possible, from a screenshot otherwise. They are written so an agent can run them, not only a
  person squinting at a canvas.
- **In this system** names the contract, token group or gate that carries each principle. "Nothing
  yet" is a legitimate answer and always has an open question behind it.
- **Open questions** (`OQn`) are undecided on purpose: written down rather than guessed.
- **Boundary** names what the record leaves to other owners.

Numbers in these records — a contrast ratio, a line length, a duration — are **review targets**:
starting points that evidence from real use can override, except accessibility minimums. They are
not token values and do not belong in the token source.

## Adding or changing a record

Copy [`_template.md`](./_template.md) to `<kebab-concern>.md`, fill every section, then run
`pnpm design-index`. Split a concern into its own record when it has a different owner or changes
for different reasons.

## The records

> **The table below is generated** by `pnpm design-index` from the records themselves — the title
> from the H1, the concern from `Owns:`, the counts from the `DR` and `OQ` IDs, the status from
> `Status:`. Do not edit it by hand. `pnpm design-index:check` fails the build when it drifts, or
> when a record is missing a required section.

<!-- design-index:start -->

| Record                                      | Owns                                                                                                                                        | Principles | Open questions | Status |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------------- | ------ |
| [Consistency](./consistency.md)             | what makes the product read as one system — repetition, pattern, similarity, unity, and the variety that keeps it from monotony             | 5          | 2              | Draft  |
| [Design priorities](./design-priorities.md) | the brief every design starts from, the order principles yield in when they conflict, and the create and review procedures                  | 8          | 2              | Draft  |
| [Form and layering](./form-and-layering.md) | which layer is in front (figure and ground), how simple a shape can be and still read (closure, Prägnanz), and the minimum size of a target | 5          | 3              | Draft  |
| [Motion](./motion.md)                       | when things animate and how — timing, easing, weight, sequence, grouping in motion, staging, and the reduced-motion fallback                | 9          | 2              | Draft  |
| [Spatial hierarchy](./spatial-hierarchy.md) | grouping through space — white space, proximity, rhythm, common region, continuity and connecting lines                                     | 7          | 2              | Draft  |
| [Typography](./typography.md)               | how text is set to be easy to read and scan — scale, weight, typeface, case, line length, line height, alignment, tracking and pairing      | 9          | 3              | Draft  |
| [Visual hierarchy](./visual-hierarchy.md)   | what a person sees first, second and last — contrast, emphasis, proportion, balance, symmetry and the path of the eye                       | 7          | 2              | Draft  |

<!-- design-index:end -->

## Origin

The principles come from the **Square One principles** reference — foundational composition,
typography, Gestalt and motion principles, each with a procedure and a check. They were split into
one record per concern on the shape of
[Figma OSDS's design records](https://github.com/figma/osds/tree/main/src/docs/design): numbered
principles, a pointer to the contract that carries each one, and open questions instead of guessed
values. The Square One _Check_ lines became each record's **Checks** section, which the OSDS shape
does not have.
