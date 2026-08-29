# `packages/react/scripts/`

The library's machinery: everything that **reads component source**, composes an answer from it, or
checks a claim against it.

Repo-wide scripts live in [`scripts/`](../../../scripts/README.md). These are here because they all
depend on one thing — the TypeScript source of the components in
[`../src/components/`](../src/components/README.md) — and they read it **on demand, with no build
step**. That constraint is why the template is useful on a fresh clone with zero components.

## What is here

| Script                                         | Command                                 | Kind       | What it does                                                                    |
| ---------------------------------------------- | --------------------------------------- | ---------- | ------------------------------------------------------------------------------- |
| [`contract.mjs`](./contract.mjs)               | `pnpm contract <Name>`                  | composer   | Merges the authored contract with facts read from source — "what IS this thing" |
| [`verify-contract.mjs`](./verify-contract.mjs) | `pnpm verify:contract`                  | **gate**   | The contract and the implementation must agree; a disagreement fails the build  |
| [`build-prop-map.mjs`](./build-prop-map.mjs)   | `pnpm prop-map` / `pnpm prop-map:check` | generator  | The prop glossary in `.ai/maps/`, measured against the canon                    |
| [`report-paints.mjs`](./report-paints.mjs)     | `pnpm report:paints`                    | **report** | Declared token policy vs what the stylesheet actually does. Never fails         |
| [`lib.mjs`](./lib.mjs)                         | —                                       | shared     | Sorting, path helpers, and the merge behind `contract.mjs`                      |
| [`extract/`](./extract/README.md)              | —                                       | readers    | The three source readers everything above is built on                           |

## Gate, generator, report — the distinction matters

- A **gate** exits non-zero. It is reserved for a breach that produces no error anywhere else: a
  contract naming a part that never renders, an axis the code does not expose.
- A **generator** writes a file and offers `--check` to assert it is current. Never hand-edit its
  output; the check discards the edit and reddens the build.
- A **report** prints and always exits zero. `report:paints` is one because a token-policy finding
  needs a human judgement, and **a gate that fails on everything on day one gets switched off.**

## Why nothing here is committed output about a component

The source owns everything derivable — prop names, types, value sets, defaults, which parts render.
These scripts read it when asked rather than emitting a manifest, so those facts **cannot go stale**.
There is no generated component metadata to keep in step, and no build to run first.

The authored half — purpose, accessibility commitments, token policy, what a slot accepts — lives in
`<Name>.contract.json` beside the component. `contract.mjs` is what puts the two halves together;
reading either alone is misleading. See [`contracts/README.md`](../../../contracts/README.md).
