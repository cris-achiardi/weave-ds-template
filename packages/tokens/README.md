# @ds/tokens

DTCG JSON in, CSS custom properties and TypeScript constants out.

**154 tokens across 6 files**, transcribed from the design source on 2026-08-29 — one file per
Figma collection. The source of truth is the JSON under [`tokens/`](./tokens/), not Figma: no
build reads the design file, so a fresh clone builds every token with no plugin and no API key.
The decision and what it costs — chiefly that **nothing detects drift from Figma** — is
[ADR 0002](../../docs/ADR/0002-token-source-of-truth-is-dtcg-json-transcribed-per-figma-collection.md).

The build still runs green on an empty token directory, emitting an empty `:root {}` and saying
so. That remains a valid state, not an error.

## Where things are documented

Each fact lives in exactly one authoritative place. Go there rather than trusting a restatement.

| You want                                                 | Look at                                                                                                                         |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| How to name a token, and the tier it belongs to          | [`tokens/README.md`](./tokens/README.md)                                                                                        |
| How a Figma variable becomes a token                     | [`tokens/README.md`](./tokens/README.md) §3, and `.figma/manifest.json → identity.variableNaming` for the measured mapping rule |
| How tokens become pixels in a component                  | `packages/react/src/components/README.md` §4                                                                                    |
| Why the contract states a token _family_ and not a value | `contracts/README.md`, and `packages/react/src/components/README.md` §4                                                         |
| The custom-property prefix                               | `/ds.config.json` — never hard-code it                                                                                          |

## Commands

```bash
pnpm build:tokens     # DTCG JSON -> build/css/variables.css + build/ts/index.{js,d.ts}
pnpm tokens:watch     # same, in watch mode, while editing token JSON
```

## Outputs

| File                               | What it is                                                                                |
| ---------------------------------- | ----------------------------------------------------------------------------------------- |
| `build/css/variables.css`          | Every token as a CSS custom property on `:root`. **This is the file a consumer imports.** |
| `build/ts/index.js` + `index.d.ts` | The same tokens as a typed constant map, for the cases where JS needs a token name.       |

Everything under `build/` is **generated and gitignored**. Never hand-edit it; edit the JSON and
rebuild. A generated file that someone has edited is worse than no generated file, because the
next build silently discards the edit.

## Consuming it

If you use the components, you need **one** import — `@ds/react/styles.css` already carries the
token layer ahead of the component rules, because `@ds/react`'s barrel imports this package. That
is [ADR 0003](../../docs/ADR/0003-library-stylesheet-carries-the-token-layer.md), and the reason is
that an undeclared custom property makes a CSS declaration invalid at computed-value time: the rule
is dropped with no console error, no build error, and no failing test.

```ts
import '@ds/react/styles.css'; // tokens + components, in that order
```

Import this package directly only when you want the token layer **without** the components — an
app styling its own surfaces against the same system:

```ts
import '@ds/tokens/css'; // once, at the app root
```

The prefix comes from `/ds.config.json`, so after `pnpm init-ds weave` the properties would be
`--weave-*` and this package `@weave/tokens`. That codemod has **not** been run: this repo is
deliberately still on the generic `ds` prefix.
