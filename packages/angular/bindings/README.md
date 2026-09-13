# `bindings/`

One binding per contract: the handful of facts that stop being true off Angular.

```
<Name>.angular.json      governed by ./binding.schema.json
```

## What a binding may hold

Four required fields (`component`, `contract`, `framework`, `element`) and two optional ones. This
is the **smallest of the three binding schemas**, and the reason is structural rather than
incidental.

| Field           | Holds                                                                         |
| --------------- | ----------------------------------------------------------------------------- |
| `component`     | must match the contract's `component` and the file name                       |
| `contract`      | relative path to the contract this binds                                      |
| `framework`     | `"angular"`, and only that                                                    |
| `element`       | the element the component **attaches to**                                     |
| `propOverrides` | axis → `{prop, reason}`. **A rename with no reason is drift with paperwork.** |
| `notes`         | prose for anything the fields above cannot carry                              |

## `element` becomes a selector, not markup

```
element: "button", component: "Switch"   ->   selector: 'button[dsSwitch]'
                                         ->   a consumer writes <button dsSwitch>
```

An Angular component does not render its root element; it attaches to one chosen by its selector.
Everything React records about what happens to that root — `refTarget`, `classNamePassthrough` — is
either automatic here or does not apply, and Vue's `exposes` has no counterpart either.

**There is no `elementByProp`.** An Angular selector is fixed at declaration, so a root element that
changes with a prop cannot be expressed at all. The emitter refuses such a contract rather than
rendering a wrapper element and pretending: a wrapper is a different DOM, and the contract's
`semantics.role` would land on the wrong node. Two components with two selectors is the Angular
answer, and that is a contract decision rather than something an emitter may invent.

## `element` is duplicated across three backends on purpose

All fifteen values here are identical to the fifteen in `packages/react/bindings/` and
`packages/vue/bindings/`. That is a measurement, not a coincidence: **which element carries a role
is web-platform knowledge**, and by the rule [`@ds/platform-web`](../../platform-web/README.md)
states it belongs in the platform package rather than in any binding directory.

It is duplicated anyway, and **not moved**, because the point of building more backends was to
measure what one costs.
[`docs/research/0005`](../../../docs/research/0005-a-third-backend-and-what-only-it-could-find.md)
reports it; moving it is a separate commit with its own diff.

Until then the duplication is **gated**, not trusted: `pnpm verify:parity` fails when two bindings
disagree about one contract's root element. Three backends rendering a `<div>` where another renders
a `<button>` from one contract would break no build and pass every test.

## Why the schema lives here and not with the contracts

`binding.schema.json` contains `"framework": { "const": "angular" }`. A schema that names a
framework is a framework artifact, so `@ds/contracts` may not hold it — that package's entire value
is that nothing in it knows what Angular, Vue or React is.
