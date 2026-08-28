# The wrapper pattern, and building states

For components whose axes multiply past what one set should hold, and for the `State` axis that
makes them multiply. Every value here was measured off the file on 2026-08-24, building Button.

## When

A flat set is the default and stays the default. Reach for this when the cross-product is large —
in practice past about 50 variants — or when a `State` axis is wanted, since it multiplies
everything by five.

**First check that nesting can help at all.** It factors axes apart only when they touch _different_
nodes. Button's `Variant`, `Size`, `Icon only` and `State` all paint the same frame: padding,
min-height, radius, fill, stroke and the label's text style are properties of one node. No outer
component can reach into an inner instance and change its padding, so wrapping `Size` around
`Variant` reduces nothing. Dump the component's structure before promising anyone a smaller number.

What the pattern actually buys is not fewer components — it is **one entry in the Assets panel** and
a browsable set size.

## The shape

```
ASSETS PANEL      Button                    ← the only public thing

CANVAS
  Button          COMPONENT, HUG × HUG, declares NO properties of its own
  └── Form        INSTANCE, isExposedInstance = true

  .Button         COMPONENT_SET   ← private: the leading dot hides it from Assets
  .Button sm      COMPONENT_SET
  .Button icon    COMPONENT_SET
```

A placed `Button` shows the nested instance's whole property list plus a swap control, so the
designer gets every dropdown without the sets being public.

The original is `Taxonomy Tokens (Southleft playground)` page `501:3142`: four `.Button <Colour>`
sets of 90 behind one public `Button`. Read it before building a new one.

```js
const inst = privateSet.defaultVariant.createInstance();
const wrap = figma.createComponent();
wrap.layoutMode = 'HORIZONTAL';
wrap.primaryAxisSizingMode = 'AUTO';
wrap.counterAxisSizingMode = 'AUTO';
wrap.fills = [];
wrap.clipsContent = false; // or a focus ring gets clipped
page.appendChild(wrap);
wrap.appendChild(inst);
inst.name = 'Form';
inst.isExposedInstance = true; // writable; verified
```

`component.exposedInstances` reads back **empty** on the main component — check
`placedInstance.exposedInstances` instead, which returns `['Form']`. Reach the nested instance as
`instance.exposedInstances[0]`.

## Swapping between the private sets

**Give every private set an identical property signature** — same axis names, same values, same
booleans. Figma preserves what it can match; anything unmatched resets to its default.

Where a set genuinely needs an extra axis (Button's icon set carries `Size` because a square button
has no typography to split on), say so in the map. Swapping into it keeps the matching axes and
lands the extra one on its default.

> **`swapComponent(target)` is lower-level than the UI swap.** It adopts the target _exactly_, so
> passing `set.defaultVariant` resets every axis and looks like the pattern is broken. Pass the
> MATCHING variant to reproduce what a designer sees.

## Nothing may be FIXED, or a swap carries the old size

The trap that cost the most time, and it bit twice.

**A `FIXED` axis is an explicit size, and Figma preserves an explicit size across a swap.** Swap a
48-tall instance into a 32-tall set and it stays **48** — the label restyles, the box does not
shrink, and it reads as the swap half-working. The same happens on width: a 134-wide label button
swapped into a 48-wide icon set stays 134 and renders as a stretched rectangle.

So **every axis of every variant must be `HUG`**, with the real dimension supplied by bound
min/max constraints:

```js
c.layoutSizingHorizontal = 'HUG';
c.layoutSizingVertical = 'HUG';
c.setBoundVariable('minHeight', V['semantic/size/height/control/default']);
```

Rendered sizes do not change — a bound `minHeight` beats the hugged content — but the dimension is
now derived, which is also what finally makes a density-mode flip resize the control.

### Square boxes: pin `minWidth` AND `maxWidth`

CSS makes an icon button square with `aspect-ratio: 1/1`. Figma has no counterpart, and `FIXED` is
not the answer — see above. Bind **both** `minWidth` and `maxWidth` to the _same_ variable the
height uses, and the width is pinned to exactly that token while staying HUG:

```js
c.setBoundVariable('minWidth', V[heightToken]);
c.setBoundVariable('maxWidth', V[heightToken]);
```

`minWidth` alone is not enough. Button's small icon variant has 36 of content (a 20 icon plus 8 + 8
padding), which beats a 32 minimum and renders 36 × 32 — nearly square, and wrong. The max is what
holds the shape.

## Building the states

Read the component's authored CSS. Do not apply one formula across the variants — in Button, three
of the five break the pattern, and only reading catches it.

| State               | Figma                                                                  |
| ------------------- | ---------------------------------------------------------------------- |
| `hover` / `pressed` | a **state layer**: a rect over the fill, colour and opacity both bound |
| `focus`             | a dashed rect OUTSIDE the frame bounds                                 |
| `disabled`          | node `opacity` bound to the disabled token                             |

### The state layer

CSS does not invent a hover colour — it mixes a highlight into the fill. Both ingredients are
tokens, so Figma composites the same thing instead of baking a literal:

```js
const W = c.width,
  H = c.height; // capture BEFORE inserting
const r = figma.createRectangle();
r.fills = [
  figma.variables.setBoundVariableForPaint(
    { type: 'SOLID', color: { r: 1, g: 1, b: 1 }, opacity: 1 },
    'color',
    V['semantic/color/interaction/highlight'],
  ),
];
r.strokes = [];
c.insertChild(0, r); // index 0 = BEHIND the label
r.layoutPositioning = 'ABSOLUTE';
r.constraints = { horizontal: 'STRETCH', vertical: 'STRETCH' };
r.resize(W, H);
r.x = 0;
r.y = 0;
['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius'].forEach((f) =>
  r.setBoundVariable(f, V['semantic/border/radius/control']),
);
r.setBoundVariable('opacity', V['semantic/opacity/interaction/hover']);
```

