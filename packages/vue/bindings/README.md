# `bindings/`

One binding per contract: the handful of facts that stop being true off Vue.

```
<Name>.vue.json      governed by ./binding.schema.json
```

## What a binding may hold

Four required fields (`component`, `contract`, `framework`, `element`) and four optional ones. The
schema's own instruction is the important part:

> Keep it SMALL. If a field here would be equally true in React, it belongs in `@ds/platform-web`
> or in the contract instead.

| Field           | Holds                                                                         |
| --------------- | ----------------------------------------------------------------------------- |
| `component`     | must match the contract's `component` and the file name                       |
| `contract`      | relative path to the contract this binds                                      |
| `framework`     | `"vue"`, and only that                                                        |
| `element`       | the rendered root element                                                     |
| `elementByProp` | prop value → element, for a polymorphic root                                  |
| `exposes`       | anatomy nodes published through `defineExpose` **beyond the root**            |
| `propOverrides` | axis → `{prop, reason}`. **A rename with no reason is drift with paperwork.** |
| `notes`         | prose for anything the fields above cannot carry                              |

## It is smaller than the React binding, and the two missing fields are the finding

[`packages/react/bindings/`](../../react/bindings/README.md) has `refTarget` and
`classNamePassthrough`. This directory has neither, and that is not an oversight:

- **`classNamePassthrough`** records which node a consumer's `className` merges into. Vue merges
  `class` onto the root through attribute fallthrough, so there is nothing to choose and nothing to
  record.
- **`refTarget`** records where a forwarded ref lands, because React has no `delegatesFocus` and a
  consumer calling `.focus()` on the wrong node has no way to discover it except by trying. Vue
  exposes a single-root component's element as `$el`.

`exposes` replaces neither. It exists for the case a consumer must reach a node _further in_ than
the root — and nothing needs it yet, so every binding omits it. An empty field that is honest about
being unexercised beats a field invented to mirror React's.

## `element` is duplicated across the two backends on purpose

All fifteen `element` values here are identical to the fifteen in `packages/react/bindings/`. That
is a measurement, not a coincidence: **which element carries a role is web-platform knowledge**, and
by the rule [`@ds/platform-web`](../../platform-web/README.md) states —

> If it would still be true in a Vue, Svelte or Lit backend rendering the same DOM, it belongs here

— it belongs in the platform package rather than in either binding directory.

It is duplicated anyway, and **not moved**, because the point of building a second backend was to
measure what one costs. Moving shared data into the platform layer while building the thing that
proves it is shared destroys the measurement.
[`docs/research/0004`](../../../docs/research/0004-a-second-backend-reading-the-same-contracts.md)
reports it; moving it is a separate commit with its own diff.

Until then the duplication is **gated**, not trusted: `pnpm verify:parity` fails when two bindings
disagree about one contract's root element. Two backends rendering a `<div>` and a `<button>` from
one contract would break no build and pass every test, which is precisely the category this repo
gates in CI.

## Why the schema lives here and not with the contracts

`binding.schema.json` contains `"framework": { "const": "vue" }`. A schema that names a framework is
a framework artifact, so `@ds/contracts` may not hold it — that package's entire value is that
nothing in it knows what Vue or React is.
