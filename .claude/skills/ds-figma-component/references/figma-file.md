# The Figma file

What is actually in the design source, measured rather than assumed.

**Source:** `.figma/manifest.json` → `sources.weave`. Read the key from there; never hard-code it.

Everything below was measured live on **2026-08-28** through the Desktop Bridge. Collection and
style **names** are the stable join; node ids are not. Re-derive before relying on any of it — this
file is a snapshot, and the source is a working design file, not a frozen library.

> The file is **not published as a library** (`sources.weave.published: false`), so nothing here has
> a durable `componentKey`. Every id is file-local and refreshable.

## Variable collections — 5, and every one has a single mode

| Collection         | Modes     | Variables | Types         | Tier      |
| ------------------ | --------- | --------- | ------------- | --------- |
| `Color Primitives` | `Mode 1`  | 15        | COLOR         | primitive |
| `Color Tokens`     | `Mode 1`  | 15        | COLOR         | **token** |
| `Type Primitives`  | `Default` | 10        | FLOAT, STRING | primitive |
| `Type Tokens`      | `Mode 1`  | 24        | STRING, FLOAT | **token** |
| `Spacing Tokens`   | `Mode 1`  | 23        | FLOAT         | **token** |

87 variables in total.

**Bind to the token tier. Never to the primitive tier.** A primitive is a raw value with no role;
binding one produces a component that silently opts out of every axis the token layer will carry.
Scope every lookup by collection id — names repeat across the two tiers.

**The tier split above is observed, not decided.** `.figma/manifest.json` →
`identity.variableCollections` is the place where collection → DTCG source file becomes canonical,
and it is **empty**. Until `ds-explore` fills it, a variable's collection tells you which tier it is
in and nothing about which token file it should become.

### Single mode is the fact that shapes everything

Every collection has exactly one mode. There is **no light/dark axis, no density axis, no shape
axis** — nothing to flip. The manifest records this as `identity.themes: { modes: ["dark"],
decided: false }`: dark-only, and not yet _decided_ to be dark-only.

Two consequences, both load-bearing:

1. **The mode-flip verification cannot run.** It is the strongest check in `property-check.md` and
   in `ds-figma-document`. Report that it did not run; never imply it passed.
2. **A binding cannot be proven correct by observation here.** With one mode, a bound value and a
   baked literal look identical on the canvas. The only way to tell them apart is to inspect
   `boundVariables` on the node. Do that; do not trust the render.

## Text styles — 8

All Lexend Deca. All three type facets bind to variables (`fontSize`, `fontFamily`, `fontWeight`),
which is why type should be applied as a **style** and never as a hand-set `fontName` + `fontSize`.

| Style               | Weight | Size | Line height  | Letter spacing |
| ------------------- | ------ | ---- | ------------ | -------------- |
| `UI/Button`         | Medium | 16   | **124.875%** | 0%             |
| `UI/Label`          | Light  | 16   | AUTO         | 0%             |
| `UI/Label-emphasis` | Medium | 16   | AUTO         | 0%             |
| `UI/Description`    | Light  | 14   | AUTO         | 0%             |
| `UI/Caption`        | Light  | 12   | AUTO         | 0%             |
| `Display/Heading`   | Medium | 20   | AUTO         | 0%             |
| `Display/Time`      | Medium | 16   | AUTO         | 0%             |
| `Display/Title`     | Medium | 24   | AUTO         | 0%             |

### The line-height defect, corrected

`UI/Button` is the only style with an explicit line height. The other seven are `AUTO` — Figma's
font-metric default, which is not a number the type scale controls.

**This corrects the manifest.** `.figma/manifest.json` → `identity.font.knownProblems` currently
says _"UI/Button uses 1.2487 while every other style uses 100"_. The `100` is wrong: measured, the
others are `AUTO`, and `AUTO` and `100%` are different things. The defect is real but it is worse
than recorded — seven styles have **no controlled line height at all**, rather than a consistent one
that disagrees with an eighth.

Do not fix this inside a component. Record it, and let `ds-decide` settle whether the type scale
owns line height. Every set generated before it is settled inherits the inconsistency.

### 124.875% is a red flag on its own

A line height of `124.87499713897705%` is not a designed value; it is a dragged handle. Treat it as
evidence when the type-scale ADR is written, not as a number to reproduce.

## Effect styles — none. Paint styles — none.

There are **zero** local effect styles and **zero** local paint styles.

