# Property check

The pass that finds the bugs. A set almost always looks right at its defaults; it breaks on the
third value of the second axis, and nothing but driving it will show you.

Do this **before** reporting, every time.

## 1. Drive every property

Instantiate the set on a scratch frame and walk every value of every axis.

```js
const set = figma.currentPage.findOne((n) => n.type === 'COMPONENT_SET' && n.name === 'Button');
const defs = set.componentPropertyDefinitions;
// Return the SHAPE, not the whole object — preferredValues on a swap is tens of KB
const axes = Object.entries(defs).map(([k, d]) => ({
  prop: k,
  type: d.type,
  values: d.variantOptions ?? null,
}));

const inst = set.defaultVariant.createInstance();
frame.appendChild(inst);
inst.setProperties({ Variant: 'danger', Size: 'sm' });
```

Cover, at minimum:

- **Every value of every variant axis** — not just the defaults.
- **Both states of every boolean.** A boolean that shows a layer which was never built fails silently
  and looks identical to one that works.
- **The longest realistic text** in any text property. Truncation and overflow only appear here.
- **One combination per pair of axes.** Full cross-product is usually too many; one representative
  per pair catches the interactions that matter.

## Choosing cases

Prefer values that differ _structurally_, not just in colour. `Size=sm` vs `Size=lg` exercises
padding, height and type together; `Variant=primary` vs `Variant=secondary` usually only swaps two
fills. If you have budget for five instances, spend them on the axes that change geometry.

## 2. Screenshot it

`figma_capture_screenshot` — it exports through the plugin and reflects live state.
`figma_take_screenshot` takes the REST path and 403s without `FIGMA_ACCESS_TOKEN`.

Look for, specifically:

- Text stacked one character per line, or collapsed to a sliver (both are sizing bugs — see
  `generation-recipe.md`).
- A variant whose height differs from its siblings when it shouldn't.
- Anything still black or white that should be token-coloured — an unbound fill.
- Icons rendering black — recolouring stopped before the `VECTOR`.

## 3. Audit the bindings

Counting is not checking. `setBoundVariable` succeeds without throwing while producing wrong values,
and this repo has already been bitten: 41 text styles reported "bound", and four rendered a font
named `"String value"` because the _variable_ held a placeholder.

So read values back:

```js
const unbound = [];
const walk = (n) => {
  const bv = n.boundVariables || {};
  if (n.fills && n.fills.length && n.fills[0].type === 'SOLID' && !bv.fills)
    unbound.push(`${n.name}: fill`);
  if (n.type === 'TEXT' && !n.textStyleId) unbound.push(`${n.name}: no text style`);
  if (n.children) n.children.forEach(walk);
};
walk(inst);
return { unbound };
```

Anything in `unbound` is either a deliberate literal you must report, or a miss.

## 4. Flip a mode — CANNOT RUN HERE YET

The whole point of binding to the token tier is that the component follows the axes. Normally you
prove it by flipping a mode on the frame, capturing, and flipping back:

```js
frame.setExplicitVariableModeForCollection(colorSchemeCollection, otherModeId);
// ... capture ...
frame.clearExplicitVariableModeForCollection(colorSchemeCollection);
```

A set that ignores a mode flip is the single most common serious defect, because it looks perfect in
the default and is wrong everywhere else.

**Every collection in this file has exactly one mode** (measured 2026-08-28, see `figma-file.md`).
There is no light/dark, density or shape axis to flip, so this check has no target.

Two things follow, and neither is optional:

1. **Say in the report that this check did not run.** Not "passed", not silence. A reader who cannot
   tell a skipped check from a passing one will trust the set further than the evidence supports.
2. **Substitute the only check that still works: read the bindings back.** With one mode, a bound
   value and a baked literal render identically — inspection is the sole way to separate them.

```js
// per node, on a driven instance
node.boundVariables; // what is actually attached, by field
variable.resolveForConsumer(node); // what it actually resolves to
```

Restore this section to a real gate the moment a second mode exists. It is the strongest check in
the workflow and the template is currently running without it.

## 5. Keep the frame

Leave the driven instances on the page in a named frame (`Button — property check`). It is the
evidence for the report, and the next person to change the set gets a before/after for free.

## What this catches

In practice: unbuilt boolean layers, one variant that hugs where its siblings are fixed, text that
overflows at realistic lengths, fills left as literals, and components bound to `Color Primitives`
because a lookup wasn't scoped by collection — which carries no role and will not follow the token
layer when it moves.
