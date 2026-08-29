# Icon set audit — the consolidated `icon` component set

- **Date:** 2026-08-29
- **Source:** Figma `weave — Mokkap masterclass` (file key `eUO2kF0A3tJXdVTcvEPQjW`), page `├ Icons`
  (node `2026:774`). Two nodes on that page: the component set `icon` (`2122:3051`, 52 variants) and
  the documentation frame `Icons — the consolidated set` (`2122:3052`).
- **Method:** the read bridge recorded in [`.figma/manifest.json`](../../.figma/manifest.json) —
  the official Figma MCP connector, no plugin and no Desktop.
  `get_metadata` on `2026:774` for the variant inventory and the documentation copy;
  `download_assets` (`defaultFormat: svg`) on the six labelled grid frames — `2122:3127`, `2122:3176`,
  `2122:3253`, `2122:3330`, `2122:3393`, `2122:3456` — which returned 52 SVG assets, one per glyph.
  Geometry was then measured locally from the SVG source: path count, fill values, and the ink
  bounding box derived from the coordinate pairs in each `d` attribute.

  **Not covered.** (a) Whether a fill is _bound to a variable_ or is a literal — an SVG export bakes
  the resolved value either way, so this bridge cannot tell the two apart, and every fill below is
  reported as a resolved value only. (b) The 267 instances of the _original_ pre-consolidation icons
  that the documentation frame says still exist elsewhere in the file; only this page was read.
  (c) Any icon outside this page. (d) The component set's own published key — the file is not
  published as a library (`published: false` in the manifest), so there is no durable `componentKey`
  to record.

## What is there (measured)

### Shape of the set

- **52 variants** in one component set named `icon`, exposed as a single property `icon=<name>`.
- **Every glyph is 24×24**, `viewBox="0 0 24 24"`. No exceptions.
- **Every glyph is exactly one `<path>`** — 52 of 52. No strokes (`stroke=` appears 0 times), no
  `fill-rule` or `clip-rule`, no nested groups beyond a single wrapping `<g id="art">`.
- **Names are `snake_case` throughout**, including numerals: `crop_16_9`, `crop_9_16`.
- The extracted 52 reconcile **exactly** against the 52 variant names read from the component set —
  no missing glyph, no extra, no duplicate name.

### Fills

42 of 52 export as `white`. **Ten carry a literal non-white colour**, and all three of those
colours match a primitive already in
[`color.palette.json`](../../packages/tokens/tokens/color.palette.json):

| Exported fill | Palette primitive  | Glyphs carrying it                                                    |
| ------------- | ------------------ | --------------------------------------------------------------------- |
| `#26E589`     | `color.green.300`  | `check_circle`, `check_small`, `graphic_eq_active`, `cached`          |
| `#EF1313`     | `color.red.500`    | `videocam_off`, `mic_off`, `volume_off`, `stop`, `close_small_danger` |
| `#5146E6`     | `color.purple.500` | `premium_crown`                                                       |

The semantic layer in [`color.semantic.json`](../../packages/tokens/tokens/color.semantic.json)
exposes those primitives under exactly two roles — `control.off` (`color.red.500`) and
`control.waveform` (`color.green.300`) — and `brand.primary` (`color.purple.500`). **There is no
`success` role, no `danger` role, and no `icon` role in the semantic layer.** Both `control.*`
entries carry a `$description` in the token source stating that they are component-specific and sit
in the global namespace by accident rather than by design.

### Optical size

Longest ink edge as a percentage of the 24px canvas, across all 52:

| Range        | Count |
| ------------ | ----: |
| under 50%    |     6 |
| 50–69%       |    10 |
| 70–79%       |    15 |
| 80% and over |    21 |

Minimum 38% (`close_small_danger`, 9.1×9.1), maximum 92% (`crop` and `mobile`, 22×22), median 75–79%.
**The extremes differ by a factor of 2.4.**

### Two collisions in the artwork

- `graphic_eq` and `graphic_eq_active` have **byte-identical path data**. They differ only in fill
  (`white` vs `#26E589`).
- `close`, `close_small` and `close_small_danger` are three X glyphs at three optical sizes —
  13.1, 10.0 and 9.1 units of ink respectively. `close_small` and `close_small_danger` differ in
  geometry by roughly 9% as well as in fill.

### Two hazards in the extraction path

- **`download_assets` does not return assets in canvas order.** Measured on the 6-glyph `RECORDING`
  grid: canvas order is `pause, play, stop, cached, picture_in_picture, dvr`; the returned order was
  `pause, cached, play, picture_in_picture, stop, dvr`. Identity is recoverable **only** from the
  `id` attribute on the inner `<path>`, which carries the Figma layer name.
- **Two layer names disagree with their variant names:** the layer inside variant `play` is named
  `play_arrow`, and the layer inside `premium_crown` is named `crown`.

