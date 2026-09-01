# `@ds/contracts`

**The product.** A component contract is the agnostic specification a component is _generated from_ —
not a description of one that already exists.

Nothing framework-shaped may enter this package. No element names, no hooks, no refs, no `className`,
no import syntax. The test is one question, inherited from the directory this package replaced:

> **If it would still be true in React Native, it belongs here.**

Nothing with a token value or a colour may enter either. This library is **unstyled**: a contract
names the visual channels a part paints and leaves the source unbound, so a consumer wires their own
token system into it. See [`components/README.md`](./components/README.md) §3.

## What is here

| Path                           | Holds                                                                        | State     |
| ------------------------------ | ---------------------------------------------------------------------------- | --------- |
| [`schema/`](./schema/)         | the schemas a contract is validated against                                  | **built** |
| [`components/`](./components/) | one directory per contract, each with its own changelog                      | **empty** |
| `prop-canon.json`              | the agnostic vocabulary: axis names, canonical values, anti-synonym glossary | **built** |

`components/` ships empty, and that is the design rather than an unfinished state — the same way
`packages/react` ships with no components. A contract is written against evidence and an accepted
decision, never scaffolded in advance.

## Read this when

| You are about to                      | Read                                                                      |
| ------------------------------------- | ------------------------------------------------------------------------- |
| Author or change a contract           | [`components/README.md`](./components/README.md) — the authoring contract |
| Understand a schema field             | [`schema/README.md`](./schema/README.md)                                  |
| Name a prop, an axis or a value       | `prop-canon.json`, then `.ai/maps/prop-map.md` §1–2 for what is measured  |
| Decide agnostic vs framework-specific | this file's opening rule, then `packages/react/bindings/README.md`        |

## How this relates to its neighbours

```
@ds/contracts          the specification.        Agnostic. Versioned. The thing that ships.
   |
   v
packages/react/        one backend. Holds the React binding per contract, the emitter,
                       and the behaviour primitives emitted code imports.
   |
   v
consumer's repo        generated component source. Theirs to own, theirs to style.

@ds/tokens             a REFERENCE IMPLEMENTATION of wiring tokens to a contract's unbound
                       channels. One worked example, not a dependency of anything here.
```

A second framework is a new `packages/<framework>/` holding its own bindings, emitter and
prop-binding table. **Nothing in this package changes when one is added** — that is the whole point
of the split, and the only real test of whether it worked.

## Not built yet

This package is currently the schemas and the vocabulary. Stated plainly because a document that
describes an intention in the present tense is how a repo starts lying about itself:

- **No loader.** There is no `.` export and no `toIR()`. `pnpm verify:contract` reads the schema by
  path, not by package specifier.
- **No `props` in the schema.** Under the flow this package replaces, props were derived from the
  TypeScript source and the contract deliberately never restated them. A contract that is generated
  _from_ cannot borrow that, so the schema needs a `props` block it does not yet have.
- **No `layout` block, and `paints` cannot yet be `null`.** Both are required by the unstyled
  policy and neither is in the schema.
- **No behaviour vocabulary.** The interaction schema that would carry one does not exist.

Those four changes are earned by evidence, not designed in advance: the next step is drafting a
handful of real contracts and reporting where the schema falls short. See `docs/research/README.md`
for the shape that report takes.
