# ADR 0005 — The icon set ships as one `Icon` component over a generated glyph registry, keyed by kebab-case name

- **Status:** Accepted
- **Date:** 2026-08-29
- **Deciders:** cris
- **Tags:** components, packaging, figma, a11y
- **Related:** [ADR 0004 — Icon artwork is monochrome, and colour is chosen where the icon is placed](./0004-icon-artwork-is-monochrome-and-colour-is-chosen-at-placement.md), [ADR 0002 — Token source of truth is DTCG JSON in the repo, transcribed from Figma one file per collection](./0002-token-source-of-truth-is-dtcg-json-transcribed-per-figma-collection.md)

## Context

After [ADR 0004](./0004-icon-artwork-is-monochrome-and-colour-is-chosen-at-placement.md) the set is
50 glyphs. Measured in [`docs/research/0001-icon-set-audit.md`](../research/0001-icon-set-audit.md)
and from the committed artwork:

- Every glyph is **24×24, a single `<path>`, no strokes and no groups** — uniformly, 52 of 52 as
  read.
- The whole registry is **54,206 bytes of source, 16,329 bytes gzipped.**
- **Figma models the set as one component set with one property**, `icon=<name>`, across 52 values.
  Not 52 components.

Three constraints bear on the shape:

- **A sprite sheet is ruled out already.** `packages/react/CLAUDE.md` records that a downstream app
  may be an Electron renderer under a CSP with no remote origins. An externally served sprite plus
  `<use href>` is the smallest payload available and cannot be used there.
- **Two naming canons collide.** `.ai/maps/prop-map.md` §2 requires `kebab-case` values.
  `.figma/manifest.json` requires that a Figma variant value "match the component's prop value
  exactly", and the Figma variants — like the Material Symbols names they came from — are
  `snake_case`. Both cannot hold at once.
- **The `size` axis is canonical and pre-existing.** `prop-map.config.json` declares
  `size: xs · s · m · l · xl`, default `m`, "shared with the token ladder (`--ds-space-*`,
  `--ds-font-size-*`)".

## Decision

1. **The library exposes one component, `Icon`, selecting its glyph with a `name` prop.** This
   mirrors the design source one-to-one: one component set, one property, one value per glyph.
2. **Glyph geometry is committed as SVG under `Icon/glyphs/`, one file per glyph, and that
   directory is the source of truth in this repository.** Figma is upstream of it, not the source —
   the same relationship ADR 0002 establishes for token values.
3. **`packages/react/src/components/Icon/glyphs.ts` is generated from that directory and is
   never hand-edited.** `pnpm glyphs`
   regenerates it; `pnpm glyphs:check` asserts byte-equality and runs in `pnpm verify` and in CI.
4. **Glyph names are `kebab-case` in code** — `graphic-eq`, `crop-16-9`, `format-list-bulleted`. The
   value canon wins, with no exception recorded against it. The Figma variants are renamed to match;
   until that is done the exact-match rule in `.figma/manifest.json` is outstanding and is recorded
   there as a known problem.
5. **`Icon` exposes the canonical `size` axis** — `xs · s · m · l · xl`, default `m`, resolving to
   12 / 16 / 20 / 24 / 32 px.
6. **`Icon` is decorative by default**: it is hidden from the accessibility tree and takes no place
   in the focus order. Passing `label` promotes it to an image with that accessible name. There is
   no third mode.

## Contract

| Concern                                 | Where                                                                  |
| --------------------------------------- | ---------------------------------------------------------------------- |
| The committed glyph artwork             | `packages/react/src/components/Icon/glyphs/`                           |
| The registry generator and its rules    | `packages/react/scripts/build-glyphs.mjs`                              |
| The generated registry and `GlyphName`  | `packages/react/src/components/Icon/glyphs.ts`                         |
| What the component is, on any framework | `packages/react/src/components/Icon/Icon.contract.json`                |
| What it becomes in React                | `packages/react/src/components/Icon/Icon.react.json`                   |
| Outstanding Figma-side rename           | `.figma/manifest.json` → `identity.variableNaming.knownProblems`       |
| Enforcement                             | `pnpm glyphs:check` and `pnpm verify:contract` (`pnpm verify`, and CI) |

## Consequences

**Positive**

- The call site reads the way the Figma property reads: `<Icon name="play" />` against `icon=play`.
  A designer and an engineer looking at the same glyph say the same word.
- A `name` computed at runtime works — `<Icon name={recording ? 'stop' : 'play'} />` — which the
  per-icon-component shape cannot do without a lookup table the consumer writes themselves.
- Adding a glyph is dropping an SVG into a folder and running one command. Nothing else changes.
- No network fetch and no injected sprite, so the CSP constraint is satisfied by construction rather
  than by care.
- The generator is a real gate, so the monochrome rule, the single canvas and the naming convention
  cannot decay into documentation.

**Negative / trade-offs**

- **Every consumer ships all 50 glyphs — 16,329 bytes gzipped — even if it uses one.** This is not a
  tuning problem, it is structural: `name` is a runtime value, so no bundler can prove which paths
  are unreachable. If a consumer's budget cannot absorb that, the fix is an additional export shape,
  not an adjustment to this one.
- **52 Figma variants now need renaming, and nothing will chase it.** Until then the two surfaces
  disagree about every glyph name. Per the manifest's own `_gatedNote`, no gate exercises the Figma
  bridge at all, so this drift produces no failure anywhere — it is tracked only by the note this
  ADR adds.
- **The size ladder crosses two token families.** 12, 16, 24 and 32 are `--ds-space-4/5/6/7`, but
  there is no 20 px step — the spacing ladder jumps 16 → 24 — so `size="m"` resolves through
  `--ds-font-size-xl`. That is a gap in the spacing ladder showing through this component, and it
  will read as an inconsistency to the next person in the stylesheet.
- **`size` promises an evenness the artwork cannot deliver.** Optical fill across the set ranges
  from 42% to 92% of the canvas, so `close-small` and `crop` at the same `size` differ visibly in
  weight. No code change fixes this; it is a property of the drawings.
- **How it fails quietly:** an unknown `name` renders nothing at all — no error, no fallback glyph,
  just an empty box holding its space. TypeScript catches a bad literal, but a name that arrives as
  a plain `string` at runtime is unchecked, and the failure looks like a layout bug rather than a
  missing asset.

## Alternatives considered

**Fifty separately importable components (`<PlayIcon />`).** Tree-shakes perfectly, which directly
addresses the one real cost above. Rejected because it gives up a dynamic `name`, and because it
stops mirroring the single component set that both the design source and the picker UI are built
around — the set is browsed and chosen by name in both places.

**An SVG sprite sheet with `<use href="#play">`.** The smallest payload of the three and the only one
that shares glyph data across every instance. Ruled out by the CSP and no-remote-origins constraint
already recorded in `packages/react/CLAUDE.md`; inlining the sprite to work around that reintroduces
the whole payload plus a DOM injection step.

**`snake_case` names in code.** Keeps the join to both Figma and the upstream Material Symbols names
exact, needs no renaming anywhere, and costs one recorded exception in `prop-map.config.json`.
Rejected in favour of a value canon with no exceptions: an exception is permanent and applies
everywhere afterwards, whereas the Figma rename is one-time work.
