# `extract/`

The three readers that answer **"what does this component actually do?"** from its TypeScript
source, without a build.

Everything in [`../`](../README.md) is built on these: the composer merges their output with the
authored contract, the gate compares their output against what the contract claims, and the prop
glossary is their output aggregated across components.

## The three

| Reader                     | Answers                                                         | Feeds                                       |
| -------------------------- | --------------------------------------------------------------- | ------------------------------------------- |
| [`props.mjs`](./props.mjs) | Prop names, types, value sets, required-ness, JSDoc             | the merged view, the prop glossary          |
| [`cva.mjs`](./cva.mjs)     | Variant axes and their **defaults**, read out of the `cva` call | contract parity — axes, values and defaults |
| [`parts.mjs`](./parts.mjs) | Which `data-ds-part` names the component actually renders       | contract parity — anatomy                   |

## Why syntax, not types

`cva.mjs` and `parts.mjs` read the **syntax tree** — `ts.createSourceFile`, no type checker, no
program, no build. That is a deliberate limit, not a shortcut: a full type program would need the
package to compile before any question could be answered, and the template must work on a fresh
clone with zero components.

The cost is real and worth knowing. Syntax reading sees what is _written_, so a variant axis built
by spreading a computed object, or a part name held in a variable, is invisible to it. Author
plainly — the authoring contract in
[`../../../contracts/components/README.md`](../../../contracts/components/README.md) exists partly to keep components
readable this way.

`props.mjs` is the exception: it uses `react-docgen-typescript`, which does run a type program. That
is why `typescript` is tilde-pinned in the root `package.json` — under a newer major it silently
stops classifying variant-derived props as enums and every value list comes back empty, with no
warning.

## The one thing to remember

**Defaults live in `cva`'s `defaultVariants`, and nowhere else a machine can see.** They are not in
the TypeScript type. That is why every axis must be a `cva` axis with a `defaultVariants` entry — a
bare union prop handled with a ternary is invisible here, and the contract gate cannot check what it
cannot read.