This matters more than it looks:

- **There is nothing to bind a shadow to.** The upstream version of this skill instructs you to bind
  elevation to an effect style. Here that instruction has no target. A shadow you add is a literal
  until an effect-style set exists — so annotate it as one, per the honesty rule, or leave it out.
- **Colour lives entirely in variables, not paint styles.** That is the modern arrangement and it is
  the right one; noted here only so an absent paint-style list is not read as an incomplete scan.

## Pages

20 pages. The structure is a taxonomy that has been laid out but not filled.

```
Starter UI kit          ← everything actually lives here
-----------
Design Language
├ Primitives
├ Color                 ← the ramp/opacity exploration boards
├ Typography
├ Icons
---
Components
> Primitives
   ├ Component
         └ Component Item
> Forms & Input
> Images
> Labels
> Layout & Structure
> Loading
> Navigation
> Status Indicators
> Overlays & Layering
```

**Every `>` and `├` page under `Components` is empty.** They are the intended destination, not a
record of work done. Putting a generated set on the right one is part of the job.

## Components — 44 sets and 35 loose components, all on one page

All of it sits on `Starter UI kit`. Nothing has been sorted into the taxonomy.

Roughly three groups:

| Group                      | Examples                                                                                                                        |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Material-style icon glyphs | `graphic_eq`, `desktop_mac`, `videocam`, `mic`, `crop_16_9`, `settings`, `notifications`, `close`, `keyboard_arrow_down`        |
| Product UI                 | `main-ui-button`, `button`, `options`, `options-dropdown`, `toggle-switch`, `dropdown`, `settings-tabs`, `webcam-overlay`       |
| Feature-specific           | `controls-pause`, `controls-stop`, `scenes-control-button`, `notes-button`, `notes-save-indicator`, `mic-sound`, `system-sound` |

Three things to know before touching any of them:

1. **None of these came from this repo.** `.figma/maps/components.json` is empty. They are a
   designer's hand-built kit, and `ds-figma-document` is the skill that works on them; this skill
   generates _new_ sets from code.
2. **The naming is not the repo's canon.** `button` / `main-ui-button` / `closeButton` /
   `settingsButton` mix cases and conventions in one file. `.ai/maps/prop-map.md` §1 is the canon for
   anything you create. Do not rename someone's existing component as a side effect.
3. **The icon glyphs are already one-component-per-glyph**, which is the shape this skill wants —
   but they are named bare (`mic`, not `Icon/mic`), so they do not group in the Assets panel. Worth
   an ADR before a bulk rename; worth _not_ doing quietly.

## Re-deriving what moved

Names are the join. Ids are not.

```js
// collections and variables, scoped by tier
const cols = await figma.variables.getLocalVariableCollectionsAsync();
const vars = await figma.variables.getLocalVariablesAsync();
const colId = (n) => (cols.find((c) => c.name === n) || {}).id;
const scoped = (colName) => {
  const id = colId(colName);
  return (n) => vars.find((v) => v.name === n && v.variableCollectionId === id);
};
const TOKEN = scoped('Color Tokens'); // never scoped('Color Primitives')

// text styles
const textStyles = await figma.getLocalTextStylesAsync();
const style = (n) => textStyles.find((s) => s.name === n);

// a component set by name, across pages
await figma.loadAllPagesAsync();
const set = figma.root.findAll((n) => n.type === 'COMPONENT_SET' && n.name === '<Name>')[0];

// a page — check before creating, and use the async setter
const page = figma.root.children.find((p) => p.name === '> Forms & Input');
await figma.setCurrentPageAsync(page); // sync assignment throws under dynamic-page
```

If a lookup returns `undefined`, **stop and re-measure**. Do not fall back to a literal and carry on
— that is exactly how a board or a set quietly stops matching the system.

## Refreshing this file

Re-run the measurement and rewrite the tables when any of them stops matching:

```js
// collections, styles, pages, component inventory — one pass
await figma.loadAllPagesAsync();
const cols = await figma.variables.getLocalVariableCollectionsAsync();
const vars = await figma.variables.getLocalVariablesAsync();
const textStyles = await figma.getLocalTextStylesAsync();
const effectStyles = await figma.getLocalEffectStylesAsync();
const paintStyles = await figma.getLocalPaintStylesAsync();
```

Put the date on it. A snapshot without a date is indistinguishable from a claim about the present.
