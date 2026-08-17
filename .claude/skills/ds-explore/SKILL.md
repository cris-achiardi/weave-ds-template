---
name: ds-explore
description: Explore a Figma design source and turn what is actually there into a written record — a research report in docs/research/ and per-component prop proposals in .ai/maps/proposals/. Use when asked to "explore the Figma file", "audit the design source", "what tokens does this file have", "inventory the components", "map the design system", or at the start of a design-system project when handed a Figma file key or URL. Read-only — it writes documents, never components and never Figma.
---

# ds-explore

Turn a design source into evidence someone can decide from.

## What you produce, and what you must not

| Produce                                  | Never produce                |
| ---------------------------------------- | ---------------------------- |
| `docs/research/NNNN-<topic>.md`          | anything under `packages/`   |
| `.ai/maps/proposals/<Component>.md`      | an ADR — that is `ds-decide` |
| entries in `.figma/maps/tokens.json`     | a component                  |
| resolved flags in `.figma/manifest.json` | a change in Figma            |

**A research document is not a decision.** It ends in open questions and never in "we will". If you
find yourself writing a recommendation, you have found an ADR — record it as an open question with
the evidence attached, and stop.

## Read these when you are in their territory

Per the repo's first rule, pull context on demand rather than all at once.

| When                                     | Read                                                                       |
| ---------------------------------------- | -------------------------------------------------------------------------- |
| **Always, first**                        | `.figma/manifest.json` — the file key, the naming rule, the known problems |
| Before writing any report                | `docs/research/README.md` — the measured/inferred rule and the shape       |
| Before writing any proposal              | `.ai/maps/proposals/README.md` and `.ai/maps/prop-map.md` §1–2             |
| Turning variables into tokens            | `packages/tokens/tokens/README.md`                                         |
| Unsure which MCP call answers a question | `references/figma-mcp-recipes.md`                                          |
| Naming a token                           | `references/variable-to-token.md`                                          |

**Never hard-code a Figma file key.** Read it from the manifest. If the user names a different
file, update the manifest first — that is the edit, not a literal in your call.

## The four passes

Do them in order and keep them as separate sections. Each pass is cheap to redo and expensive to
half-do.

1. **Structure** — `get_metadata` with no node id lists the pages; then per page. Produce the map
   of what exists before looking closely at anything.
2. **Variables** — `get_variable_defs` answers **per node**, not per file. A full inventory means
   walking representative nodes from each section and unioning the results. Say which nodes you
   walked; that is what makes the coverage claim checkable.
3. **Styles and type** — text styles, effects. Record the composite values, and record where they
   disagree with each other.
4. **Components** — component sets, their variant properties, and the screens that consume them.

## The rules that make the output worth trusting

**Measured and inferred are separate sections. Never merged.**
A reader who cannot tell which is which will cite your reading as if it were a measurement.

**Measure, do not eyeball.** `get_screenshot` cannot tell you a padding value or a bound variable.
A number you read off an image is a guess wearing a lab coat.

**Record what you did not cover.** "Pass 2 walked 6 nodes across Main UI and Recording Controls;
the Notes section was not sampled" is part of the method. A report that silently skipped half the
file reads as a complete audit, and the next person builds on it.

**A gap is a finding, not a blank to fill.** If the group separator cannot be determined, leave
`separatorUnknown: true` and say so. A confident guess never gets revisited; a recorded unknown
does.

**Name the things that do not fit.** A design file that maps cleanly onto a canonical vocabulary
has usually been forced to. Real files have leftovers — a component-specific token in the global
namespace, two naming systems in one scale, a style whose line height disagrees with its siblings.
Those leftovers are the most valuable thing in your report, because they are what the decisions
will be about.

## Proposals

One per component set worth building, written **against** `.ai/maps/prop-map.md` §1.

The core move, and the one that earns this skill its keep: **most Figma variant properties are not
props.** Sort every value into one of four buckets — runtime state, author-declared state, content,
or an actual prop — before proposing anything. `.ai/maps/proposals/README.md` has the table and
explains why getting it wrong produces a `state="hover"` prop.

If a design's values fit an existing axis, use that axis's name and values. If they genuinely do
not, say what the new axis is _for_ — a new axis is a change to the canon, and it needs an argument,
not just a slot.

## Finish by saying what is undecided

The last section of every report is **Open questions**, each one phrased so that `ds-decide` could
turn it into a single ADR. If a question is really two questions, split it.
