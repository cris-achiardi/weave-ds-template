# Architecture Decision Records (ADRs)

Each ADR captures one architecturally significant decision: its context, the decision, and its
consequences. ADRs are immutable once **Accepted** — to change a decision, supersede it with a new
ADR rather than editing the old one.

**An ADR records the decision and stays agnostic; it does not restate the specifics that realize
it.** Those specifics — schemas, scripts, generated files, code snippets, or reference docs — are
the decision's **contracts**, and they live with the code they govern. An ADR _links_ its
contracts in a `## Contract` table; it does not inline them. The shape is in
[`0000-template.md`](./0000-template.md). This is deliberate: contracts evolve with the
implementation, so keeping them out of the record is what lets an Accepted ADR stay stable instead
of being rewritten every time the details move.

**Statuses:** `Draft` → `Proposed` → `Accepted` → (`Superseded by NNNN` | `Deprecated`)

**Pre-v0 status policy.** Until the first release there is nothing downstream to protect, so the
immutability rule above is not yet in force — ADRs are edited in place and most stay **Draft**,
because decisions can still move. Only foundational decisions **already mechanized in code** are
**Accepted**. At v0 the Accepted-is-immutable / supersede-don't-edit discipline switches on for
good.

That bar is worth stating plainly, because it is the one that keeps this folder honest: _a
decision nobody has implemented is a Draft, however confident it sounds._

## The records

**This directory ships empty**, like `docs/research/`, `.ai/maps/proposals/` and
`packages/react/src/components/`. That is the same design decision as everywhere else in this
template: you get the machinery, not somebody else's conclusions.

It is worth being explicit about why, because an ADR folder is exactly the place where inherited
decisions do the most damage. A record you did not make, about a system you have not built yet,
still reads as binding — and the first thing it binds is the reasoning you were about to do
yourself. Worse, a template's own construction decisions are not architecture decisions for the
system you are about to build with it.

Where the template has already settled something mechanically, it is documented **next to the code
that enforces it**, not here:

| What                                                  | Where                                     |
| ----------------------------------------------------- | ----------------------------------------- |
| What a component contract may contain, and why        | `contracts/README.md`                     |
| How to author a component, and the gates it must pass | `packages/react/src/components/README.md` |
| Token naming and tiers                                | `packages/tokens/tokens/README.md`        |
| What Figma is, and what it is not                     | `.figma/README.md`                        |

| #   | Title            | Status |
| --- | ---------------- | ------ |
| —   | _no records yet_ | —      |

## Adding an ADR

1. Copy [`0000-template.md`](./0000-template.md); number it sequentially (`NNNN-kebab-title.md`).
2. Start at **Draft**; promote as the decision firms up and lands in code.
3. **Add a row to the table above.** An ADR that is not in the index does not exist — nobody
   browses a directory listing.

The `ds-decide` skill does all three, and will refuse to bundle two separable decisions into one
record.

## What belongs here, and what does not

|                                                        | Goes in          | Why                                                                     |
| ------------------------------------------------------ | ---------------- | ----------------------------------------------------------------------- |
| "We will namespace every custom property"              | `docs/ADR/`      | A decision. Changing it later has consequences worth tracing.           |
| "The Figma file has 41 variables across 3 collections" | `docs/research/` | A measurement. It has no consequences; it is evidence _for_ a decision. |
| The JSON Schema that enforces the decision             | next to the code | A contract. It moves with the implementation.                           |

`docs/research/` is the **pre-decision** space and `docs/ADR/` is the **post-decision** space. A
research document ends in open questions; an ADR answers one of them.

## Writing one that is worth reading

- **One decision per record.** If the draft contains two "we will" sentences that could be argued
  separately, it is two ADRs.
- **Context is evidence, not narrative.** Prefer a measured number to an adjective. "The manifest
  is 1.79 MB, so reading it to answer a question about one component is not viable in a context
  window" is context; "the manifest is quite large" is not.
- **Consequences must include real negatives.** An ADR with only positives was not a decision, it
  was an announcement. Name what this costs, what it forecloses, and what will go wrong quietly.
- **Alternatives considered** are only worth writing where someone would genuinely have chosen
  differently. Do not pad.
