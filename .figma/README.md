# `.figma/`

How this repo reads its design source, and what it has recorded so far.

**Build isolation.** `.figma/` is development-time tooling only: it sits at the repo root outside
every workspace package, no package source imports from it, and no build target — pnpm, Vite or
Style Dictionary — reads it. Nothing here can break a build.

## What Figma is here

**A canvas to read, not a specification.** The design source is where a designer explores — that is
what it is for, and a decision made without exploring is a guess. But nothing in it binds the code,
and nothing in it is checked. What this system is built from and checked against is the component
contract, its framework binding and the source, read merged (`pnpm contract <Name>`).

Three consequences, and they are most of why this directory exists:

- **Reading Figma is not a pipeline stage.** No skill sweeps the file, because a scheduled sweep
  implies an authority the canvas does not have. You read it when you need reference, and you write
  down what you found — in `docs/research/` if it is evidence, in `.ai/maps/proposals/` if it is a
  component API.
- **Measure, never eyeball.** A screenshot cannot tell you a padding value or a bound variable. A
  number read off an image is a guess wearing a lab coat, and a proposal built on guessed numbers is
  worse than no proposal because it looks specific.
- **A Figma variant property is not a prop.** Most files encode four unrelated kinds of thing in one
  variant axis and only one of them is a prop. The four-way sort lives in
  [`../.ai/maps/proposals/README.md`](../.ai/maps/proposals/README.md) — go there rather than
  re-deriving it.

This is a **different claim** from the one on
[`../docs/documentation/01-what-this-is.md`](../docs/documentation/01-what-this-is.md), _"Figma is an
output, not the source"_, which is about the published component library being generated from code.
Both are true, and they are about opposite ends of the same file: the canvas you **read** is upstream
evidence; the library you **publish** is downstream output. Neither is a specification.

## Where things are documented

This README is the index. Each fact lives in exactly one authoritative place — go there rather
than trusting a restatement.

| You want                                     | Look at                                                                       |
| -------------------------------------------- | ----------------------------------------------------------------------------- |
| Which Figma file, and what is in it          | [`manifest.json`](./manifest.json) → `sources`                                |
| How a Figma variable name becomes a token    | `manifest.json` → `identity.variableNaming`                                   |
| Known problems in the source file            | `manifest.json` → `identity.*.knownProblems`                                  |
| What a map entry may contain                 | [`schema/`](./schema/) — the schemas are the spec                             |
| The variant naming law                       | `.ai/maps/prop-map.md` §1 — **authoritative**; the manifest only points at it |
| How to translate a Figma variant into a prop | `.ai/maps/proposals/README.md`                                                |

## Two bridges — and only one of them is a dependency

The wiring is [`manifest.json`](./manifest.json) → `bridges`, which is authoritative; this table is
the orientation.

| Bridge    | What it is                                  | Needs                                                          | Used by                                       |
| --------- | ------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------- |
| **read**  | The official Figma MCP connector            | nothing — no install, no daemon, no plugin                     | no skill — read it yourself, see below        |
| **write** | figma-console MCP + a Desktop Bridge plugin | Figma Desktop, the plugin open in the file, a local MCP server | `ds-figma-component`, `-document`, `-explain` |

**The read bridge is the only one anything depends on.** Everything in the arc this repo is built
for — explore, report, decide, build — is a read, and it completes with the read bridge alone.

**The write bridge is opt-in and unwired.** No `pnpm` script, no gate and no CI job invokes it, so
`pnpm verify` is green on a machine with neither Figma Desktop nor the plugin installed. That is not
an accident: green on a fresh clone with nothing installed is this template's one acceptance test,
and a bridge that needs a local process running must never sit on that path.

The cost is worth stating plainly: **nothing gates the write side.** A generated Figma set can drift
from its component and no build fails — `maps/components.json` is a record, not a check. That
contradicts the repo's own enforcement rule, and it is accepted only because nothing has been
generated yet. It should not survive contact with a real component library.

The quiet failure to know about: every collection in the source file has **one mode**, so a bound
value and a baked literal render identically. A mis-bound component passes visual review. Read
`boundVariables` back rather than trusting the render.

### Reading the file

There are no scripts here, and that is deliberate: with an MCP bridge the **agent is the script**.
There is no skill either — you run the sequence when you need it. Read the file key from
`manifest.json` → `sources`; never hard-code it.

| Tool                 | Use it for                                                                                                                                |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `get_metadata`       | The structure — node ids, names, types. Start here; do not guess node ids.                                                                |
| `get_variable_defs`  | The variables **bound to a given node**. Note: it answers per-node, not per-file, so a full inventory means walking representative nodes. |
| `get_design_context` | One node as reference code + a screenshot.                                                                                                |
| `get_screenshot`     | A visual check. Never a substitute for measuring.                                                                                         |

#### Structure

```
get_metadata(fileKey)                  -> top-level pages (guid + name)
get_metadata(fileKey, nodeId: "0:1")   -> the tree for that page
```

Returns node ids, layer types, names, positions, sizes. Returns **no style, no bound variable and no
variant property value** — do not infer paint or spacing from it. If the tree is too large the
result is written to a file rather than returned: read the file, or descend into a specific child.
Never re-request it in a loop.

#### Variables — the one to be careful about

