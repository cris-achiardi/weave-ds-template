---
name: ds-decide
description: Turn a research report in docs/research/ into one or more Architecture Decision Records in docs/ADR/. Use when asked to "write the ADR", "record this decision", "decide the token architecture", "turn the report into decisions", or once a report in docs/research/ has open questions in it. Writes records and updates the index; never writes code.
---

# ds-decide

Convert an open question into a decision somebody can comply with or violate.

## Before you start

| When                                         | Read                                                                                       |
| -------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **Always, first**                            | `docs/ADR/README.md` — the status ladder, the pre-v0 policy, the decision-vs-contract rule |
| Writing the file                             | `docs/ADR/0000-template.md` — the shape, and the rules inline as comments                  |
| Deciding what goes in the record vs the code | `references/decision-vs-contract.md`                                                       |
| Choosing a status                            | `references/status-ladder.md`                                                              |

**Refuse to invent the evidence.** Every factual claim in a Context section traces to a line in a
research document, or to something you can point at in the repo. If it traces to neither, label it
an assumption in the text. An ADR whose context is confident and unsourced is the most expensive
kind of document to be wrong.

## One decision per record

If the draft contains two "we will" sentences that could be argued separately, it is two ADRs.

The test is not length, it is **independence**: could a reasonable person accept one and reject the
other? "Tokens are DTCG" and "tokens live in their own package" are two decisions. "Tokens are
DTCG" and "we compile them with Style Dictionary" is one, because the second follows.

## The four things that make an ADR worth keeping

**1. Context is evidence, not narrative.**
Prefer a measured number to an adjective, and say where it came from.

> The manifest is 1.79 MB, so reading it to answer a question about one component is not viable
> inside a context window.

not

> The manifest is quite large and can be unwieldy.

**2. The Decision is a numbered list of things you could violate.**
Present tense. Each item is a rule, not an aspiration. If a rule has a corollary that binds future
work, write it down — an implied corollary is one nobody follows.

**3. The `## Contract` table, not inlined specifics.**
The record says _what was decided_; the schema, script or generated file that realizes it lives
with the code and is **linked**. This is the single rule that lets an Accepted decision stay stable
while its implementation moves. See `references/decision-vs-contract.md` for where the line falls.

**4. Consequences must include real negatives.**
An ADR with only positives was not a decision, it was an announcement. Name three things
specifically:

- what this **costs**, in work or in flexibility
- what it **forecloses**
- how it will fail **quietly** — because that is the failure nobody catches

If you cannot find a negative, you have not understood the decision well enough to record it.

## Status

Start at **Draft**. Promote to **Accepted** only when the decision is _already mechanized in code_
— that is the bar `docs/ADR/README.md` sets, and it is what keeps the folder from filling with
confident fiction. A decision nobody has implemented is a Draft, however sure you are.

Before v0, records are edited in place. After v0, an Accepted record is immutable and you supersede
it with a new one.

## Finish the job

An ADR is not done until:

1. It is numbered sequentially and named `NNNN-kebab-title.md`.
2. **A row is added to the index table in `docs/ADR/README.md`.** An ADR not in the index does not
   exist — nobody browses a directory listing.
3. `Related:` links point both ways where a relationship exists. If this supersedes another, the
   old record's status changes to `Superseded by NNNN` in the same change.

## Title rule

The reader learns the _decision_ from the title, not the topic.

- good — "Tokens and page paint are separate stylesheet entry points"
- bad — "Stylesheet architecture"
