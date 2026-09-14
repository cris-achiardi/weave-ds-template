# `@ds/vue`

**The second backend.** Vue bindings, a Vue emitter, and the interaction primitives emitted
components import. It ships **no components**, exactly as [`@ds/react`](../react/README.md) ships
none — a component is generated from a contract into a consumer's own repository.

## Why this package exists, and what it is for

Not to support Vue. To find out whether [`@ds/contracts`](../contracts/README.md) is a
specification or one framework wearing a specification's clothes.

[ADR 0002](../../docs/ADR/0002-agnostic-contracts-live-in-their-own-package.md) is held at **Draft**
for exactly this reason, and states the test in one sentence:

> The proof is a second backend, and it is a specific test, not a feeling: a compiler for another
> target reads the same contracts and the same conformance definitions, and changes NOTHING inside
> `@ds/contracts` to do it.

This package is that compiler. What it found is in
[`docs/research/0004`](../../docs/research/0004-a-second-backend-reading-the-same-contracts.md).
The short version: fifteen contracts compiled, nothing in `@ds/contracts` changed, and nothing in
[`@ds/platform-web`](../platform-web/README.md) changed either.

That record's own table is also honest about what this does **not** prove. Vue is a web framework
with a virtual DOM, a cascade and a document, so it falsifies _"the prop and event model is React's
idiom in disguise"_ and nothing more. Several things that read as agnostic still are not — the
emitter produces two **stylesheets**, and there is no stylesheet in Flutter.

## What is here

| Path                                         | Holds                                                   |
| -------------------------------------------- | ------------------------------------------------------- |
| [`bindings/`](./bindings/README.md)          | one binding per contract, and the schema governing them |
| [`prop-bindings.json`](./prop-bindings.json) | where Vue's idiom differs from the agnostic prop canon  |
| [`src/emit/`](./src/emit/README.md)          | the emitter, and the rules its output must honour       |
| [`src/behavior/`](./src/behavior/README.md)  | the interaction primitives, and the ones duplicated     |
| `src/index.ts`                               | a deliberately empty barrel — see the file              |

## The three places it diverges from `@ds/react`

Everything else is the same component compiled twice. These are the differences, and each is a
framework fact the contract deliberately does not state.

**1. A `shared` state is one declaration, not three props.** `defineModel` declares the prop and the
`update:` event together and returns a writable ref, so `control: shared` costs one line here and
three props in React. React's `defaultChecked` exists only because React has no two-way binding: it
is a workaround for a missing language feature, not a fact about the state. This is the clearest
evidence the contract stayed agnostic — the same sentence buys one prop or three.

**2. A named slot is a slot, not a prop.** React types `composition.slots` as `ReactNode` props; Vue
declares them with `defineSlots` and fills them with `<template #name>`. The contract said _slot_,
and that one word is what left both backends room.

**3. Reactive inputs are getters.** Every primitive in `src/behavior/` takes `() => value` where the
React hook takes `value`. React re-runs the component function and closes over fresh values; Vue's
setup runs once, so a plain boolean would be frozen at mount — and nothing would report it.

## What Vue supplies that React does not

Recorded because each one is a React binding field with no counterpart here, and a reader comparing
the two directories will otherwise read the absence as an omission.

| React must state it    | Vue does it                                          |
| ---------------------- | ---------------------------------------------------- |
| `classNamePassthrough` | attribute fallthrough merges `class` onto the root   |
| `refTarget`            | a single-root component exposes its element as `$el` |

The emitter turns fallthrough **off** anyway (`inheritAttrs: false`) and binds `$attrs` explicitly
first, because Vue's default drops unrecognised attributes on the root _after_ the element's own
bindings — which would let a consumer replace `role`, `type` or `id` from outside. See
[`src/emit/README.md`](./src/emit/README.md) §4.

## Commands

```bash
node packages/vue/src/emit/emit.mjs <Name> --out <dir>   # compile one contract
pnpm dev:vue                                             # the Vue sandbox at :4301
pnpm build:vue                                           # the package
pnpm verify:parity                                       # the two-backend gate
```

`pnpm dev` and `pnpm dev:vue` run at `:4300` and `:4301` and are meant to be open at once. That
comparison is the experiment.
