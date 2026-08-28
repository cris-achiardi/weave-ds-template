# Layout mechanics

The three laws that decide whether a documented page looks right, and the Figma APIs behind them.
Every value here was measured off the file, not chosen.

The worked example is 🛠 Button → the `.Button` GROUP (`1589:4405`) inside the frame `1565:4277`,
one of three set groups on that page. The measurements below were taken on the group it replaced
(`1570:5962`, deleted 2026-08-24) and carried forward unchanged — the conventions did not move, only
the number of grids on the page.

## Law 1 — overlay in a GROUP, stack in auto-layout

The cell grid and the component set occupy the **same coordinates**: one draws the cell boundaries,
the other holds the variants. Only a GROUP allows that, because a group imposes no layout.
Auto-layout would stack them and the overlay would be impossible.

The inverse is equally load-bearing. The extension tables and the header **should** stack, so they
are children of the frame's VERTICAL auto-layout, not of the group.

> **Setting `x`/`y` on a child of an auto-layout frame is silently ignored.** The parent owns
> position. This looks exactly like a failed write — the node appears at some other coordinate and
> the call reports success. If a node will not go where you put it, check the parent's `layoutMode`
> before debugging anything else.

So: **overlay → group. stack → auto-layout.** Decide which one a node needs before creating it.

## Law 2 — cells must be whole pixels

A grid of `1084 × 474` over 5 × 4 gives cells of **216.8 × 118.5**. Nothing can share an edge with a
fractional band, so every row label sits a fraction out and the table looks subtly broken with no
obvious cause.

Size the grid so it divides exactly:

```
1100 / 5 = 220        480 / 4 = 120
```

Set the **component set and the overlay grid to the same figure**, then give each label the width or
height of the band it annotates:

| Label                                       | Dimension              |
| ------------------------------------------- | ---------------------- |
| Column group ("Variant")                    | full grid width — 1100 |
| Column label                                | one cell width — 220   |
| Row group ("Size: default") spanning 2 rows | 2 × cell height — 240  |
| Row label                                   | one cell height — 120  |

Assert it rather than eyeballing:

```js
grid.children.every((c) => Number.isInteger(c.width) && Number.isInteger(c.height));
```

## Law 3 — a GRID's cells are tracks, not nodes

You cannot stroke a cell of a `layoutMode: 'GRID'` frame, because the cell is a layout track. To get
per-cell strokes, put a real frame in each cell. Stroking the _frame_ instead is the workaround
people reach for, and it only ever draws the outer boundary.

## The grid API

Guessable in none of its parts. Figma's proxies do not enumerate methods, so `for (const k in node)`
finds none of this — it has to be probed by calling it.

```js
grid.layoutMode = 'GRID';
grid.gridRowCount = 4;
grid.gridColumnCount = 5;
grid.gridRowGap = 0;
grid.gridColumnGap = 0;
```

**Two placement modes, and they are not interchangeable:**

- **Explicitly positioned** — `child.setGridChildPosition(rowIndex, columnIndex)`. A method on the
  **child**, taking positional numbers. Calling it on the parent, or passing an options object,
  fails with the misleading `Property "rowIndex" failed validation: Expected number, received
object`.
- **Auto-positioned** — children fill cells in **append order, row-major**, and
  `setGridChildPosition` is _rejected_: `cannot set grid child position directly inside of a grid
with automatically positioned items`. Here the layer index IS the position.

A grid built by appending children lands in auto mode. Just append in order.

Other facts worth not rediscovering:

- `gridRowAnchorIndex` / `gridColumnAnchorIndex` are **read-only getters**.
  `gridRowSpan` / `gridColumnSpan` are plain **settable** properties.
- A GRID root stays at **100 × 100** until you set `layoutSizingHorizontal/Vertical = 'HUG'`
  **after** its children are placed.
- Cells and label frames need `FILL` on the track axis, or they hug their content and the dashed
  rectangles stop lining up into a grid.

## Measured values

Taken off the file's own property table (`89:3580` / `89:3581` on 🛠 Button), not invented.

| Thing             | Value                                                                                          |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| Annotation purple | `{ r: 0.592, g: 0.278, b: 1 }` — #9747FF                                                       |
| Cell stroke       | weight 1, `dashPattern: [10, 5]` (or `[6, 6]` on the newer grids), **`strokeAlign: 'CENTER'`** |
| Cell padding      | 24 all round, both align axes `CENTER`                                                         |
| Label text        | Inter Medium 12, purple                                                                        |
| Label frame       | `itemSpacing: 13`, padding 10, `primaryAxisAlignItems: 'MAX'`                                  |
| Bracket           | a VECTOR path, not a rotated rectangle                                                         |

**`strokeAlign` must be `CENTER`.** The default `INSIDE` draws each cell's line inside its own box,
so neighbours paint two lines a pixel apart and the grid reads as doubled. CENTER makes adjacent
cells share one line. This is the whole difference between "looks like Figma's table" and "looks
nearly like it".

Draw brackets as vectors — `M 0 14 L 0 0 L <len> 0 L <len> 14` horizontal, `M 14 0 L 0 0 L 0 <len>
L 14 <len>` vertical — and let them `FILL` their label so they span the band. `node.rotation` moves
the origin, so a rotated rectangle lands somewhere other than where you set `.x`/`.y`.

## Text sizing

A note or description inside an auto-layout parent needs the frame set to `FIXED` width **first**,
then the text to `FILL`. Do it the other way round and the single unwrapped line dictates the width —
a 1100-wide note becomes 1836 wide and drags the whole block with it.

```js
note.layoutSizingHorizontal = 'FIXED';
note.resize(grid.width, note.height);
t.textAutoResize = 'HEIGHT';
t.layoutSizingHorizontal = 'FILL';
note.layoutSizingVertical = 'HUG';
```

## Node ids are not stable

An undo, or a designer regrouping, gives nodes **new ids**. Button's description came back as
`1570:5965` after a rebuild, not the `1565:4287` it was created as.

Find nodes by **name, or by the text they carry** — never by an id you cached earlier in the
session:

```js
const labels = group.children.filter((n) => n.name === 'Label');
const textOf = (l) => {
  const t = l.findOne((n) => n.type === 'TEXT');
  return t ? t.characters : '';
};
const variantLabel = labels.find((l) => textOf(l) === 'Variant');
```

This is the same rule `.figma/README.md` states for the maps, and it holds for a single session too.
