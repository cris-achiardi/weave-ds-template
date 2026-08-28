---
name: ds-figma-component
description: Generate a Figma component set from a component in packages/react/src/components/, through the figma-console MCP. Reads the component's TSX, CSS module and contract, then creates variants bound to the source file's Figma variables and text styles. Use when asked to "generate the Figma component for Button", "push a component to Figma", "build the Figma card/badge/dialog", or when given a Figma page plus a component name.
---

# ds-figma-component

Generates a Figma **component set** from a component's source of truth: the TSX, its CSS module,
and its contract pair (`<Name>.contract.json` + `<Name>.react.json`). Runs through the
**figma-console MCP** — there is no CLI step.

The point is that Figma stays _derived_. Every colour, radius, space and type decision in the
generated set binds to a Figma variable or style that mirrors a `--ds-*` token, so a token change in
the repo has one obvious counterpart in the file. Anything that cannot bind is reported, never
silently baked in.

## Read this before your first run — the template is not ready for this skill

This skill was ported from a mature design system into a **starter template**, and two of its
preconditions do not hold yet. Neither is a bug in the skill; each is a decision this repo has not
taken. Do not paper over them.

| Precondition                        | State here                                                                                                          | What to do                                                                                                          |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Semantic tokens exist to bind to    | `identity.variableCollections` in the manifest is **empty**; `packages/tokens/tokens/` holds no generated token set | Measure the source and decide the token set first. Binding cannot be checked against a mapping that does not exist. |
| A component exists to generate from | `packages/react/src/components/` is **empty by design**                                                             | Build one with `ds-component` first. This skill reads a component; it does not invent one.                          |

The bridge question is **settled**: `.figma/manifest.json` → `bridges` records a `read` bridge and a
`write` bridge separately, and this skill runs on the write one. It is opt-in and unwired by design
— nothing gates it, which is a known hole recorded in `bridges.write._gatedNote`.

There is a third, smaller one: the source file has **no light/dark axis**
(`identity.themes.decided: false`, `modes: ["dark"]`). The mode-flip verification below is the
strongest check in the whole workflow and it **cannot run yet**. When a theme axis is decided,
turn it back on — until then, say in the report that this check did not run rather than implying
it passed.

## Prerequisites

- Figma **Desktop** running with the **Desktop Bridge** plugin open in the target file.
- `figma_get_status({ probe: true })` first. `currentFileKey` must equal
  `.figma/manifest.json` → `sources.weave.key`. **Read it from the manifest; never hard-code a key.**
- **`figma_navigate({ url, lock: true })` before any write.** The active target drifts between open
  files. In this repo's very first figma-console session the active file was a different document
  entirely — an unpinned write would have landed there. Check `fileContext` on every mutating result.
- REST-backed tools (`figma_take_screenshot`) need `FIGMA_ACCESS_TOKEN` in the MCP server config.
  Prefer `figma_capture_screenshot` — it exports through the plugin and reflects live state, which
  is what you want for validating a change you just made.

## Read these when you're in their territory

Per the repo's first rule, pull context on demand; don't front-load it.

| When                                                           | Read                                                                                                                       |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Always, before generating                                      | `references/figma-file.md` — what has actually been measured in the source file, and how to re-derive IDs when they move   |
| Always, before generating                                      | `references/token-to-variable.md` — the `--ds-*` ↔ Figma-variable mapping, the `-ds-` infix trap, **and what cannot bind** |
| Writing the `figma_execute` scripts                            | `references/generation-recipe.md` — script skeleton, chunking, and the gotchas that cost real time                         |
| The axes multiply past ~50 variants, or a state axis is wanted | `references/wrapper-pattern.md` — one public component over private sets, and the state-layer recipe                       |
| Always, before reporting                                       | `references/property-check.md` — instantiate the set and drive every property. This is where the bugs are                  |
| Naming a property or its values                                | `.ai/maps/prop-map.md` §1–2 — **the canon.** A Figma variant value must equal the prop value exactly                       |
| Understanding what the component IS                            | `pnpm contract <Name>` — the merged contract-plus-source view, no build needed                                             |
| Authoring rules the component followed                         | `packages/react/src/components/README.md`                                                                                  |

