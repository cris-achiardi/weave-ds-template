# `.figma/`

How this repo reads its design source, and what it has recorded so far.

**Build isolation.** `.figma/` is development-time tooling only: it sits at the repo root outside
every workspace package, no package source imports from it, and no build target — pnpm, Vite or
Style Dictionary — reads it. Nothing here can break a build.

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
| **read**  | The official Figma MCP connector            | nothing — no install, no daemon, no plugin                     | `ds-explore`                                  |
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
`ds-explore` runs the sequence.

| Tool                 | Use it for                                                                                                                                |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `get_metadata`       | The structure — node ids, names, types. Start here; do not guess node ids.                                                                |
| `get_variable_defs`  | The variables **bound to a given node**. Note: it answers per-node, not per-file, so a full inventory means walking representative nodes. |
| `get_design_context` | One node as reference code + a screenshot.                                                                                                |
| `get_screenshot`     | A visual check. Never a substitute for measuring.                                                                                         |

**Measure, never eyeball.** A screenshot cannot tell you a padding value or a bound variable. A
proposal built on guessed numbers is worse than no proposal, because it looks specific.

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