### Full inventory

Grouped as the documentation frame groups them.

| Glyph                   | Optical fill | Exported fill | Palette match      |
| ----------------------- | -----------: | ------------- | ------------------ |
| **MEDIA & CAPTURE**     |              |               |                    |
| `videocam`              |          83% | `white`       | `color.base.white` |
| `videocam_off`          |          87% | `#EF1313`     | `color.red.500`    |
| `mic`                   |          66% | `white`       | `color.base.white` |
| `mic_off`               |          79% | `#EF1313`     | `color.red.500`    |
| `desktop_mac`           |          83% | `white`       | `color.base.white` |
| `mobile`                |          92% | `white`       | `color.base.white` |
| `volume_up`             |          75% | `white`       | `color.base.white` |
| `volume_off`            |          80% | `#EF1313`     | `color.red.500`    |
| `graphic_eq`            |          83% | `white`       | `color.base.white` |
| `graphic_eq_active`     |          83% | `#26E589`     | `color.green.300`  |
| **RECORDING**           |              |               |                    |
| `pause`                 |          54% | `white`       | `color.base.white` |
| `play`                  |          51% | `white`       | `color.base.white` |
| `stop`                  |          50% | `#EF1313`     | `color.red.500`    |
| `cached`                |          88% | `#26E589`     | `color.green.300`  |
| `picture_in_picture`    |          83% | `white`       | `color.base.white` |
| `dvr`                   |          83% | `white`       | `color.base.white` |
| **CROP & SCENE**        |              |               |                    |
| `crop`                  |          92% | `white`       | `color.base.white` |
| `crop_landscape`        |          83% | `white`       | `color.base.white` |
| `crop_16_9`             |          75% | `white`       | `color.base.white` |
| `crop_square`           |          75% | `white`       | `color.base.white` |
| `crop_portrait`         |          83% | `white`       | `color.base.white` |
| `crop_9_16`             |          75% | `white`       | `color.base.white` |
| `split_scene_up`        |          79% | `white`       | `color.base.white` |
| `split_scene_down`      |          79% | `white`       | `color.base.white` |
| `split_scene_left`      |          79% | `white`       | `color.base.white` |
| `split_scene_right`     |          79% | `white`       | `color.base.white` |
| **TEXT & CONTENT**      |              |               |                    |
| `format_bold`           |          58% | `white`       | `color.base.white` |
| `format_italic`         |          58% | `white`       | `color.base.white` |
| `format_underlined`     |          75% | `white`       | `color.base.white` |
| `format_align_left`     |          75% | `white`       | `color.base.white` |
| `format_align_center`   |          75% | `white`       | `color.base.white` |
| `format_align_right`    |          75% | `white`       | `color.base.white` |
| `text_increase`         |          86% | `white`       | `color.base.white` |
| `text_decrease`         |          86% | `white`       | `color.base.white` |
| `format_list_bulleted`  |          71% | `white`       | `color.base.white` |
| `article`               |          75% | `white`       | `color.base.white` |
| **NAVIGATION & CHROME** |              |               |                    |
| `keyboard_arrow_up`     |          46% | `white`       | `color.base.white` |
| `keyboard_arrow_down`   |          46% | `white`       | `color.base.white` |
| `chevron_backward`      |          46% | `white`       | `color.base.white` |
| `more_horiz`            |          67% | `white`       | `color.base.white` |
| `close`                 |          55% | `white`       | `color.base.white` |
| `close_small`           |          42% | `white`       | `color.base.white` |
| `close_small_danger`    |          38% | `#EF1313`     | `color.red.500`    |
| `drag_indicator`        |          67% | `white`       | `color.base.white` |
| **STATUS & SYSTEM**     |              |               |                    |
| `check_small`           |          46% | `#26E589`     | `color.green.300`  |
| `check_circle`          |          83% | `#26E589`     | `color.green.300`  |
| `info`                  |          83% | `white`       | `color.base.white` |
| `help`                  |          83% | `white`       | `color.base.white` |
| `settings`              |          83% | `white`       | `color.base.white` |
| `notifications`         |          83% | `white`       | `color.base.white` |
| `download`              |          67% | `white`       | `color.base.white` |
| `premium_crown`         |          83% | `#5146E6`     | `color.purple.500` |

## What it appears to mean (inferred)

Every statement in this section is a reading, not a measurement.

1. **The ten coloured glyphs look like frozen _state_, not glyph identity.** The red on
   `videocam_off`, `mic_off` and `volume_off` matches `control.off`, whose own `$description` in the
   token source says it "belongs to the mic and camera off state". The reading is that these were
   coloured at the moment they were drawn, because the source UI only ever showed them in one state.
