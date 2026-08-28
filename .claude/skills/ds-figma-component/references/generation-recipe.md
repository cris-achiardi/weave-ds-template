# Generation recipe

The working shape of the `figma_execute` scripts, and the mistakes worth not repeating.

The gotcha table is largely tool-level rather than repo-level, and is adapted from the equivalent
Taxonomy skill and <https://www.giorris.dev/figma/refs/refs-map.md>. Where a row is specific to this
repo it says so.

## Execution model

`figma_execute({ code, timeout })` runs in Figma's plugin sandbox with the `figma` global. The body
is an async context, so top-level `await` works and a bare `return` is the result. **`timeout` maxes
at 30000 ms.**

That ceiling drives the structure: **chunk the work.** One `figma_execute` per outer axis value is
about right. Creating instances is the expensive part; a set with no nested instances can go wider.

**State does not persist between calls.** Either return the IDs you need and pass them back as
literals, or re-find the nodes:

```js
const comps = figma.currentPage.children.filter((n) => n.type === 'COMPONENT');
```

**Keep return payloads small.** Returning a node's full `componentPropertyDefinitions` dumps every
`preferredValues` key and can be tens of KB, which truncates the response and hides the part you
needed. Return counts, names, and a few samples.

## Preflight, every time

Read the expected key from `.figma/manifest.json` → `sources.weave.key` **on the agent side**, then
interpolate it into the script. The plugin sandbox cannot read the repo, so this is the one place
the key crosses over — and it must arrive from the manifest, never as a literal you typed.

```js
const EXPECTED = '<from .figma/manifest.json -> sources.weave.key>';
if (figma.fileKey !== EXPECTED) return { ABORT: 'wrong file', fileKey: figma.fileKey };
```

Cheap, and it is the difference between generating into the design source and generating into
whatever else was open. This is not hypothetical: the first figma-console session in this repo
opened with a different file as the active target, and an unpinned write would have landed there.
Pair the check with `figma_navigate({ url, lock: true })` — the guard catches it, the lock prevents
it.

## Building one variant

```js
const page = figma.root.children.find((p) => p.name.trim() === '> Forms & Input');
await page.loadAsync();
if (figma.currentPage.id !== page.id) await figma.setCurrentPageAsync(page);

const cols = await figma.variables.getLocalVariableCollectionsAsync();
const vars = await figma.variables.getLocalVariablesAsync();
const V = (colName, varName) => {
  // ALWAYS scope by collection
  const id = cols.find((c) => c.name === colName).id;
  return vars.find((v) => v.variableCollectionId === id && v.name === varName);
};

const comp = figma.createComponent();
comp.name = `Variant=primary, Size=md`; // exact Figma variant syntax

comp.layoutMode = 'HORIZONTAL';
comp.resize(120, 40); // resize FIRST — it forces both axes FIXED
comp.primaryAxisSizingMode = 'AUTO'; // hug width
comp.counterAxisSizingMode = 'FIXED'; // fixed height
comp.counterAxisAlignItems = 'CENTER';
comp.primaryAxisAlignItems = 'CENTER';
comp.paddingTop = comp.paddingBottom = 0; // height is fixed; vertical padding fights it
comp.clipsContent = false;

comp.setBoundVariable('paddingLeft', V('Spacing Tokens', 'space/3'));
comp.setBoundVariable('paddingRight', V('Spacing Tokens', 'space/3'));
comp.setBoundVariable('itemSpacing', V('Spacing Tokens', 'space/2'));
for (const c of ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius']) {
  comp.setBoundVariable(c, V('Spacing Tokens', 'radius/m'));
}
```

Collection and variable names above are this file's, measured 2026-08-28 — see
`figma-file.md`. **Always scope by collection**, and always to the _token_ tier
(`Color Tokens`, `Spacing Tokens`, `Type Tokens`), never to `Color Primitives` or `Type Primitives`.

## Fills

A placeholder paint must exist before binding, or the bind is a no-op that reports success:

```js
comp.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
comp.fills = [
  figma.variables.setBoundVariableForPaint(
    comp.fills[0],
    'color',
    V('Color Tokens', 'surface/primary'),
  ),
];
```

Seed the placeholder with the variable's **resolved** colour rather than an arbitrary one when the
node is a sublayer inside an instance — there the binding is stored as an override and the seeded
literal is what renders. `SKILL.md` → _What cannot bind_ has the full trap and the fix.

## Text

