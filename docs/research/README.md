# Research

The **pre-decision** space. `docs/ADR/` is the post-decision space.

A document here reports what is _true_ about a design source, a codebase, or a constraint. It ends
in open questions. It never ends in "we will" — that sentence belongs in an ADR, and moving it
there is `ds-decide`'s job.

**This directory ships empty.** You fill it — there is no skill that produces reports, because
reading a design source is something a person does when they need to look, not a pipeline stage.
See [`../../.figma/README.md`](../../.figma/README.md) for what Figma is and is not, and for the
call sequences that answer each kind of question.

## The rule that makes a report worth trusting

> **Measured and inferred are separate sections. Never merged.**

- _Measured_: "The file has one collection, `weave-ds`, with 23 variables. `space` has four steps:
  0, 1, 3, 5, resolving to 0, 2, 8 and 16."
- _Inferred_: "The numeric gaps suggest the steps are indices into a 2/4/8/16 ramp with two rungs
  unused."

The first is checkable and stays true. The second is a reading, and a reader who cannot tell which
is which will cite the second as if it were the first. Label every inference.

If something could not be measured, **say so** rather than filling the gap with a plausible value.
`.figma/manifest.json` carries a `separatorUnknown: true` flag for exactly this reason: recording
"we have not measured this yet" is more useful than a confident guess, because a guess never gets
revisited.

## Naming

`NNNN-<topic>.md`, numbered in the order written — `0001-figma-token-inventory.md`,
`0002-component-set-audit.md`. The number is chronological, not a priority.

## Shape

```markdown
# <Topic>

- **Date:** YYYY-MM-DD
- **Source:** <Figma file + node, repo path, or URL — specific enough to re-run>
- **Method:** <how it was read: which tool, which nodes, what was NOT covered>

## What is there (measured)

## What it appears to mean (inferred)

## Problems found

## Open questions
```

**"What was NOT covered" is part of the method, not an apology.** A report that silently skipped
half the file reads as a complete audit, and the next person builds on it.

## Problems are findings, not complaints

A problem is worth recording when it would change a decision. Give it evidence:

> `interactive-selectedbg` is a run-on word; every other token in the file is dash-separated.
> One of the two conventions has to lose, and the choice affects every token name we generate.

not

> Some token names are inconsistent.
