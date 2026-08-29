# ADR 0002 — Token source of truth is DTCG JSON in the repo, transcribed from Figma one file per collection

- **Status:** Accepted
- **Date:** 2026-08-29
- **Deciders:** cris
- **Tags:** tokens, figma, packaging
- **Related:** [ADR 0003 — The library stylesheet carries the token layer](./0003-library-stylesheet-carries-the-token-layer.md)

## Context

The design source holds **154 variables across 6 collections**, measured 2026-08-29 through the
Desktop Bridge: Color Primitives (71), Color Tokens (15), Type Primitives (10), Type Tokens (24),
Spacing Tokens (23), Opacity Primitives (11). Until now `packages/tokens/tokens/` held only a
README and the build emitted an empty `:root {}`.

Two constraints decide the shape:

**Figma is not reachable from CI.** The read bridge is an MCP connector driven by a person; the
write bridge needs Figma Desktop plus a plugin open in the target file, and
`.figma/manifest.json` records it as opt-in with no gate. The template's acceptance test is that
`pnpm verify` is green on a fresh clone — on a machine with neither Figma Desktop nor a plugin
installed. Any build step that read Figma would break that outright.

**The collection is the only boundary both surfaces already agree on.** Figma enforces that a
variable belongs to exactly one collection. DTCG has no equivalent — nesting is free-form — so any
other file split has to be invented and then hand-maintained on the Figma side, where nothing
checks it.

`packages/tokens/tokens/README.md` §1 previously suggested a different split (one file per token
_group_: `space.json`, `radius.json`, `border.json`). That guidance predates a measured design
source, and following it would require a mapping from 6 collections to 8 files that no gate can
verify.

## Decision

1. The DTCG JSON under `packages/tokens/tokens/` is **the source of truth for token values**. Figma
   is read by a person; it is never read by a build.
2. **One Figma collection maps to exactly one JSON file.** The map is recorded in
   `.figma/manifest.json → variableCollections` and nowhere else.
3. Transcription is **manual and reviewed**. No script in this repo reads Figma during a build;
   `pnpm verify` touches neither the network nor Figma Desktop.
4. A Figma variable path becomes a DTCG path by **one mechanical rule**: split on `/`, then split
   each segment at a lowercase-to-uppercase boundary and lowercase it. `interactive/selectedBg`
   becomes `interactive.selected-bg`; `UI/Button/size` becomes `ui.button.size`. Numeric steps and
   existing kebab (`2xl`, `500-40`) pass through untouched.
5. **`$type` is decided by the token's group, never inferred from the raw value.** A bare `12` is a
   `dimension` under `font/size/` and a `fontWeight` under `font/weight/`; nothing guesses.
6. **Scale vocabulary: numeric index for a scale picked by amount, t-shirt for a closed set picked
   by intent.** `space.3`, `opacity.600` and `color.purple.500` are indexes; `radius.m` and
   `border.thin` are intents. Two shapes, one rule — not two conventions.
7. **Opacity is stored 0–100 in Figma and 0–1 in DTCG.** Figma's opacity field reads a bound number
   as a percentage, so the design tool needs `60`; CSS needs `0.6`. The conversion happens once, at
   transcription, and each token's `$description` records both.

Corollary that binds future work: a token added in Figma does not exist until it is transcribed
here, and a token deleted in Figma keeps working until it is deleted here. Neither event produces a
signal — see Consequences.

## Contract

| Concern                     | Where                                                               |
| --------------------------- | ------------------------------------------------------------------- |
| Token source                | `packages/tokens/tokens/*.json`                                     |
| Figma collection → file map | `.figma/manifest.json → variableCollections`                        |
| Naming, tiers, file rules   | `packages/tokens/tokens/README.md`                                  |
| Variable → token name rule  | `.figma/manifest.json → identity.variableNaming`                    |
| Build                       | `packages/tokens/style-dictionary.config.mjs` (`pnpm build:tokens`) |
| Enforcement                 | `pnpm verify` (`format:check` → `build`), gated in CI               |

## Consequences

**Positive**

- A fresh clone builds every token with no Figma access, no plugin and no API key.
- Token changes arrive as reviewable JSON diffs in git, with the same history as the code.
- The collection boundary is mechanical, so the file split needs no judgement and cannot drift
  from a rule nobody remembers.
- `$type` by group made the opacity unit mismatch visible at transcription rather than at runtime.

**Negative / trade-offs**

- **Drift is undetected, and this is the serious one.** Nothing compares the JSON against Figma. A
  designer editing a variable produces no failure anywhere — the two surfaces simply disagree, and
  the code keeps building green. This directly contradicts the repo's own rule that a contract
  whose breach produces no build error has to be gated in CI. It is not gated. The 154-token
  name-by-name diff that validated this transcription was run by hand, once, and is not a gate.
- **A token deleted in Figma keeps working in code, forever, and looks correct.** That is the quiet
  failure to watch for.
- Manual transcription does not scale. 154 tokens was tractable; a second theme or a fourth ramp
  makes it a job nobody wants, which is how transcriptions stop happening.
- One-file-per-collection **defers the file layout to Figma's organisation**. A bad collection
  boundary in Figma becomes a bad file boundary here. This has already happened: `spacing.json`
  carries three unrelated groups — `space`, `radius`, `border` — because Figma models them as one
  collection.
- The mechanical name rule faithfully reproduces stutters. `font/fontFamily/primary` becomes
  `--ds-font-font-family-primary`. The fix is a one-variable rename in Figma, not an exception in
  the rule.
- Three primitives still carry baked alpha (`color.purple.500-40`, `color.gray.800-90`) against a
  system that otherwise composes solid colour with an opacity token. They transcribe faithfully and
  are wrong; the `$description` on each says so.

## Alternatives considered

**Read Figma at build time**, via the REST API or the plugin bridge. Rejected: the REST variables
endpoint is Enterprise-only, the plugin bridge needs Figma Desktop running, and either way CI needs
a credential and a network. The fresh-clone promise is the template's acceptance test and this
would end it. It would also make every build non-deterministic against a file a person can edit at
any moment.

**One file per token group** rather than per collection — the split
`packages/tokens/tokens/README.md` §1 originally described. Rejected because it needs a
collection-to-file mapping that is neither 1:1 nor checkable, so the two surfaces would need a
hand-maintained translation table that nothing verifies. Recorded here as a deliberate deviation;
the README has been updated to match rather than left to contradict this record.

**Generate the JSON from Figma with a committed script**, run manually but reproducibly. Genuinely
attractive, and it would make re-transcription cheap enough to do often. Rejected _for now_ only
because the script would still need the opt-in write bridge to run, so it cannot be gated, and an
ungated generator that produces a committed artefact is the exact shape the repo warns about: it
looks automated and is enforced on whichever machine happens to run it. Worth revisiting the moment
drift detection is on the table, since the two problems have the same answer.
