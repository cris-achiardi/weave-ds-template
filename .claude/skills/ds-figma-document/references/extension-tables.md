# Extension tables

A small table of **instances** beside the component, showing something the component set
deliberately does not contain.

## Why they exist

Every variant axis multiplies the whole set. A 5-variant × 2-size set is 10 members; adding
`iconOnly` makes 20, adding `disabled` makes 40, adding a 5-value State axis makes 200. Most of those
combinations nobody ever browses, and the set gets slower to load and harder to read for each one.

So: **an axis is for things a consumer picks. An extension table is for everything else.**

The file already works this way — the original `Button` keeps icon-only as its own component set
rather than a fifth axis.

## The test

> Would modelling this as a variant axis multiply the whole set?

If yes, it is an extension table. In practice that means:

| Belongs in an extension table            | Why                                               |
| ---------------------------------------- | ------------------------------------------------- |
| Boolean properties (slot before / after) | Show/hide, not a variant                          |
| `disabled`                               | Opacity on the host — would double the set        |
| `hover`, `pressed`, `focus`              | Runtime states the browser owns; not props at all |
| Density / theme demonstrations           | A mode flip, not a variant                        |

A Figma **boolean property can only show or hide a layer**. Anything that changes geometry, radius
or colour cannot be a boolean and would have to be an axis — which is exactly when you reach for a
table instead.

## The conventions

Measured off the file's existing extension cells, not invented.

| Thing       | Value                                                                                   |
| ----------- | --------------------------------------------------------------------------------------- |
| Cell fill   | annotation purple at **3% opacity** — `{ type: 'SOLID', color: PURPLE, opacity: 0.03 }` |
| Cell stroke | same purple, weight 1, dash `[6, 6]`, `strokeAlign: 'CENTER'`                           |
| Instances   | **`instance.locked = true`**                                                            |
| Cell size   | the same whole-pixel cell as the component grid — 220 × 120                             |

The tint says _documentation, not the component_. The lock stops a designer dragging a specimen out
of the board while trying to select the frame behind it.

## Build it as one self-contained block

The page frame is VERTICAL auto-layout and owns position, so a block has to be a single child:

```
ext: <Name>                    HORIZONTAL, counterAxisAlignItems: 'MAX'
├── row labels                 VERTICAL — a spacer matching the column-label strip, then one per row
└── stack                      VERTICAL
    ├── column labels          HORIZONTAL — one per column
    ├── table                  GRID of tinted cells, each holding a locked instance
    └── note                   only when something is baked — see below
```

`counterAxisAlignItems: 'MAX'` on the outer row is what keeps the side label aligned to the table
rather than to the column-label strip above it.

## States: compose them, don't measure them

> **Superseded 2026-08-24.** This section used to say a `color-mix()` state had to be measured in a
> browser and baked as a literal. That was wrong, and it produced a Button board whose primary hover
> was a colour the component never renders. **Build states from their bound inputs instead** — the
> recipe is `ds-figma-component/references/wrapper-pattern.md`.
>
> The reasoning that misled: no token holds the _result_ of `color-mix(in oklab, fill, highlight
20%)`, so nothing can bind it. True, and irrelevant. The CSS is not computing an opaque colour —
> it is **compositing a highlight over a fill**, and both of those ARE tokens. A bound rect over a
> bound fill reaches the same place and keeps following the theme. `node.opacity` and paint colour
> both accept bound variables.
>
> What you give up is exact equality: the browser blends in oklab, Figma in sRGB. On Button that is
> within 1/255 for primary and secondary and about 4% on danger. Live-but-approximate beats
> exact-but-frozen, because a frozen value goes wrong silently the moment anyone flips a mode.
>
> Measuring is still the right tool for **checking** what you built, and for the rare value that
> genuinely has no bindable inputs. Keep reading for how.

Resolve in a headless browser against the shipped stylesheet, then read the colour back through a
canvas: `color-mix(in oklab, …)` computes to an `oklab()` value, and Figma stores sRGB.

```js
const srgb = (expr) => {
  probe.style.backgroundColor = expr;
  ctx.fillStyle = getComputedStyle(probe).backgroundColor;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data; // forces sRGB bytes
  return { r, g, b, a: a / 255 };
};
```

**Read the per-variant rules before applying anything uniformly.** On Button, three variants take the
mix, and two do not:

- `primary` / `secondary` / `danger` — mix the interaction highlight into the fill.
- `outlined` — mixes over _transparent_ (a translucent white) **and** moves its border from
  `border-weak` to `border`.
- `ghost` — does **not** mix at all. Hover keeps a transparent fill and only darkens the label;
  pressed is transparent too.

Applying the mix to all five would have invented a ghost hover that does not exist. Reading
`<name>.css` is what catches this; nothing about the token names would.

**Verify a measurement before trusting it.** The 2026-08-20 pass recorded `secondary #a286ff` and
`danger #f96b60`, both exactly right, alongside `primary #32312f` — a near-black where the true
answer is `#a49d98`. Mixing a near-white highlight into a fill can only _lighten_ it, so a darker
result is arithmetically impossible and should have failed a sanity check. Two correct values either
side made the third look trustworthy. Ask which direction the mix must move before recording it.

Figma has no `outline`, and an outline sits _outside_ the border box. In a documentation table a
dashed stroke on a wrapper padded by the outline offset is fine. **In a variant it is not** — the
wrapper makes the focused variant physically larger than its siblings, so the control jumps size on
selection. There, use an absolutely-positioned rect inset past the frame with `clipsContent = false`.

## The honesty rule

A baked literal must be annotated **on the artefact**, not only in the commit message — _once you
have established it has to be baked at all._ Reach for the note only after the compose route above
has failed.

Put a note row under the table naming which cells are literals, which mode they were measured in,
that they will not follow a mode flip, and what they were measured against. Button's note read:

> … fills are BAKED LITERALS, light scheme only … these cells will not follow a colour-scheme flip.
> Measured against `dist/css/tokens.css`.

It was accurate, prominent, and still not enough — it could not reveal that one of the literals it
was vouching for was simply wrong. **A note buys disclosure, not correctness.** That asymmetry is
the argument for binding wherever binding is possible.

A designer reading the board in six months will not read the commit. They will assume the cells
follow the theme, and they will be wrong. A literal nobody knows about is the exact failure this
whole mapping exists to prevent.

Record the method in `.figma/maps/components.json` alongside the values, so the next person can
re-measure rather than trust. Where states are composed rather than baked, record the token each one
binds instead — Button's entry uses `stateConstruction` for this.