Agnostic know-how index: <https://www.giorris.dev/figma/refs/refs-map.md>. Those references are
written for any design system — **where they disagree with this file, this file wins**, because it
is calibrated to this repo's token model and this Figma file.

## THE HARD RULE, in Figma

The repo's token rule has a direct Figma counterpart, and it is the thing most worth getting right:

**Bind to the token-tier collections and the published styles. Never to the primitive tier.**

The source file separates the two by collection name. Measured on 2026-08-28:

| Tier      | Collections                                     | Bind?   |
| --------- | ----------------------------------------------- | ------- |
| Token     | `Color Tokens`, `Type Tokens`, `Spacing Tokens` | **yes** |
| Primitive | `Color Primitives`, `Type Primitives`           | **no**  |

A primitive is a raw value with no role. Binding one produces a component that looks right and
silently opts out of every axis the token layer will later carry — the Figma equivalent of a
component writing `--ds-color-purple-500` instead of `--ds-color-fill-brand`.

**Scope every variable lookup by collection id.** Names repeat across tiers; an unscoped
`find()` can bind you to the wrong tier without any error.

**This tier split is measured, not decided.** `identity.variableCollections` in the manifest is the
place where collection → token-source mapping becomes canonical, and it is empty. Until it is
filled, treat the table above as an observation with a date on it, and re-measure before you rely
on it.

Type binds to a **text style**, never a hand-set `fontName` + `fontSize`. The file has eight, all
Lexend Deca, all binding `fontSize`/`fontFamily`/`fontWeight` to variables — the full table is in
`references/figma-file.md`. Note the recorded defect: **only `UI/Button` has a controlled line
height** (124.875%); the other seven are `AUTO`, Figma's font-metric default. One of
them is wrong. Do not resolve it by hand inside a component — record it and let `ds-decide` settle
it, or every set you generate inherits the same inconsistency.

## Workflow

### 1. Resolve inputs

You need a component under `packages/react/src/components/<Name>/` and a target Figma page. Ask for
whichever is missing. Prefer an existing page over creating one; check before creating, and never
leave a blank page behind from a failed attempt.

### 2. Read the source — all four faces

1. **`pnpm contract <Name>`** — the merged view of `<Name>.contract.json` and the extracted source.
   Its `axes` give the variant names, their values and their defaults. This is the authority on the
   variant axes, and `pnpm verify:contract` already asserts it agrees with the code.
2. **`<Name>.contract.json`** — anatomy, states, semantics, accessibility, token policy. The
   `anatomy` part names are the nodes your set must contain.
3. **`<Name>.tsx`** — which parts render, which are conditional, what element is underneath.
   Conditional children and slots become **boolean** properties.
4. **`<Name>.module.css`** — tokens only, by rule. Every value carrying design intent is
   `var(--ds-*)`, which is exactly what makes the mapping mechanical.

**The `cva` axes are the axes.** This library declares every variant axis in `cva`, with a
`defaultVariants` entry for each — that object is the only machine-readable home for a variant
default. Do not infer axes from class names; read them from `cva` and from the contract, which the
gate keeps in agreement.

**Parts are `data-ds-part`, not BEM modifiers.** Every named node carries
`data-ds-part="icon-start"` alongside its CSS-module class. That attribute is the stable join
between the contract's anatomy, the CSS, and the layer you build in Figma — name your Figma layers
after the part names so the two surfaces can be compared later. A part in the contract with no node
in the set is a gap worth reporting.

**A default-valued axis may emit no distinguishing rule.** The base class can fully style the
default, so `Hierarchy=primary` is sometimes the base alone. Its absence from the CSS is the design,
not a gap.

### 3. Classify

Visual (own fills/borders) → generate. Compositional (own identity _and_ composes other components)
→ generate, using instances for the children. Layout primitive (`Stack`, `Inline` — no fill, no
border, only gap) → **stop and ask**; a component set is probably the wrong artefact for something
whose whole API is a token-backed `gap`.

Then pick the **shape**, before generating anything:

| Multiply the axes out             | Shape                                                                       |
| --------------------------------- | --------------------------------------------------------------------------- |
| ≤ ~50 variants                    | **one flat set** — the default. Every axis is a dropdown; nothing is hidden |
| more, or a `State` axis is wanted | **the wrapper pattern** — `references/wrapper-pattern.md`                   |

