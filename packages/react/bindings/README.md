# `bindings/`

One binding per contract: the handful of facts that stop being true off React.

```
<Name>.react.json      governed by ./binding.schema.json
```

**This directory ships empty.** It fills as contracts get React backends, one file each.

## What a binding may hold

Four required fields (`component`, `contract`, `framework`, `element`) and six optional ones. That
is the whole surface, and the schema's own instruction is the important part:

> Keep it SMALL. If a field here would be equally true in React Native, it belongs in the contract
> instead.

| Field                  | Holds                                                                         |
| ---------------------- | ----------------------------------------------------------------------------- |
| `component`            | must match the contract's `component` and the file name                       |
| `contract`             | relative path to the contract this binds                                      |
| `framework`            | `"react"`, and only that                                                      |
| `element`              | the rendered root element                                                     |
| `elementByProp`        | prop value → element, for a polymorphic root                                  |
| `refTarget`            | which anatomy node the forwarded ref lands on                                 |
| `classNamePassthrough` | which anatomy node a consumer's `className` merges into                       |
| `propOverrides`        | axis → `{prop, reason}`. **A rename with no reason is drift with paperwork.** |
| `notes`                | prose for anything the fields above cannot carry                              |

A binding that grows past a handful of fields is usually a sign something agnostic leaked into it.
When that happens the fix is to move the fact into the contract, not to widen the schema.

## Why the schema lives here and not with the contracts

`binding.schema.json` contains `"framework": { "const": "react" }`. A schema that names a framework
is a framework artifact, so `@ds/contracts` may not hold it — that package's entire value is that
nothing in it knows what React is.

It was called `react-binding.schema.json` while it sat at the repo root next to the agnostic schema
and needed to distinguish itself. Inside `packages/react/bindings/` the prefix is redundant, so it
is just `binding.schema.json`.

## Known gap

`pnpm verify:contract` reads a binding's `contract` field but **never checks that it resolves to a
real file**. It finds the binding by filename convention instead. That was tolerable while contract
and binding sat in the same directory; now that they are in different packages, that field is the
only link between them, and an unchecked pointer is how a binding ends up describing a contract that
no longer exists.

Fixing it belongs with the emitter work, when there is a binding to check.
