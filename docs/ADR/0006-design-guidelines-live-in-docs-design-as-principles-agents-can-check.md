# ADR 0006 — Design guidelines live in `docs/design` as principles an agent can check, not recipes it copies

- **Status:** Draft
- **Date:** 2026-11-06
- **Deciders:** cris
- **Tags:** governance, design, agents
- **Related:** [ADR 0001 — Every layer is self-describing](./0001-every-layer-is-self-describing.md)

## Context

Agents in this repository already have somewhere to learn **what** a component is and **how** it is
built, and nowhere to learn **how a screen built with it should look**.

- A component contract carries behaviour and structure, not appearance. The top-level keys across
  the fifteen contracts in `packages/contracts/components/` are `intent`, `axes`, `states`,
  `semantics`, `a11y`, `composition`, `anatomy` and, for some, `collection`, `member`, `form`,
  `range` or `dismisses`. None says how to rank content, group it, set text or time motion. Paints
  are declared with their source left unbound ([ADR 0003](./0003-paints-name-the-channel-and-leave-the-source-unbound.md)),
  and `packages/tokens/tokens/` holds only its README — there are no values to read guidance from.
- The few appearance intents that do exist are scattered through contract prose: Button's
  `hierarchy` axis says a page holds one primary action; Switch's thumb carries state for anyone who
  cannot rely on colour; AccordionItem's indicator rotates so the change reads as one object
  moving. Nothing collects them, and nothing says what applies **between** components, which is
  where composition happens.
- The skills (`ds-component`, `ds-figma-component`, `ds-figma-document`) are procedures for
  producing one artifact. A rule placed in one is reached only when that procedure runs.
- `AGENTS.md` is loaded at the start of every session. Its first rule is that context is pulled on
  demand ([ADR 0001](./0001-every-layer-is-self-describing.md)), so it routes to detail rather than
  holding it.

The forcing problem is that an agent composing or reviewing a screen has, today, only its general
training to judge with. Two ways to give it more pull in opposite directions:

- **Recipes and worked examples** — "a settings page is a title, then sections, then a footer with
  the actions right-aligned" — produce consistent output, and output that converges on the recipe.
- **Principles** — "one focal point per view", "the space inside a group is clearly smaller than
  the space between groups" — leave the composition to the agent and constrain only what is named.
  Output varies more, and is only as good as the agent's application of the principle.

**Assumption, not yet measured:** principles written with an explicit check per principle improve
an agent's design judgment — the quality of its composition and of its self-review — more than
recipes would, without making every screen look alike. Nothing in this repository has tested that.
This record is Draft until it has been tested; see Consequences.

## Decision

1. **Design direction is its own documentation layer: `docs/design/`.** Guidance on how screens and
   components built with this system should look and behave lives there, one record per concern.
   It does not live in the ADRs, in component contracts, in skills, or in `AGENTS.md`. Those
   **point** to it.
2. **A record states principles, not recipes.** Each principle is numbered (`DRn`) so it can be
   cited as `<record>/DRn`. A record does not prescribe a layout, and does not restate a token
   value, a prop union or a pixel size: it names the contract or token group that carries the
   principle and links it.
3. **Every principle has a check.** A principle an agent cannot test a design against is not
   finished. The check is written so it can be run from code, tokens or a screenshot, not only by a
   person looking at a canvas.
4. **What is named is constrained; what is not named is left to judgment.** Adding a principle is
   a deliberate choice to reduce variety in that concern. Where consistency matters more than
   variety, the record names the rule; where it does not, the record stays silent on purpose, and
   that silence is not a gap to fill.
5. **A rule comes from a finding.** A new principle is added in response to observed output — a
   review that found a real problem — not in anticipation of one. The finding is the evidence for
   the rule.
6. **A gap is an open question, never a guessed value.** Where a principle needs a mapping that no
   contract or token carries yet, the record says so as `OQn`.
7. **A design record never decides architecture.** When carrying a principle needs a schema or
   contract change, the record raises it as an open question and the decision is made in an ADR.
8. **A record becomes Current only after it has been tested** against agent output and reviewed by
   a person. Until then it is Draft. An agent's review of its own output does not count as that
   test.

## Contract

| Concern                                         | Where                                                                                     |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------- |
| The records, the reading guide and the index    | `docs/design/README.md`                                                                   |
| Shape of a record, with every required section  | `docs/design/_template.md`                                                                |
| Entry point — brief, conflict order, procedures | `docs/design/design-priorities.md`                                                        |
| Index generation and record shape               | `scripts/design-index.mjs` (`pnpm design-index` / `pnpm design-index:check`, gated in CI) |
| Links from records to contracts resolve         | `scripts/verify-docs.mjs` (`pnpm verify:docs`, gated in CI)                               |
| Routing agents to the layer                     | `AGENTS.md` — the directory map and the "Read it when" table                              |

## Consequences

**Positive**

- An agent composing or reviewing a screen has one place to pull design judgment from, reached
  only when the task needs it, without loading it into every session.
- Because every principle carries a check, a review can be written as findings against cited rules
  (`spatial-hierarchy/DR1`) rather than impressions, and those findings can feed back into new
  principles (Decision 5).
- The open questions in the records collect, in one place, the work the token set and the contract
  schema still owe: a spacing scale, a type scale, motion tokens, a dialog backdrop, a target size.

**Negative / trade-offs**

- **Cost.** Seven records to keep true as contracts change. A contract that renames an axis or
  drops a part leaves the record's "In this system" row describing something that is no longer
  there.
- **Forecloses.** Shipping layout recipes or page templates in `docs/design/`. If a product needs
  that level of consistency for a screen type, it has to be decided in an ADR as an exception, or
  built as a component — not slipped in as a record.
- **Less uniform output.** Principles produce more varied compositions than recipes. Two agents
  given the same brief will not produce the same screen, and that is by design (Decision 4) — but it
  means consistency between screens rests on the principles that are named, and on review.
- **Fails quietly, three ways.**
  - `verify:docs` proves a record's link resolves, not that the contract still says what the
    record claims. A stale "carried by" row passes every gate.
  - An agent reads a record as the whole truth and stops looking. A concern the records are silent
    on can then be treated as "anything goes" when the silence was an oversight, not a choice.
  - An agent running the checks on its own work can report every principle met while a person sees
    a broken screen — near-invisible text, a value rendered wildly out of range. Self-review is not
    evidence (Decision 8), and nothing mechanical enforces that.
- **Untested.** The assumption in Context — that this improves judgment — is unproven. If testing
  shows recipes outperform principles for this system, Decision 2 is the one to revisit.

## Alternatives considered

**Recipes and worked examples** — more consistent output with less dependence on the agent's
judgment. Not chosen as the default because the goal is to improve judgment, and a recipe replaces
judgment rather than informing it. A recipe remains available where Decision 4 says consistency
matters more than variety.

**Put the guidance in `AGENTS.md`** — every agent would see it. Rejected because it would load
roughly seven records' worth of design guidance into every session, including sessions that never
touch a screen, against ADR 0001.

**Put it in the skills** — the Figma and component skills would apply it as they run. Rejected
because a rule in a skill reaches only the tasks that run that skill; a review of a screen built by
hand would never see it. Skills should point to the records instead; none does yet.

**Put it in the component contracts** — each contract would carry its own appearance rules.
Rejected because contracts are agnostic and per-component, while most of these principles —
grouping, hierarchy, rhythm — apply between components, where no single contract owns them.