Quote the number in the report either way. And do not reach for nesting to shrink a flat set
without checking it can work: **nesting only factors axes apart when they touch different nodes.**
If padding, min-height, radius, fill, stroke and the label's text style all live on one node, no
outer component can change an inner instance's padding and the count does not drop.

#### The State axis is per-component. Derive it; never copy it.

Read `<Name>.module.css` and the contract's `states`, and list only the states that component
actually defines. A component with no `:hover` rule has no hover state, whatever its neighbours do.

A state that renders identically to another is a **decoy** — the designer picks it, sees nothing,
and concludes the component has no such state. Leaving the column out is better than filling it with
a copy.

The exception is a decoy the _tokens_ create rather than a gap you left: two states pointing at the
same token render identically by design. Ship that cell and **say so in the description** — hiding
it would misrepresent the component, and surfacing it is how the token gap gets noticed.

Note this repo's authoring rule while you are here: states the browser owns (`:hover`,
`:focus-visible`, `:disabled`) are **not** props and **not** variant axes that map to props. Only a
state the browser does not own gets `data-ds-state`. `.ai/maps/proposals/README.md` has the four-way
sort; a `State` axis in Figma is a design-only axis, and the description must say so.

### 4. Resolve dependencies

If the component renders another (`Button` inside `Toast`), find the existing set
(`figma.root.findAll(n => n.type === 'COMPONENT_SET' && n.name === '<Name>')`) and `createInstance()`
rather than rebuilding it. A missing dependency gets a dashed placeholder and a line in the report —
never a look-alike frame, which is indistinguishable from the real thing six months later.

**Build in dependency order, and treat a placeholder as a debt.** Pick what other components will
instance, not what is next alphabetically. One `Icon` set can unblock three components at once.

When the dependency does land, **go back and retrofit at least one consumer in the same session.**
Otherwise the placeholder is permanent: the map says the gap is closed, the canvas still has the
hand-drawn thing, and nobody can tell which components were actually wired up.

**Colour does not flow into an instance.** CSS gives an icon `currentColor`; Figma has no
equivalent, so a nested icon keeps its own fill regardless of what it sits inside. Override the
glyph's fill per consumer variant — and read **What cannot bind** below before you do, because that
override has a trap in it.

#### Glyph sets are not component sets

For an icon library, make **one COMPONENT per glyph**, named `Icon/<Name>`. The slash groups them in
the Assets panel and gives the swap picker a searchable list. A `Glyph` variant axis makes swapping
worse, not better, and multiplies against every other axis for no gain.

Size is **not** an axis either, and `FIXED` sizing is right here — the one place in this skill where
it is. An icon is sized by whatever contains it, so carrying the size across a glyph swap is the
behaviour you want.

Geometry: convert, never redraw. `vectorPaths` has **no arc command** and will not parse compact SVG
syntax, so real icon-package paths fail outright. Use `scripts/svg-to-figma-path.cjs` — it flattens
arcs to cubics, emits the `M/L/C/Z` subset Figma accepts, and returns the ink bbox you need, because
**Figma normalises a vector to its own bbox and drops it at 0,0**; set `v.x`/`v.y` from that box or
every glyph sits in the corner.

### 5. Map tokens to variables

The step most likely to be quietly wrong. Work it in `references/token-to-variable.md` and **write
the mapping into the report**, so the numbers can be checked against the CSS instead of trusted.

The infix is the trap specific to this file: Figma names are `weave-ds-{path}` while the CSS
property is `--ds-{path}`. The `weave` segment is part of the Figma name and must not survive into
the token. See `references/token-to-variable.md`.

### 6. Generate

Follow `references/generation-recipe.md`. Create components in chunks (the 30 s `figma_execute`
ceiling), combine with `figma.combineAsVariants`, add non-variant properties on the **set**, then lay
out the grid.

Every text node gets a **text style**. Never set `fontName`/`fontSize` by hand.

### 7. Verify by driving it

`references/property-check.md`. Instantiate the set, drive every property through every value, and
screenshot. A set that looks right at its defaults routinely breaks on the third value of the second
axis, and only this pass finds it.

The mode-flip half of that check does not apply until this system has a theme axis. Say so in the
report; do not quietly skip it.

