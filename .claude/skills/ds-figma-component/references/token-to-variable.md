# Token → Figma variable

How a `--ds-*` token in a component's CSS module becomes a binding in Figma, and what has no binding
at all.

Read `<Name>.module.css`. By the authoring contract it contains **tokens only** — every value
carrying design intent is `var(--ds-*)` — which is what makes this mapping mechanical rather than a
judgement call. A raw `#5146e6` or `12px` in there is a defect `pnpm report:paints` exists to find,
not a value for you to translate.

## The naming chain — and the part that is currently wrong

Three spellings of one path:

```
Figma variable        surface/primary
CSS custom property   --ds-surface-primary
DTCG token            surface.primary
```

`.figma/manifest.json` → `identity.variableNaming` is the record of this. **It does not currently
match the file.** Measured live on 2026-08-28:

|                        | Manifest says              | Actually measured      |
| ---------------------- | -------------------------- | ---------------------- |
| Variable name shape    | `weave-ds-surface-primary` | `surface/primary`      |
| Group separator        | `separatorUnknown: true`   | `/` — slash, confirmed |
| Prefix on the variable | `weave-ds-` infix present  | **no prefix at all**   |

Every one of the manifest's `observed` names carries a `weave-ds-` prefix and dashes; every real
variable in the file is a bare slash path. The prefix is almost certainly introduced downstream — it
is what Dev Mode emits, not what the variable is called — but **do not write that into the manifest
on my say-so.** Establishing where the prefix enters is a measurement someone has to make, and
recording which spelling the pipeline consumes is a `ds-decide` job.

What this means for you today: **look variables up by their slash path.** A lookup for
`weave-ds-surface-primary` returns `undefined`, and the temptation at that point is to fall back to a
literal. Don't.

## The two tiers, by name shape

Measured 2026-08-28. The tier is legible from the name, which is a good sign about the file:

| Tier      | Collection         | Name shape               | Examples                                                                                                                                          |
| --------- | ------------------ | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **token** | `Color Tokens`     | role path                | `brand/primary`, `text/primary`, `text/disabled`, `surface/primary`, `surface/overlay`, `border/primary`, `interactive/hover`, `control/waveform` |
| primitive | `Color Primitives` | `color/<family>/<step>`  | `color/purple/500`, `color/red/500`, `color/gray/900`, `color/pure/white`                                                                         |
| **token** | `Spacing Tokens`   | scale path               | `space/1`, `radius/m`, `border/thin`                                                                                                              |
| **token** | `Type Tokens`      | `<Group>/<Role>/<facet>` | `UI/Button/size`, `UI/Label/weight`, `Display/Heading/fontFamily`                                                                                 |
| primitive | `Type Primitives`  | scale path               | `font/size/xs`, `font/weight/medium`, `font/fontFamily/primary`                                                                                   |

**Bind to the token tier. Never to the primitive tier.** `brand/primary` is an alias onto
`color/purple/500`; binding the primitive directly gives you a component that keeps the colour when
the brand moves.

**Always scope the lookup by collection id.** Both `Color Tokens` and `Color Primitives` are colour
collections and the file is small enough today that names happen not to collide — that is luck, not
a guarantee, and it will stop being true the moment a colour ramp is seeded.

```js
const cols = await figma.variables.getLocalVariableCollectionsAsync();
const vars = await figma.variables.getLocalVariablesAsync();
const scoped = (colName) => {
  const id = (cols.find((c) => c.name === colName) || {}).id;
  return (n) => vars.find((v) => v.name === n && v.variableCollectionId === id);
};
const C = scoped('Color Tokens'); // never scoped('Color Primitives')
const SP = scoped('Spacing Tokens');
const TY = scoped('Type Tokens');
```

## There is no token set on the code side yet

`packages/tokens/tokens/` holds no DTCG source, and `identity.variableCollections` in the manifest —
the collection → token-file mapping — is **empty**. So the middle column of the naming chain above
does not exist yet.

Practically: you can bind a component to `surface/primary` today and it will work, but you cannot yet
say which `--ds-*` property that is, because nothing has generated one. Until the token set has been
measured, decided and built, **write the Figma variable name into the report and leave the
CSS column blank.** A blank is honest; a guessed `--ds-surface-primary` becomes the name everyone
copies.

## Traps this file has not hit yet, but the family is prone to

Recorded so they are recognised on sight rather than debugged from scratch.

**The bare-name trap.** In a mature DTCG set, a token with no suffix is the group's _default_, and
Figma spells that `/default` while CSS writes the bare group name — `--ds-border-radius` →
`border/radius/default`. Three spellings of one concept, and the most common cause of a lookup that
returns `undefined` for a token you can plainly see in the CSS. This file has no `/default` leaves
today; it will the moment the token set is generated.

**Compound group names keep their hyphen.** `max-width` is one group, not two levels:
`--ds-size-max-width-2xs` → `size/max-width/2xs`, never `size/max/width/2xs`. The swap-dashes-for-
slashes rule is a good default, not a law.

**A group can be split across collections.** A fully transparent colour is the same value in every
mode, so it may sensibly live outside the colour-scheme collection while its siblings stay in.
A scoped lookup that fails on a colour token is not always the bare-name trap — search unscoped
first to find where it actually lives, then scope to that:

```js
vars
  .filter((v) => v.name.includes('transparent'))
  .map((v) => byCol[v.variableCollectionId] + ' :: ' + v.name);
```

## How to bind each kind

