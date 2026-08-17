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

## The bridge: the official Figma MCP

Read-only, through the **official Figma MCP connector**. No local install, no daemon, no plugin,
no Figma Desktop.

That choice is about the work, not the tooling: **everything in the arc this repo is built for —
explore, report, decide, build — is a read.** The two more capable bridges (a `figma-cli` daemon
on a local port, or a console MCP driving a Desktop plugin) each add an install and a background
process that can fail, in exchange for a write capability the read-only arc never uses.

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
- **A null is a finding.** `code: null`, `componentKey: null`, `separatorUnknown: true` — these
  say "not measured yet", and that is more useful than a confident guess, because a guess never
  gets revisited.

## If you want the reverse direction

Generating Figma component sets _from_ code is a real and useful workflow, and it is deliberately
**not wired here**. It needs a write bridge — a local CLI daemon or a Desktop plugin — which is a
separate setup with its own failure modes, and it only becomes worth it once components exist and
have stabilised.

When that time comes: keep this manifest as the anchor, add a `maps/` entry per generated
component, and make every mutating script **dry-run by default** with an explicit `--apply`.
