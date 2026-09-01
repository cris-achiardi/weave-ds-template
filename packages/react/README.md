# `@ds/react`

The React **backend**. One of potentially several.

**It exports no components, and that is now permanent rather than a starting state.** A component is
generated into a consumer's own repository from a contract in `@ds/contracts`, and belongs to them
from that moment. This package holds the things that make that generation possible.

## What is here

| Path                                        | Holds                                                             | State     |
| ------------------------------------------- | ----------------------------------------------------------------- | --------- |
| [`bindings/`](./bindings/README.md)         | one React binding per contract, plus the schema governing them    | **empty** |
| [`src/emit/`](./src/emit/README.md)         | the emitter: contract + binding → component source                | **empty** |
| [`src/behavior/`](./src/behavior/README.md) | interaction primitives emitted components import                  | **empty** |
| `prop-bindings.json`                        | where React's idiom differs from the agnostic vocabulary          | **built** |
| [`scripts/`](./scripts/README.md)           | the machinery: contract composer, gates, generators, reports      | **built** |
| `src/index.ts`                              | the barrel — will export the behaviour runtime, currently nothing | stub      |

Three of those are empty. They hold their rules and their reasoning so that building them is
implementation rather than rediscovery, and each README says plainly what is decided versus what
works.

## The one place the "no runtime" rule bends

Emitted components **import** their interaction primitives from `src/behavior/` rather than having
them copied in. So this package will ship real JavaScript, and consumers will have a runtime
dependency on it.

```
what you can see, you own.             markup, structure, theme
what must be correct, you depend on.   focus, keyboard, selection
```

A roving-tabindex bug copied into two hundred repositories is two hundred fixes. The full argument,
including the honest objection to it, is in [`src/behavior/README.md`](./src/behavior/README.md).

No `./behavior` export subpath is declared yet, deliberately: an `exports` entry pointing at a file
that does not exist is a runtime failure that nothing in this repo would catch.

## Consuming it

Not yet possible. There is no CLI, no emitter and no primitive, so there is nothing to install and
nothing to generate. The intended shape:

```bash
npx @ds/react add Switch      # emits into the consumer's repo. Does not exist yet.
```

## Styling what it emits

Class names are hashed by CSS Modules and are not a public surface. Target the **part attributes** —
stable, semantic, and the thing the library actually promises:

```css
.myToolbar [data-ds-part='label'] {
  letter-spacing: 0.02em;
}
```

The library is **unstyled**. An emitted component arrives with a token-free `structure.css` that
holds the layout its contract's promises depend on, and an empty `theme.css` listing one commented
socket per unbound channel. Wiring those sockets to a token system is the consumer's job;
`@ds/tokens` is one worked example of doing it, not a dependency.

## Working on it

Read [`CLAUDE.md`](./CLAUDE.md) for library internals. The authoring contract split when this package
stopped holding components:

| You are about to                | Read                                                 |
| ------------------------------- | ---------------------------------------------------- |
| Author or change a contract     | `packages/contracts/components/README.md`            |
| Write or change the emitter     | [`src/emit/README.md`](./src/emit/README.md)         |
| Implement a behaviour primitive | [`src/behavior/README.md`](./src/behavior/README.md) |
| Write a React binding           | [`bindings/README.md`](./bindings/README.md)         |

## Known stale machinery

`scripts/` still assumes the old layout: `lib.mjs` treats a directory as a component only when it
holds `<Name>.tsx`, and `verify-contract.mjs` compares a contract's axes against `cva` axes in that
TSX. Both are harmless right now — there are zero components, so `verify:contract` falls through to
its one zero-component check, compiling the schemas — but neither will survive contact with a
generated component. Inverting them belongs with the emitter work.
