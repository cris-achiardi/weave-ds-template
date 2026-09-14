# `@ds/emit-web`

**What every backend that emits components into an HTML document shares, and nothing that assumes a
framework.** Two halves, and they answer different questions:

| Subpath                                   | Holds                                                                              |
| ----------------------------------------- | ---------------------------------------------------------------------------------- |
| [`@ds/emit-web/contract`](./contract.mjs) | reading a contract: `loadPair`, `partsOf`, `memberFacts`, `camel`/`pascal`/`kebab` |
| [`@ds/emit-web/css`](./css.mjs)           | writing the two stylesheets: `emitStructure`, `emitTheme`, `stateSelector`         |

## Why it exists

Every function here was written once in the React emitter and **copied**, unchanged, into the Vue
and Angular ones. There was never anything framework-specific to remove — one half reads JSON, the
other emits CSS, and neither knows what a component function is.

The copies were kept deliberately while a second and third backend were built, for the reason
[`@ds/behavior`](../behavior/README.md) gives at length: sharing code before you have measured what
a backend costs destroys the measurement. That measurement is in
[`docs/research/0004`](../../docs/research/0004-a-second-backend-reading-the-same-contracts.md) and
[`0005`](../../docs/research/0005-a-third-backend-and-what-only-it-could-find.md).

**The proof the move was faithful:** after it, all three backends emit **byte-identical**
`structure.css` for all fifteen contracts, and the only change to committed output across 38 files
was one comment line pointing here.

## Where this package stops: the shadow boundary

**Every selector in `css.mjs` is a light-DOM descendant selector over data attributes.**

```css
[data-ds-component='Button'] [data-ds-part='label'] { … }
```

A descendant selector cannot cross a shadow boundary. A backend that puts its parts inside a shadow
root needs a different grammar for the same contract:

```css
:host([data-ds-hierarchy='primary']) { … }
::part(label) { … }
```

That is not a different value in the same rule — it is a different rule. **Whether it becomes a
parameter on these functions or a second module beside them is not decided here**, because nothing
has built it yet and a shape invented for a backend that does not exist is a guess. It is written
down so the first person to hit it knows it was expected rather than missed.

Note what does **not** break at that boundary: CSS custom properties inherit into a shadow root, so
`--ds-*` tokens reach inside untouched. It is only the part and state selectors that stop.

## Why not `@ds/platform-web`

That package's own boundary says it **describes the platform, never a component**. These functions
take a contract and a component name; they are one layer up. `platform-web` is a dependency here —
`stateSelector` asks it which pseudo-class or ARIA attribute carries a state — and that direction is
the right one.

## Why `assume` is a parameter

`emitStructure` records two things it could not derive: that there is no structural CSS to emit, and
that the component-scoping attribute is an invention. It does not print them. Each emitter passes in
its own recorder, so the assumptions appear in that backend's run, in its own list, and the three
lists stay comparable — which is the mechanism
[`docs/research/0005`](../../docs/research/0005-a-third-backend-and-what-only-it-could-find.md) uses
to tell a contract gap from a backend invention.

## What is deliberately NOT here

**The bindings' `element` field**, duplicated fifteen times per backend. It is web-platform knowledge
sitting in a framework artifact and it fits this package's description exactly — but a shadow-DOM
backend introduces a **host tag** alongside the internal element, and a shared map designed before
anyone has seen that shape is a guess. `pnpm verify:parity` gates the duplication meanwhile.