**Colour** needs a placeholder paint on the node first, or the bind silently does nothing. Seed it
with the _resolved_ colour rather than an arbitrary one — see the instance-sublayer trap in
`SKILL.md`, which is what makes this more than a style preference:

```js
const v = C('surface/primary');
const r = v.resolveForConsumer(node);
let paint = { type: 'SOLID', color: r.value, opacity: 1 };
paint = figma.variables.setBoundVariableForPaint(paint, 'color', v);
node.fills = [paint];
```

**Numbers** — radius, spacing, sizes, border width — bind by field name:

```js
node.setBoundVariable('topLeftRadius', SP('radius/m'));
node.setBoundVariable('paddingLeft', SP('space/3'));
node.setBoundVariable('itemSpacing', SP('space/2'));
```

**Type** — apply the style, never set the fields:

```js
await textNode.setTextStyleIdAsync(textStyle.id);
```

All eight text styles in this file already bind `fontSize`, `fontFamily` and `fontWeight` to
variables, so the style carries the token linkage for you. Setting `fontName`/`fontSize` by hand
throws that away and produces a node that looks identical and follows nothing.

**Shadow** — **there is nothing to bind to.** The file has zero effect styles and zero paint styles
(measured 2026-08-28). A shadow you add is a literal. Annotate it as one per the honesty rule, or
leave it out and report that elevation has no token.

## What cannot bind

Report these every time. A baked literal nobody knows about is the failure this mapping exists to
prevent.

| Token / behaviour                                               | Why it can't bind                                                                                                                 | What to do                                                                                                                                                       |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `line-height`                                                   | A **unitless ratio** bound to `lineHeight` is read by Figma as **PIXELS** — 1.5 becomes 1.5px, silently, no error                 | Never bind it. Use a text style, which carries `{ value, unit: 'PERCENT' }` as a literal                                                                         |
| `letter-spacing`                                                | Same: the value is a percentage and a Figma FLOAT carries no unit                                                                 | Never bind it. The text style handles it                                                                                                                         |
| Component knobs (`--button-width`)                              | This repo's own override surface — unprefixed, undefined by default, declared in the contract as `component-property`. Not values | Never model them. They are not a Figma concept                                                                                                                   |
| `transition-*`, `animation-*`                                   | Figma has no animation model                                                                                                      | Skip. Note the intended duration in the report if it matters                                                                                                     |
| A composed recipe (focus ring: width + style + colour + offset) | Applied as one utility in CSS, has no single Figma counterpart                                                                    | Rebuild from its parts and bind each, or skip focus states unless asked                                                                                          |
| `color-mix()` / relative colour                                 | No token holds the resolved value                                                                                                 | **Compose, do not bake.** The inputs are both tokens — layer a bound rect over a bound fill and let Figma composite. Bake only after that fails, and annotate it |
| Elevation / shadow                                              | No effect styles exist in this file                                                                                               | Literal + annotation, or omit                                                                                                                                    |
| A prop that changes geometry                                    | A Figma **boolean** property can only show/hide a layer                                                                           | Needs its own variant axis. Every axis multiplies the whole set — quote the resulting count first                                                                |
| `:hover` / `:focus-visible` / `:active`                         | Runtime states the browser owns; not props in this repo                                                                           | Not variant values that map to props. A `State` axis is design-only and the description must say so                                                              |
| `disabled`                                                      | `opacity` on the host plus non-visual behaviour                                                                                   | Set the variant frame's opacity to match. But see the opacity note in `SKILL.md` — the 0–1 vs 0–100 convention is undecided here                                 |

### Overriding a composite's line-height detaches the style — but keeps its bindings

A single-line pill should hug its glyphs rather than carry a composite's leading, so a badge or chip
will apply a text style and then override `line-height`. Figma has no "style with one override": the
moment you set `lineHeight`, `textStyleId` goes empty.

What survives is the part that matters — the style's variable bindings are **copied onto the node**:

```js
await t.setTextStyleIdAsync(style.id); // linked
t.lineHeight = { unit: 'PERCENT', value: 100 };
// textStyleId: ''  — but boundVariables still holds fontSize / fontFamily / fontWeight
```

So the type still follows its tokens; only the _named_ link is lost. **Prefer the correct geometry.**
A badge 39% too tall is a defect a designer will measure against; a missing style name is a caveat
you can annotate.

**`PERCENT 100` is the right spelling of `line-height: 1`** — relative to font size, so it still
scales. Never a PIXELS literal.

This is the _inverse_ of the `lineHeight` trap above, and both bite the same property: never **bind**
a unitless ratio, but **do** set it as a PERCENT literal when the component overrides the composite.

## Verify, don't count

`setBoundVariable` and `setBoundVariableForPaint` can succeed without throwing while producing the
wrong value. A report of "41 bound, 0 failed" proves only that nothing threw.

Inherited from the system this skill was ported from, and directly relevant here: text styles bound
`fontFamily` cleanly and rendered as a font literally named `"String value"` — the binding was fine,
and the _variable_ was holding Figma's placeholder for a STRING created without a value. Two dozen
variables were in that state and every apply had reported success.

This file has STRING variables of exactly that kind (`font/fontFamily/primary`,
`UI/Button/fontFamily`, and seven more). Check their values before trusting a type binding.

**This file makes verification harder, not easier.** With a single mode, a bound value and a baked
literal render identically — there is no flip that separates them. Reading the node back is not one
option among several; it is the only check available:

```js
node.boundVariables; // what is actually attached
v.resolveForConsumer(node); // what it actually resolves to
```

Counting is not checking. Screenshot as well, and remember that re-exporting the same node id can
return a cached image — capture a different node to force a fresh render.
