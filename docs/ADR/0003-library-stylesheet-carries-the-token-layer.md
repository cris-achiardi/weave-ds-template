# ADR 0003 — The library stylesheet carries the token layer, so component CSS cannot resolve against undeclared properties

- **Status:** Accepted
- **Date:** 2026-08-29
- **Deciders:** cris
- **Tags:** tokens, components, packaging
- **Related:** [ADR 0002 — Token source of truth is DTCG JSON](./0002-token-source-of-truth-is-dtcg-json-transcribed-per-figma-collection.md)

## Context

Components are authored as CSS Modules and read tokens as custom properties —
`color: var(--ds-text-primary)`. The library build emits a single stylesheet
(`cssCodeSplit: false` in `packages/react/vite.config.ts`, deliberately, so a consumer under a
strict CSP gets a prebuilt file rather than runtime `<style>` injection).

The failure this decision exists to prevent is specific and silent. **A custom property that was
never declared makes the whole declaration invalid at computed-value time**: the browser drops the
rule. There is no console error, no build error, and no failing test. A component renders
unstyled, and the only symptom is that it looks wrong.

Before this decision the two stylesheets were separate and nothing connected them —
`packages/react/src/index.ts` was `export {}`. `packages/tokens/README.md` nonetheless told
consumers that "`@ds/react`'s barrel already does this". **That claim was false**, which is how the
silent failure would have reached the first person to use the library: they would have followed
correct-looking documentation and got unstyled components.

## Decision

1. `packages/react/src/index.ts` imports `@ds/tokens/css` as its **first statement**, before any
   component export.
2. `@ds/react/styles.css` is therefore **self-sufficient**: one import gives a consumer the token
   declarations and the component rules, with tokens first by construction.
3. `@ds/tokens/css` **remains separately exported**, for a consumer who wants the token layer
   without the components — an app styling its own surfaces against the same system.

## Contract

| Concern                | Where                                                               |
| ---------------------- | ------------------------------------------------------------------- |
| The import             | `packages/react/src/index.ts`                                       |
| Single-stylesheet emit | `packages/react/vite.config.ts` (`cssCodeSplit: false`)             |
| Published entry points | `packages/react/package.json` → `exports["./styles.css"]`           |
| Token layer            | `packages/tokens/build/css/variables.css` (generated, see ADR 0002) |
| Enforcement            | `pnpm verify` (`build`), gated in CI                                |

## Consequences

**Positive**

- The silent-unstyled failure cannot happen by forgetting a second import, because there is no
  second import to forget.
- Token declarations precede every component rule in the emitted file by construction, not by
  the consumer getting import order right.
- The documentation in `packages/tokens/README.md` is now true. It was not before.

**Negative / trade-offs**

- **The token layer is duplicated** for a consumer who imports both `@ds/react/styles.css` and
  `@ds/tokens/css`. The declarations are identical so nothing breaks, but it is wasted bytes and
  two `:root` blocks in devtools, which reads as a bug to whoever finds it.
- **A consumer cannot swap the token layer without rebuilding `@ds/react`.** Tokens are inlined at
  library build time, not resolved at app build time.
- **This decision has to be revisited when a second theme lands.**
  `packages/tokens/tokens/README.md` §5 models themes as one file per axis composed as classes;
  that is still possible here, but the baseline layer is now welded into the component stylesheet
  rather than being a swappable peer. Do not add a theme without re-opening this record.
- `@ds/tokens` is now a **build-time dependency** of `@ds/react`. `pnpm build:react` on its own,
  on a fresh clone, fails until `pnpm build:tokens` has run once — because `build/` is gitignored.
  `pnpm build` orders them correctly, so `pnpm verify` is unaffected, but the standalone script is
  a trap for anyone who reaches for it directly.

## Alternatives considered

**Keep the stylesheets separate and fix the documentation instead** — tell consumers to import
both. Rejected on failure mode, not on elegance: forgetting one import produces no error anywhere,
and the person who forgets is by definition the person who has not read the docs carefully. A
decision that relies on documentation being followed to avoid a silent failure is not a decision.

**Have the barrel import tokens but mark them external**, so the consumer's bundler resolves
`@ds/tokens/css` at app build time and can substitute a themed build. This keeps swappability and
removes the duplication. Rejected for now because it reintroduces the "forgot to install the token
package" failure in a new place and needs the consumer's bundler to handle a CSS import from a
dependency's CSS — which is exactly the setup the `cssCodeSplit: false` comment says not to rely
on. Revisit alongside theming.
