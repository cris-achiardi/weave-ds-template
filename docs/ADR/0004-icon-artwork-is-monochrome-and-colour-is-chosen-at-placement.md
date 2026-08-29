# ADR 0004 — Icon artwork is monochrome, and colour is chosen where the icon is placed

- **Status:** Accepted
- **Date:** 2026-08-29
- **Deciders:** cris
- **Tags:** components, figma, tokens, a11y
- **Related:** [ADR 0005 — The icon set ships as one `Icon` component over a generated glyph registry](./0005-icon-set-ships-as-one-component-over-a-generated-glyph-registry.md)

## Context

The consolidated `icon` component set in the design source holds 52 glyphs on a uniform 24×24
canvas. Measured in [`docs/research/0001-icon-set-audit.md`](../research/0001-icon-set-audit.md):

- **42 of 52 export as `white`. Ten carry a literal colour** — `#26E589` on `check_circle`,
  `check_small`, `graphic_eq_active` and `cached`; `#EF1313` on `videocam_off`, `mic_off`,
  `volume_off`, `stop` and `close_small_danger`; `#5146E6` on `premium_crown`. All three values
  match primitives already in the token set (`color.green.300`, `color.red.500`,
  `color.purple.500`).
- **`graphic_eq` and `graphic_eq_active` have byte-identical path data.** They differ only in fill.
- `close_small` and `close_small_danger` differ in geometry by roughly 9% — 10.0 against 9.1 units
  of ink — and in fill. That is not enough difference to be a second drawing.

The design source has already applied the governing principle once, and wrote it down. Its
consolidation notes record that 19 `disabled` variants were dropped because each "was the same
drawing in a different colour … That is a decision for whoever places the icon, not something to
freeze into the artwork." The ten above were missed by that pass.

**The constraint that makes this hard:** the semantic token layer has no role for what these
colours mean. `color.semantic.json` exposes the green and the red only as `control.waveform` and
`control.off`, and both carry a `$description` in their own source saying they are
component-specific and sit in the global namespace by accident. There is no `success` role and no
`danger` role. So the honest options are to keep colour in the artwork, or to remove it and accept
that the system cannot yet _name_ the colour a caller should reach for. The repo's authoring rules
forbid the third option of inventing a role to fill the gap.

## Decision

1. **Glyph artwork in this repository is monochrome.** Every committed glyph paints with
   `fill="currentColor"` and carries no colour of its own.
2. **Colour is a placement decision.** An icon takes its colour from the `color` property in effect
   where it is used — set on the icon, or inherited from an ancestor.
3. **A glyph that exists only to carry a colour is not a glyph.** `graphic_eq_active` and
   `close_small_danger` are therefore not part of the set. The registry holds **50** names.
4. **The stripped colours are not re-encoded on the component.** `Icon` gets no `tone` axis and no
   `variant` axis. Until the semantic layer has roles for success and danger, the colour a caller
   wants is the caller's own `color` declaration, not a value this component offers to pick.
5. **Transcription discards the fill.** Anything importing artwork into `Icon/glyphs/` drops the
   exported fill rather than preserving it. Preserving it would reintroduce rule 1 as a silent
   defect, because a coloured icon renders perfectly well and no other check would notice.

## Contract

| Concern                                    | Where                                                                                |
| ------------------------------------------ | ------------------------------------------------------------------------------------ |
| The 50 glyphs, as committed monochrome SVG | `packages/react/src/components/Icon/glyphs/`                                         |
| The transcription rules, and rule 5        | `packages/react/scripts/build-glyphs.mjs` (header)                                   |
| What the component may paint               | `packages/react/src/components/Icon/Icon.contract.json` (`anatomy.root.parts.glyph`) |
| Enforcement                                | `pnpm glyphs:check` — fails on any fill that is not `currentColor`; gated in CI      |

## Consequences

**Positive**

- One drawing, one glyph. The set loses two names and no artwork.
- Every state treatment an icon needs — disabled, hover, danger, on a coloured surface — becomes a
  CSS declaration at the call site rather than a new asset to draw, name and ship.
- An icon can no longer disagree with a colour decision made elsewhere, because it has no colour to
  disagree with.
- The rule is mechanized rather than remembered: `pnpm glyphs:check` fails on a stray hex, so a
  re-import that preserves fills reddens the build instead of quietly shipping.

**Negative / trade-offs**

- **`check_circle` is no longer green on arrival.** Anywhere a design leaned on the glyph supplying
  its own success colour, that colour must now be supplied by the caller — and nothing warns you
  that it was not. The icon renders; it is simply the wrong colour.
- **The right colour is currently unnameable.** This decision makes the missing `success` and
  `danger` roles visible without fixing them. A caller needing success green today has to reach for
  `--ds-control-waveform`, whose own token description says that is the wrong name for it. That is
  a worse position than a baked hex in one narrow respect: it looks correct.
- **Two names disappear.** Any consumer or Figma instance referring to `graphic_eq_active` or
  `close_small_danger` has to move to `graphic_eq` and `close_small` plus a colour. In code that is
  a type error; in Figma nothing catches it, because no gate exercises the Figma bridge.
- **How it fails quietly:** an icon placed where `color` is not set inherits whatever the cascade
  gives it. On this dark UI that is most likely the browser's near-black default — an invisible
  icon, with no error anywhere. Baked colour could not fail this way.

## Alternatives considered

**Keep the ten baked colours.** Faithful to the file as it stands, and it needs no work. Rejected on
the design source's own argument: ten glyphs would ignore the colour of everything around them, and
a state decision would stay frozen in an asset. It also leaves `graphic_eq_active` as a second name
for a drawing that is byte-identical to `graphic_eq`.

**Add a `tone` axis to `Icon`, mapping to success / danger / brand.** Keeps the colours available
and puts the choice on the component. Rejected because the semantic roles it would map to do not
exist, and the repo forbids inventing a token policy to fill a field. Worth revisiting the moment
`success` and `danger` roles land — at which point this is an additive change, not a reversal.