```js
await figma.loadFontAsync({ family: 'Inter', style: 'Regular' }); // createText() starts as Inter
const label = figma.createText();
label.characters = 'Button';
await label.setTextStyleIdAsync(bodyMdSemibold.id); // style, never fontName+fontSize
label.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
label.fills = [
  figma.variables.setBoundVariableForPaint(
    label.fills[0],
    'color',
    V('Color Tokens', 'text/primary'),
  ),
];
comp.appendChild(label);
```

Load Inter even when applying a style: `figma.createText()` starts as Inter Regular, so the first
write to a new node needs it loaded regardless.

### Two text-sizing traps

**`FILL` on a `textAutoResize: 'HEIGHT'` node needs a concrete width first**, or the node lands at
width 0 and stacks one character per line. `layoutGrow` still reads 1 and it still looks broken:

```js
t.textAutoResize = 'NONE';
t.resize(available, t.height);
t.layoutSizingHorizontal = 'FILL';
t.textAutoResize = 'HEIGHT';
```

**`max-width` belongs on the text node, not the frame.** A frame's `maxWidth` clamps the box but does
not reflow auto-width text, so long strings overflow. `label.maxWidth = 196` with
`textAutoResize = 'WIDTH_AND_HEIGHT'` reproduces `width: max-content; max-width: Nch`.

## Combining

```js
const set = figma.combineAsVariants(comps, figma.currentPage);
set.name = 'Button';
set.layoutMode = 'VERTICAL';
```

Non-variant properties (booleans, text, instance swaps) go on the **set**, not on members, then wire
`componentPropertyReferences` on the node each one drives.

## Gotchas, collected

| Symptom                                                   | Cause                                                                                                                                                                                 |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Cannot call with documentAccess: dynamic-page`           | `await figma.setCurrentPageAsync(page)`                                                                                                                                               |
| Another page's `children` is empty                        | `await page.loadAsync()` first                                                                                                                                                        |
| Components collapse to 1px                                | `resize()` called _after_ the sizing modes                                                                                                                                            |
| A frame is stuck at a throwaway width, children overflow  | `resize()` forces **both** axes FIXED. Restore the one you didn't mean to pin                                                                                                         |
| `'HUG' is not a valid value`                              | Figma's hug is `'AUTO'`                                                                                                                                                               |
| Variable binding silently does nothing                    | No placeholder paint before `setBoundVariableForPaint`                                                                                                                                |
| Bound the wrong colour                                    | Lookup not scoped by collection. `Color Tokens` and `Color Primitives` are both colour collections — an unscoped find can bind the raw primitive, which carries no role               |
| Text collapses to a sliver                                | `lineHeight` bound to a unitless FLOAT — read as pixels. Use a text style                                                                                                             |
| Text stacks one character per line                        | `FILL` on a `HEIGHT` node with no width                                                                                                                                               |
| Long text overflows instead of wrapping                   | `maxWidth` on the frame instead of the text node                                                                                                                                      |
| Font renders as `"String value"`                          | The **variable** holds Figma's placeholder for a string created without a value. Not a binding bug — fix the variable                                                                 |
| `textStyleId` setter throws                               | `await node.setTextStyleIdAsync(id)`                                                                                                                                                  |
| `Cannot write to node with unloaded font "Inter Regular"` | Load Inter; `createText()` starts there                                                                                                                                               |
| Shadow doesn't match the token                            | Normally: apply the effect style rather than hand-building effects (Figma calls blur `radius`). **This file has no effect styles**, so a shadow is a literal — annotate it or omit it |
| Border on one side only                                   | Per-side stroke weights: `strokeTopWeight` etc. Set the others to 0                                                                                                                   |
| `INSTANCE_SWAP` rejects the value                         | It wants a node ID, not a `componentKey`                                                                                                                                              |
| Whole set ignores a mode switch                           | An explicit variable mode is pinned on it. `clearExplicitVariableModeForCollection`, then assert `explicitVariableModes` is `{}`                                                      |
| Duplicate collection appears                              | `createVariableCollection` is **not idempotent**. Find-then-create, and dedupe after                                                                                                  |
| `figma_take_screenshot` → 403                             | REST path needs `FIGMA_ACCESS_TOKEN`. Use `figma_capture_screenshot`                                                                                                                  |
| `layoutSizingHorizontal` throws                           | Node not appended to an auto-layout parent yet                                                                                                                                        |
| Huge/truncated tool response                              | Returned full `componentPropertyDefinitions`. Return counts and samples                                                                                                               |

## Documenting the set once it exists

Laying out the page around a set — title, description, labelled cell grid, extension tables for
states and properties — is a separate job with its own layout laws, and it applies to sets this
repo never generated. It lives in **`ds-figma-document`**
(`.claude/skills/ds-figma-document/`), not here.

Hand off to it when the set is built and verified.
