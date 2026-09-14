# `bindings/`

One binding per contract: the handful of facts that stop being true off this backend.

```
<Name>.wc.json      governed by ./binding.schema.json
```

## What a binding may hold

| Field            | Holds                                                                          |
| ---------------- | ------------------------------------------------------------------------------ |
| `component`      | must match the contract's `component` and the file name                        |
| `contract`       | relative path to the contract this binds                                       |
| `framework`      | `"wc"`, and only that                                                          |
| `element`        | the element rendered as `part="root"` **inside** the shadow root               |
| `delegatesFocus` | override for the shadow-root option; omitted means derive it from the contract |
| `propOverrides`  | axis → `{prop, reason}`. **A rename with no reason is drift with paperwork.**  |
| `notes`          | prose for anything the fields above cannot carry                               |

There is no framework to describe, which is the point of the backend. What is left is a question
about the web platform that no contract states.

## `element` answers a question about the shadow tree

The other three bindings use `element` to say what a consumer writes or what a selector attaches to.
Here the host is always `<ds-name>`, and `element` names what lives **inside** it:

```
element: "button", component: "Switch"   ->   <ds-switch>  hosting  <button part="root">
```

The field is kept, rather than dropped as "the host is the component", because the contract's
`semantics.role` has to land on something real. A custom element carries **no implicit role, no
native focus, no native `disabled` and no form participation** — `@ds/platform-web` records all four
as facts about the element the contract named, and a host that replaced it would be compiling a
different component.

There is no `elementByProp`, for the opposite reason to Angular's: nothing here forbids it, no
contract exercises it, and a field invented ahead of a case that needs it is a guess.

## `delegatesFocus` is the first binding field that is a platform feature

React's binding carries `refTarget` and says outright:

> React has no delegatesFocus, so this is the equivalent load-bearing fact.

Here it is not an equivalent. It is the thing itself — a shadow-root option that forwards focus
landing on the host to the first focusable node inside. Every binding omits it, because the
contract's `semantics.focusable` already answers it; the field exists for the case where a contract
is overridden, and `notes` must then say why.

## `element` is duplicated across four backends on purpose

All fifteen values here are identical to the fifteen in `packages/react/bindings/`,
`packages/vue/bindings/` and `packages/angular/bindings/`. Which element carries a role is
web-platform knowledge, and by [`@ds/platform-web`](../../platform-web/README.md)'s own rule it
belongs there.

It is gated rather than moved: `pnpm verify:parity` fails when the four disagree. The reason it has
not moved is now visible in this directory — **a shadow-DOM backend has a host tag AND an internal
element**, so a shared per-component map would have to hold two answers where the other three hold
one. That shape is only obvious now that something has been built against it.

## Why the schema lives here and not with the contracts

`binding.schema.json` contains `"framework": { "const": "wc" }`. A schema that names a backend is a
backend artifact, so `@ds/contracts` may not hold it.