```
get_variable_defs(fileKey, nodeId)   -> { "weave-ds-space-3": "8", ... }
```

It returns the variables **bound to that node and its descendants**, not the file's collections.
There is no "list every variable" call on the read bridge. So a full inventory is a **union over
representative nodes**, and its completeness is a claim you have to earn:

1. Pick nodes that between them cover every section — a button, a list row, a panel, a control bar.
2. Call it on each.
3. Union the results.
4. **Write down which nodes you sampled.** That sentence is what makes the coverage claim checkable,
   and it is the difference between an inventory and a guess.

**The names it returns are `codeSyntax.WEB`, not variable names.** This bridge reports
`weave-ds-space-3`; the variable is actually named `space/3`, and the two are separate fields on the
same variable. `manifest.json` → `identity.variableNaming` records both — read it before mapping
anything, or you will map the wrong string.

Composite text styles come back as a `Font(...)` string naming the variables that feed them. Record
the composite _and_ its parts: they can disagree, and the disagreement is a finding.

#### A component set

```
get_design_context(fileKey, nodeId)   -> reference code + screenshot + metadata
get_screenshot(fileKey, nodeId, maxDimension: 1400)
```

`get_design_context` returns code **to adapt, not to paste**. It knows nothing about this repo's
tokens, prop canon or component conventions. Use it to understand structure and to see which
variables are bound where.

#### Variant properties

They are the component set's **child names**:

```
<symbol name="Size=Small, Shape=Circle" .../>
<symbol name="Size=Medium, Shape=Circle" .../>
```

Parse the axis names and values out of those. A set whose children are named `Frame 1`, `Frame 2`
has **no variant properties** — a finding about the file's maturity, worth stating plainly rather
than papering over.

#### Things that will bite

| Symptom                               | What is actually happening                                                        |
| ------------------------------------- | --------------------------------------------------------------------------------- |
| A variable you expected is missing    | It is not bound on the node you asked about. Sample a different node.             |
| Node ids from a previous session fail | They are file-local. Re-run `get_metadata`.                                       |
| Two styles disagree on a value        | Both are real. Record both; the disagreement is the finding.                      |
| A "component" is a plain frame        | Not a component set. It cannot carry variants, and that matters for the proposal. |
| A name has a `weave-ds-` prefix       | That is `codeSyntax.WEB`, not the variable name. See above.                       |

## The maps

| File                                             | What it records                                                 |
| ------------------------------------------------ | --------------------------------------------------------------- |
| [`maps/tokens.json`](./maps/tokens.json)         | Figma variable → DTCG token path. `code: null` means drift.     |
| [`maps/components.json`](./maps/components.json) | Code component → Figma node, plus the variant axes found there. |

Both ship **empty and schema-valid**. `pnpm verify:figma` validates them in CI, so an empty map is
a checked state rather than an unchecked one.

## Conventions

- **Code is canonical.** For token _values_, `packages/tokens` wins and Figma is downstream. A
  difference is drift in Figma, not a change to adopt back into the tokens.
- **Join on stable keys.** `componentKey` for components, `variableKey` (or the code token path)
  for variables — never on node ids, which are file-local and change. The schemas mark which is
  which, and it matters: joining on an ephemeral id produces a map that silently rots.
- **Add an entry when the work is done, not before.** The map's value as a record comes from it
  being empty where the work has not happened. A speculative entry destroys that.
- **A null is a finding.** `code: null`, `componentKey: null` — these say "not measured yet", and
  that is more useful than a confident guess, because a guess never gets revisited. The mechanism
  works: `separatorUnknown` was one of these, it was resolved to `/` by a live read on 2026-08-28,
  and the flag is now `false`. Had it been guessed, nobody would have gone back.
- **Correct a measurement in place, and say that you did.** `identity.variableNaming` and
  `identity.font` both carry a note naming what the previous reading got wrong. A silently corrected
  fact teaches nobody which readings are safe to trust.

## The reverse direction: writing to Figma

Generating Figma content _from_ code runs on the write bridge, through three skills — see
[`.claude/skills/README.md`](../.claude/skills/README.md) for the index and their readiness state.

| Skill                | Produces                                                             |
| -------------------- | -------------------------------------------------------------------- |
| `ds-figma-component` | a component set generated from a component's source and contract     |
| `ds-figma-document`  | the page around a set — description, labelled grid, extension tables |
| `ds-figma-explain`   | explanatory boards: node graphs, spec tables, annotated anatomy      |

Three rules bind every write, and they exist because the failure modes are quiet:

- **Check the file, then lock it.** Compare `figma.fileKey` against `sources.<key>.key` from this
  manifest, then pin the target with `figma_navigate({ url, lock: true })`. The active file drifts
  between open documents; an unpinned write lands wherever the user last clicked.
- **Never type a file key.** It comes from this manifest, which is why pointing the system at a
  different file stays one edit.
- **Record after, never before.** An entry in `maps/components.json` means the work is done.

Two of the three cannot do their full job yet: `ds-figma-component` needs a component to generate
from and a decided token set to bind to, and both skills' strongest check — flipping a mode to prove
a binding is real — has nothing to flip, because every collection in the source file has a single
mode. `ds-figma-explain` is usable today. Each skill states its own gaps at the top rather than
assuming them away.
