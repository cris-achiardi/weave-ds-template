---
name: ds-figma-explain
description: Build visual explanations of this design system on a Figma canvas — node-graph diagrams with elbow connectors (component APIs, token tiers, architecture, data flow), spec and comparison tables, annotated anatomy mocks with numbered callouts, and flow diagrams. Use when asked to "explain X in Figma", "diagram this", "make a component API map", "visualise the token tiers", "put a spec table in Figma", "annotate this mock", or for a board that communicates how something works. NOT for producing library components — see ds-figma-component.
---

# ds-figma-explain

Builds **explanatory** artefacts on the canvas: diagrams, spec tables, annotated anatomy, flows.
Runs through the **figma-console MCP**.

## When this, and when the other two

| You want                                                    | Skill                |
| ----------------------------------------------------------- | -------------------- |
| A board that explains how something works                   | **this one**         |
| A component set with variants that designers instantiate    | `ds-figma-component` |
| The page around a set: description, cell grid, state tables | `ds-figma-document`  |
| An anatomy mock with numbered callouts                      | **this one**         |
| A real `Button` in the library                              | `ds-figma-component` |

If the output is meant to be _used_ as a component, it is another skill. If it is meant to be
_read_, it is this one.

This is the one of the three that is **usable today**. It needs a Figma file and something true to
explain; it does not need components or a finished token set. Explaining the token pipeline, the
contract system or the ADR arc is a reasonable first job for it.

## What this skill is not

- Not a mockup generator. A board explains a system; it does not propose a screen.
- Not a replacement for the docs. Reach for it when the thing is **structural** — tiers, graphs,
  relationships — and prose is doing badly at it.
- Not a place for invented values. Every number on a board comes from the repo or from a live read.
  A diagram with plausible-looking made-up spacing is worse than none, because it looks authoritative.

That last one is the repo's own rule in another costume: _a gap is a finding, not a blank to fill._
On a board, an unmeasured value should be drawn as unmeasured — not rounded to something plausible.

## The binding rule

**Nothing on the board is a literal colour, font, size, radius or space.**

`assets/diagram-kit.js` resolves everything through `tokens()` to a Figma variable, text style or
effect style. If you are typing a hex, you are working around the kit.

This is a deliberate fork of the upstream `figma-explain` approach, which ships a frozen palette and
tells you _not_ to bind. That is right for an arbitrary file and wrong for a design system's own
file: the roles are semantic, everything else in the file binds, and a board of literals silently
stops matching the system it documents the first time a token moves.

**Scope every variable lookup by collection.** Names repeat across the primitive and token tiers, so
an unscoped `find()` can bind a board to a raw primitive that carries no role. The kit's `tokens()`
does this for you; do not bypass it.

### The kit is not mapped to this file yet — and it will tell you so

`tokens()` carries a **`CONFIG` block** at the top: the collection names, and the role → variable-name
map that gives the board its visual language. In this repo that map is **unfilled**, because the
token set it should point at has not been decided
(`.figma/manifest.json` → `identity.variableCollections` is empty).

So the kit degrades on purpose:

- Every lookup that fails is recorded in `T.unresolved`.
- `T.report()` returns that list. **Put it in your report.** A board built with twelve unresolved
  roles is a board of literals wearing the kit's clothes, and saying so is the difference between a
  known-provisional artefact and a misleading one.
- Fallback numbers exist so a board can be built at all. They are last-resort, not defaults to
  settle for.

Filling `CONFIG` is a one-time job that belongs after the token set is decided and built. Do it
there, not inline in a board script.

The collections measured in the source file on 2026-08-28 — `Color Tokens`, `Type Tokens`,
`Spacing Tokens` for the token tier, `Color Primitives` and `Type Primitives` for the primitive tier
— are already in `CONFIG` as a starting point. Re-measure before trusting them; they were observed,
not decided.

## Before writing any Figma code

1. `figma_get_status({ probe: true })` — `currentFileKey` must match `.figma/manifest.json` →
   `sources.weave.key`. **Read the key from the manifest; never hard-code one.**