### 8. Hand off the page work

Laying out the page around the set — title, description, labelled cell grid, extension tables for
states and properties — is **`ds-figma-document`**. It has its own layout laws and works on sets
this repo never generated.

**But do not stop here either. A set without its page is half a deliverable.** A bare component set
sits on the file's dark canvas with no title, no description and no axis labels, and any variant
whose resting state is a transparent fill is close to invisible on it — so the work reads as broken
rather than as unfinished. Run `ds-figma-document` in the same session, and treat the batch as
incomplete until it has.

### 9. Report and record

State the mapping, what could not bind and why, which checks did not run, and any variant count you
chose not to add.

Record the result in `.figma/maps/components.json`, against
`.figma/schema/components.schema.json`. The schema is strict — read it rather than guessing the
shape. Three of its rules matter more than the rest:

- **An entry per component that now exists, never one in advance.** Absence is the signal that the
  work has not happened.
- **`componentKey` stays `null`** until the source file is published as a library. Until then the
  only join is `pageId` + `componentSetId`, and the schema marks both EPHEMERAL. Record them, treat
  them as refreshable, and never rewrite a non-null key from a scan.
- **`axes` must agree with the component's extracted prop value sets.** A disagreement means the two
  surfaces describe different components, which is the whole failure this map exists to catch.

## What cannot bind

Full table in `references/token-to-variable.md`. The ones that bite:

- **`lineHeight` — never bind it.** A unitless ratio bound to `lineHeight` is read by Figma as
  **pixels**: 1.5 becomes 1.5px, silently, no error. Text styles already handle this with a PERCENT
  literal; that is one more reason to use the style rather than set type by hand.
- **`letter-spacing`** — same class of problem. The style handles it.
- **Component-specific knobs.** This repo's authoring contract puts a component's own override
  surface in an _unprefixed_ custom property (`--button-width`), declared in the contract as
  `component-property`. Those are undefined by default and have no Figma counterpart. Never model
  them as variables or properties.
- **Motion.** Figma has no animation model; do not try to express transitions.
- **A boolean property can only show or hide a layer.** Anything that changes geometry or radius
  needs its own variant axis, and every axis multiplies the whole set. Quote the resulting variant
  count before adding one. **Colour is the exception worth knowing:** a state layer — a bound rect
  laid over the fill — changes the _rendered_ colour without an axis, because the layer's own fill
  and opacity carry the change. See `references/wrapper-pattern.md`.
- **Binding a paint on an INSTANCE SUBLAYER can leave the literal behind — and the literal is what
  renders.** `setBoundVariableForPaint` builds a paint from a base colour and attaches the variable.
  On a node you created, fine. On a sublayer _inside an instance_ the binding is stored as an
  override and the paint's own `color` can stay whatever you seeded it with — so seeding white gives
  an invisible glyph, while `resolveForConsumer` still reports the correct colour and every
  inspection looks right. **Always seed the paint with the resolved colour, then bind:**

  ```js
  const r = variable.resolveForConsumer(node); // resolve FIRST
  let paint = { type: 'SOLID', color: r.value, opacity: 1 };
  paint = figma.variables.setBoundVariableForPaint(paint, 'color', variable);
  node.fills = [paint];
  ```

  Screenshot the result. A `byteLength` of a few hundred on an exported component means it rendered
  empty, and re-exporting the same node id can return a cached image — capture a _different_ node to
  force a fresh render.

- **`opacity` binds — verified in this file on 2026-08-28** (`node.setBoundVariable('opacity', v)`
  succeeded against a local FLOAT). What is **not** settled here is the storage convention: Figma
  reads the bound FLOAT as a percentage, while CSS wants a 0–1 ratio, so the same pixel is reached
  from numbers that differ by 100×. This repo has not decided which the token stores. Settle it in
  an ADR before writing opacity tokens, and until then **do not "correct" one side to match the
  other** — you will be guessing which convention is canonical.

## Housekeeping

Before creating: screenshot the target page to see what is there and find clear space. Place
everything inside a named Section or Frame, never on blank canvas, and never overlapping existing
content. After creating: screenshot to confirm. On a failed attempt: delete the partial artefacts —
empty frames, orphaned layers, blank pages — before retrying.