- **`insertChild(0, …)` puts it behind.** The CSS mixes into `background-color` only; a layer above
  the label washes the text.
- **Capture `width`/`height` before inserting.** A new child is briefly a flow child and resizes the
  auto-layout parent; read the numbers first, then set `ABSOLUTE`.
- **`STRETCH` constraints** are what make it follow the button when a slot boolean changes the width.

### The focus ring goes OUTSIDE, not in a padded wrapper

An outline takes no layout space. A padded wrapper makes the focus variant physically larger than
its siblings, so the control jumps size when a designer selects that state and the cell grid stops
aligning.

```js
const I = 2; // = the offset token's value
r.strokeAlign = 'OUTSIDE';
r.dashPattern = [4, 3];
c.appendChild(r); // on top
r.layoutPositioning = 'ABSOLUTE';
r.constraints = { horizontal: 'STRETCH', vertical: 'STRETCH' };
r.resize(W + I * 2, H + I * 2);
r.x = -I;
r.y = -I;
r.cornerRadius = 10; // control radius + offset
```

The parent needs `clipsContent = false`. Colour and stroke weight bind; the **inset and radius stay
literal**, because Figma cannot compute `radius + offset` from the tokens. Say so in the report.

Exporting the component alone crops the ring at its own bounds — that is `exportAsync`, not a bug.
Screenshot the grid or the page to see it.

## Generate by cloning, not by rebuilding

If a correct set already exists, clone its variants and apply the state treatment. Every binding
survives and the risk collapses.

```js
const c = orig.clone(); // parents to the PAGE, not into the set — safe
page.appendChild(c);
c.name = 'Variant=' + v + ', State=' + s;
```

> **`componentPropertyReferences` do NOT survive a clone.** Boolean props come back as `{}`. After
> `combineAsVariants`, re-add the properties on the new set and rewire every node:
>
> ```js
> const before = set.addComponentProperty('Slot before', 'BOOLEAN', true);
> for (const c of set.children)
>   c.findOne((n) => n.name === 'slot-before').componentPropertyReferences = { visible: before };
> ```

`combineAsVariants` keeps whatever x/y the loose components had, so they land on top of each other
if you parked them in a stack. Position them afterwards on the documented 220 × 120 grid.

`setProperties` needs the **full key including the `#id` suffix** for non-variant properties
(`'Slot before#1589:0'`). Variant axes take their bare name. Look the key up:

```js
const keys = Object.keys(nested.componentProperties);
const k = keys.find((x) => x.indexOf('Slot before') === 0);
```

## Verify

Beyond `property-check.md`:

1. **Walk the whole cross-product** by name — every expected variant present, none unexpected.
2. **Assert the treatment per variant** — state layer present exactly where it should be, focus ring
   only on `focus`, `boundVariables.opacity` only on `disabled`. This catches a formula applied to a
   variant that overrides it.
3. **Drive the booleans** through every combination and check the rendered width actually changes.
4. **Swap** an instance driven to a non-default state into each sibling set; confirm the axes
   survive **and that BOTH dimensions re-derive**. Checking only the axis you thought about is how
   the width bug survived the first pass — the height was fixed and verified, the width was not.
5. **Flip the colour-scheme mode** on the doc frame and confirm hover and pressed repaint. If they
   do not, something got baked. Clear the mode afterwards.
6. **Sweep every mode of every multi-mode collection** and record which ones actually change the
   component. Cheap, and it is the only way to know what to claim:

   ```js
   for (const c of await figma.variables.getLocalVariableCollectionsAsync()) {
     if (c.modes.length < 2) continue;
     for (const m of c.modes) {
       host.setExplicitVariableModeForCollection(c, m.modeId);
       read();
     }
     host.clearExplicitVariableModeForCollection(c);
   }
   ```

   On Button, four of nine axes did anything at all. Documentation that implies otherwise sends a
   designer hunting for a setting that does not exist.

`findAll(n => n.type === 'INSTANCE')` inside a cell also returns **instance sublayers**, which
cannot be removed — `remove()` throws with an `I…;…` id. Filter `cell.children` instead.

## Figma defaults that silently produce wrong geometry

Every one of these cost a round trip on the atoms batch. Assert dimensions after building; do not
trust that setting `layoutMode` was enough.

- **`figma.createComponent()` is 100 × 100 FIXED.** Setting `layoutMode` does not change that — you
  must set `layoutSizingHorizontal/Vertical = 'HUG'` explicitly, or every variant comes out 100 tall.
- **`figma.createText()` is a fixed box.** Set `textAutoResize = 'WIDTH_AND_HEIGHT'` (or `'HEIGHT'`
  for a filling paragraph) or the label pads its parent out.
- **Read a parent's size only after all its children exist.** Sizing an absolutely-positioned overlay
  from `c.width` _before_ appending the icon gives a layer that covers part of the component — it
  looks like a rendering bug and is really a sequencing one. Size overlays last, or re-size them in
  a second pass.
- **`figma.currentPage = page` throws** under dynamic-page access; use `await
figma.setCurrentPageAsync(page)`. Same for `node.effectStyleId = …` → `setEffectStyleIdAsync`, and
  `textStyleId` → `setTextStyleIdAsync`.
- **`getNodeByIdAsync` returns null for a node on an unloaded page.** Call
  `await figma.loadAllPagesAsync()` first — including inside any helper you defined in an earlier
  `figma_execute` call, since each call starts fresh.
- **A failed script leaves its partial frames behind.** They are indistinguishable from finished work
  next session. Clear the target page's non-component nodes before retrying, and sweep at the end.