2. **`figma_navigate({ url, lock: true })`.** The target drifts between open files, and an unpinned
   write can land in whichever document the user last touched.
3. Screenshot the target page. See what is there, find clear space, never overlap.
4. Read the source of truth for whatever you are explaining — the contract, the token file, the CSS,
   the ADR. Measure, do not eyeball.

## Using the kit

`assets/diagram-kit.js` is a **prelude to paste**, not a module to import. The plugin sandbox has no
module system. Paste the functions you need at the top of the `figma_execute` call, then the build
code, then a bare `return`:

```js
/* ...kit functions... */
const T = await tokens(); // ALWAYS first — everything needs it
await loadFonts();
/* ...build... */
return { ...summary, unresolved: T.report() };
```

**Do not wrap in an async IIFE.** `(async () => {...})()` returns a Promise the bridge does not
await — the call reports success with an **empty result** and you will chase a phantom. The body is
already an async function; use top-level await.

The plugin runs with `documentAccess: dynamic-page`, so every page/node/style lookup uses its async
form (`getNodeByIdAsync`, `setCurrentPageAsync`, `page.loadAsync()`, `setTextStyleIdAsync`). A
synchronous `figma.currentPage = page` throws here — this is the first error most sessions hit.

## Artefact types

| Type                  | Use when                                                     | Kit entry points                                 |
| --------------------- | ------------------------------------------------------------ | ------------------------------------------------ |
| **Node graph**        | Relationships: token tiers, component composition, data flow | `frame`, `section`, `elbowPoints`, `underPoints` |
| **Spec table**        | Comparing variants, props, modes side by side                | `section`, table helpers                         |
| **Annotated anatomy** | Naming the parts of one component                            | `annotate`, leader lines                         |
| **Flow**              | Sequence or decision order                                   | `elbowPoints` with channel shifts                |

Default for explaining a component: a node graph of its parts, plus a spec table of its props from
`pnpm contract <Name>`. That merged view is gated against the source by `pnpm verify:contract`, so it
cannot drift from the component.

## Build in two passes

1. **Structure** — frames, sections, layout. Screenshot. Fix alignment and overflow _before_
   adding detail; a misaligned board is much cheaper to fix while it is empty.
2. **Detail** — text, connectors, annotations. Screenshot again.

Connectors last, always. They are positioned from resolved node bounds, and any layout change after
you draw them leaves them pointing at where things used to be.

## Validate in both modes

The point of binding is that the board follows the axes. Prove it rather than assuming:

```js
frame.setExplicitVariableModeForCollection(T.colorScheme, otherModeId);
// capture
frame.clearExplicitVariableModeForCollection(T.colorScheme);
```

**This file has one mode.** `.figma/manifest.json` → `identity.themes` records `modes: ["dark"]`
with `decided: false`, so there is nothing to flip to and this check cannot run. Say that in the
report. When a second mode exists, this becomes mandatory: if nothing changes on the flip, something
is bound to a primitive or pinned to an explicit mode, which is the most common serious defect —
perfect in the default, wrong everywhere else.

Capture with `figma_capture_screenshot` (plugin export, live state). `figma_take_screenshot` uses
the REST path and needs `FIGMA_ACCESS_TOKEN` in the MCP server config.

## Guardrails

- **Place everything inside a named Section or Frame.** Never on blank canvas.
- **Clean up failed attempts.** Delete partial frames, orphaned layers and blank pages before
  retrying. A half-built board left on the page is indistinguishable from a finished one.
- **Never mutate existing nodes** unless that is explicitly the task. Nothing in the kit does.
- **Do not create a page that already exists.** Check first:
  `figma.root.children.find(p => p.name === name)`.
- **Keep return payloads small.** Return counts and a few samples, never a full node dump — a
  truncated response hides the part you needed.

## Reporting

Say what you built, where it is, what you measured it from, what you could not represent, and
**what `T.report()` returned**. A board is a claim about the system; the report is what makes the
claim checkable.
