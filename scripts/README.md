# `scripts/`

Repo-wide scripts — the ones that operate on the whole repository rather than on one package.

Package-specific machinery lives beside its package:
[`packages/react/scripts/`](../packages/react/scripts/README.md) holds the React contract gate.

Every script here is plain Node with no build step, run through a `pnpm` alias. Each one carries a
header comment saying **what it catches that nothing else would** — that is the test for whether it
earns a place in `pnpm verify`.

## What is here

| Script                                     | Command                                   | Kind      | What it is for                                                                                                    |
| ------------------------------------------ | ----------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------- |
| [`init-ds.mjs`](./init-ds.mjs)             | `pnpm init-ds <name> [--dry]`             | codemod   | Brand the template **once**: package scope, token prefix and data-attribute prefix together                       |
| [`verify-docs.mjs`](./verify-docs.mjs)     | `pnpm verify:docs`                        | **gate**  | Every link, path and `pnpm` command named in the docs resolves                                                    |
| [`adr-index.mjs`](./adr-index.mjs)         | `pnpm adr-index` / `pnpm adr-index:check` | generator | The ADR index, derived from the records themselves                                                                |
| [`verify-figma.mjs`](./verify-figma.mjs)   | `pnpm verify:figma`                       | **gate**  | `.figma/maps/*.json` validate against their schemas, and claim no code path they lack                             |
| [`verify-parity.mjs`](./verify-parity.mjs) | `pnpm verify:parity`                      | **gate**  | Backends have not drifted: no shared core copied back into one, barrels agree, bindings agree on the root element |

## The rule these follow

A gate belongs here when its breach **produces no error anywhere else**. A malformed `.figma` map
breaks no build. A link pointing at a deleted file renders fine. A missing ADR row leaves every tool
green. Three backends disagreeing about one contract leaves ALL THREE conformance suites green,
because each runs against its own copy. That invisibility is the entire justification — a check for something the compiler already
catches is noise.

The corollary, learned the expensive way: **a gate must run in CI, not only in `pnpm verify`.** A
contract enforced only by `verify` is enforced on whichever machine happens to run it. See
[`.github/workflows/`](../.github/workflows/README.md).

## `init-ds` is different, and runs once

It is a codemod, not a check. It rewrites the package scope (`@ds/*`), the CSS custom-property
prefix (`--ds-*`) and the data-attribute prefix (`data-ds-*`) **together**, because they are one
decision in three syntaxes. Renaming one by hand leaves a repo that builds green and is wrong.

`/ds.config.json` is the source of truth for that identity; `init-ds` rewrites it and every
reference to it. Run `--dry` first. CI runs the whole codemod on a matrix of names and asserts the
renamed repo is still green, so the rename cannot rot.

## Contract readers

`backends.mjs` registers the backends used by these readers and `verify:parity`.

- `pnpm contract Button`: the contract plus each backend's binding and derived public surface.
- `pnpm contract Button --backend vue --pretty`: one backend's props, slots, and model events.
- `pnpm contract --coverage`: bound, unbound, and orphan contracts for every backend.
- `pnpm prop-map`: a glossary attributed by backend, including model events and WC attributes.
  The JSON format is version 2 with a `backends` object; there is no ambiguous shared prop surface.
- `pnpm report:paints --backend react --theme apps/react-sandbox/src/components/Button/Button.theme.css`: compare declared
  policies against a consumer light-DOM theme. For a shadow stylesheet, also pass
  `--backend wc --component Button --theme <consumer-theme.css>`.

Paint findings remain advisory. Null channels are reported as unbound. A missing theme is
reported as not evaluated, and the report does not claim to resolve CSS cascade or computed values.
