# Design system starter template

A React design-system monorepo that ships **the machinery, and no components**.

Token pipeline, component contract system, prop glossary, Figma wiring, ADR governance, agent
skills and CI — all working, all empty. You add the components.

## Why it is empty

Because a component is the _last_ step, not the first.

Most design systems get built by drawing a button, then arguing about what it should have been. The
arc this template is built for runs the other way:

> **explore → report → decide → build**

You read the design source and write down what is measurably there. That report raises questions.
The questions become decisions with their reasoning attached. The component is built against a
decision that already exists — and the machinery checks that it was.

A template that shipped a Button would skip all four steps and teach the opposite lesson.

## Quick start

```bash
pnpm install
pnpm init-ds <yourname>    # brand it: @ds/* -> @yourname/*, --ds-* -> --yourname-*
pnpm install               # workspace links move with the scope
pnpm verify                # every gate, green, on an empty repo
pnpm dev                   # sandbox at localhost:4300
```

`pnpm init-ds` runs **once**, before any components exist. Try `--dry` first to see what moves.

## What is in the box

|                   |                                                                                |
| ----------------- | ------------------------------------------------------------------------------ |
| `packages/tokens` | DTCG JSON → CSS custom properties + typed constants, via Style Dictionary      |
| `packages/react`  | The library. React 19, CSS Modules, CVA. Empty.                                |
| `apps/sandbox`    | A one-page Vite harness pointed at component source. Boots in ~1s.             |
| `apps/storybook`  | Complete on disk, deliberately **not installed** — one line to switch on       |
| `docs/ADR`        | Decision records. One — how the repo is organised. The rest are yours          |
| `docs/research`   | Pre-decision space: what is measurably true, ending in open questions          |
| `.ai/maps`        | The prop glossary. Generated, descriptive, CI-gated. Useful while still empty. |
| `.figma`          | Which design file we read, how names map, what has been reconciled             |
| `.claude/skills`  | `ds-decide`, `ds-component`, and three that write to Figma. Exploring is yours |

## The idea worth stealing

**A component is described in two halves, and neither is complete alone.**

The **source** already knows the derivable things — prop names, types, value sets, defaults, which
parts render. Those are read on demand, so they cannot drift.

The **contract** (`<Name>.contract.json`) holds only what the source cannot state: what element
actually renders, where the forwarded ref lands, what a slot accepts, the accessibility
commitments, and **which family of token is allowed to paint which channel of which node**.

```bash
pnpm contract Button    # the two halves, merged, in well under a second — no build
```

Restating a derivable fact in the contract is a _defect_, not redundancy — **except where a gate
asserts the two are equal.** That exception is deliberate and narrow: the contract does specify the
axes, their values and their defaults, because a file that omitted them could never be the thing you
build _from_. `pnpm verify:contract` then asserts they match the code, and a disagreement fails the
build. Everywhere a check is impossible — purpose, accessibility, token policy — the fact is stated
once and reviewed by a person.

The gate also enforces the plain half: a contract cannot name a part that never renders, a state
nothing can enter, or a prop value that was never in the axis.

See [`contracts/README.md`](./contracts/README.md) for where the line falls, and what the gate costs
you if it is ever switched off.

## New here? Start with the illustrated version

**[`docs/documentation/`](./docs/documentation/)** explains the whole system in plain language,
with diagrams, for people who do not read code. Six short pages: what this is, the two halves of a
component, naming its pieces, which token paints what, the shared vocabulary, and how a Figma file
becomes a component.

## Working in it

- **[`CLAUDE.md`](./CLAUDE.md)** — the entry map. Start here.
- **[`packages/react/CLAUDE.md`](./packages/react/CLAUDE.md)** — library internals.
- **[`packages/react/src/components/README.md`](./packages/react/src/components/README.md)** — the
  authoring contract. The most important document in the repo if you are writing a component.

Everything is documented next to the thing it governs. Each README is an index for its own
territory; follow the pointer rather than reading everything at once.

## Requirements

Node ≥ 20, pnpm 10. `typescript` is tilde-pinned deliberately — the reason is in the `//typescript`
comment in `package.json`, and it is not cosmetic: widening it silently thins every contract answer
without any warning.
