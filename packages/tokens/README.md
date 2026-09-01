# @ds/tokens

DTCG JSON in, CSS custom properties and TypeScript constants out.

**This package ships with no tokens.** That is the intended starting state — the token set is
measured from the design source by hand, reviewed, and committed as JSON. Until then the build
emits an empty `:root {}` and says so.

## Where things are documented

Each fact lives in exactly one authoritative place. Go there rather than trusting a restatement.

| You want                                                 | Look at                                                                                                                         |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| How to name a token, and the tier it belongs to          | [`tokens/README.md`](./tokens/README.md)                                                                                        |
| How a Figma variable becomes a token                     | [`tokens/README.md`](./tokens/README.md) §3, and `.figma/manifest.json → identity.variableNaming` for the measured mapping rule |
| How tokens become pixels in a component                  | `packages/contracts/components/README.md` §4                                                                                    |
| Why the contract states a token _family_ and not a value | `packages/contracts/schema/README.md`, and `packages/contracts/components/README.md` §4                                         |
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

```ts
import '@ds/tokens/css'; // once, at the app root — @ds/react's barrel already does this
```

The prefix comes from `/ds.config.json`, so after `pnpm init-ds weave` the properties are
`--weave-*` and this package is `@weave/tokens`.