2. **`graphic_eq_active` is a colour decision frozen into artwork.** Identical geometry plus a green
   fill is the same shape in the "recording" state. This is the same class of thing the
   documentation frame says was removed when 19 `disabled` variants were dropped — that note argues
   a recolour "is a decision for whoever places the icon, not something to freeze into the artwork".
   By its own argument, this pair was missed.
3. **`close` and `close_small` read as one X at two optical sizes rather than two glyphs.** What
   separates them is scale, and scale is what a `size` prop is for.
4. **Canvas size was normalised; optical size was not.** The documentation frame states each glyph
   was "scaled by the ratio of its native size so they all read at the same weight". Scaling by
   native ratio _preserves_ relative optical size — it does not equalise it — which is consistent
   with the 38–92% spread measured above.
5. **The set is a Material Symbols subset.** Names (`graphic_eq`, `format_list_bulleted`,
   `keyboard_arrow_down`, `more_horiz`), the 24px canvas and the single-path geometry all match
   Material's export conventions, and the documentation frame refers to "the Material Symbols
   export" directly.

## Problems found

1. **Ten glyphs cannot take their colour from where they are placed.** A component that renders the
   set with `fill="currentColor"` silently discards the green on `check_circle` and the red on
   `mic_off`. A component that preserves the exported fills produces ten glyphs that ignore the
   colour of the text around them. There is no third option that leaves the artwork untouched, so
   this has to be decided before the component is built rather than discovered after.
2. **`close_small` and `close_small_danger` become the same icon the moment colour is inherited.**
   Their geometry differs by 9%, which is not enough to be a different glyph. If colour moves to the
   call site, the set has 51 distinguishable glyphs, not 52 — and one of them is named after a
   colour that is no longer part of it.
3. **The system has no colour role for what these icons mean.** `check_circle` is a success mark and
   `close_small_danger` is a destructive one, but the semantic layer offers only `control.off` and
   `control.waveform`, both flagged in their own token source as component-specific leakage. Writing
   a token policy for this component today means pointing at a role that is documented as wrong, or
   inventing one. The repo's authoring rules forbid the second.
4. **`close_small_danger` is not a real name and the designer has said so.** The documentation frame
   states: "the red one is provisionally called `close_small_danger`. That name is mine, not yours —
   it needs a real one."
5. **A 2.4× optical spread means `size` will not behave.** Rendered at the same box, `close_small`
   (38–42% ink) and `crop` (92% ink) differ enough in weight that a single `size` scale cannot make
   a row of icons look even. This is a property of the artwork, not of any code that renders it.
6. **Nothing joins the code to the Figma set, and nothing will notice when they drift.**
   `.figma/maps/components.json` is empty, the source file is unpublished so there is no durable
   `componentKey`, and — per the manifest's own `_gatedNote` — no gate exercises the Figma bridge at
   all. A glyph added, renamed or redrawn in Figma produces no failure anywhere.
7. **Regenerating the SVGs is order-dependent and the order is wrong.** Anyone repeating the
   extraction by trusting `download_assets`' array order will mislabel the majority of the set; this
   audit's first pass did exactly that, and it was caught only because the inner `<path>` carries a
   layer name. Two of those layer names disagree with their variant name as well.
8. **Figma's `snake_case` values and the repo's value canon disagree.**
   [`prop-map.md`](../../.ai/maps/prop-map.md) §2 requires `kebab-case` values, while
   `.figma/manifest.json` requires that "a Figma variant property value must match the component's
   prop value exactly". Both cannot hold: either the prop takes `graphic_eq` and breaks the value
   canon, or it takes `graphic-eq` and breaks the exact-match rule.

## Open questions

Each of these is a decision, not a measurement, and each blocks part of the build.

1. **How do 52 glyphs reach a consumer?** One module carrying all 52 paths behind a `name` prop
   ships every glyph to every app that imports one. Fifty-two separately importable components
   tree-shake but give up a dynamic `name`. The consumer constraint already recorded in
   [`packages/react/CLAUDE.md`](../../packages/react/CLAUDE.md) — an Electron renderer under a CSP
   with no remote origins — rules out an externally served sprite sheet, but not the other three.
2. **Do the ten coloured glyphs keep their colour?** See problem 1; this decides whether the
   component is monochrome by contract.
3. **If colour moves to the call site, do `graphic_eq_active` and `close_small_danger` survive as
   names?** Both exist only to carry a colour. Dropping them takes the set to 50.
4. **Does the system get `success` and `danger` colour roles?** Problem 3 has no correct answer
   until it does, and the answer affects far more than icons.
5. **Which case wins for glyph names — Figma's `snake_case` or the repo's `kebab-case`?** Whichever
   loses has to be renamed on its own side; they cannot both stand.
6. **Is `size` an axis on this component at all, given problem 5?** A `size` prop over artwork with a
   2.4× optical spread promises an evenness the glyphs cannot deliver.
7. **What is `close_small_danger` actually called?** Open by the designer's own note.
