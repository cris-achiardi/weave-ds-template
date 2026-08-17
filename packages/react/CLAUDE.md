# CLAUDE.md — `@ds/react`

**The authority for library internals.** The root `CLAUDE.md` covers the monorepo, the token
pipeline and the governance layer; this file covers authoring components and the contract system.
Where the two disagree, this one wins for anything under `packages/react/`.

## Commands

```bash
pnpm contract <Name>       # compose one component's merged view. No build needed.
pnpm contract --coverage   # who is contracted and who is not
pnpm verify:contract       # the contract gate (also in CI)
pnpm prop-map              # regenerate the prop glossary
pnpm prop-map:check        # assert it is current + no stale disposition (also in CI)
pnpm report:paints         # token policy vs stylesheet — REPORT, never a gate
pnpm build:react           # Vite lib mode -> ESM + CJS + .d.ts + one stylesheet
pnpm typecheck
```

Which of those are gates and which are reports is not a detail — see [Enforcement](#enforcement).

## A component is described in two halves, and neither is complete alone

**The source owns everything derivable** — prop names, types, value sets, defaults, required-ness,
JSDoc, and the inventory of parts and states rendered. It is read on demand; nothing is committed,
and nothing needs building first.

**The contract (`<Name>.contract.json`, [ADR 0001](../../docs/ADR/0001-component-contracts-carry-what-the-source-cannot.md))
owns only what the source cannot state** — the rendered element, ARIA role, where the ref lands,
which node absorbs `className`, accessibility commitments, what a slot accepts, lifecycle status,
and the token policy per node.

**Read them merged:** `pnpm contract Button`. Reading either alone is misleading.

**Restating a derivable fact in a contract is a defect, not redundancy.** `pnpm verify:contract`
enforces the mechanical part of that: a contract cannot name a part the TSX never renders, a state
nothing can enter, or a prop value that was never in the axis.

Components without a contract are **reported, not failed**. Backfilling is deliberate work.

## Before adding a prop, read the prop map

[`.ai/maps/prop-map.md`](../../.ai/maps/prop-map.md) §1 is the axis registry. Reuse an axis and its
canonical values instead of coining a synonym. The canon is
[`prop-map.config.json`](./prop-map.config.json) (data) and
[`src/components/README.md`](./src/components/README.md) §2 (prose); the map measures reality
against it and **flags rather than blocks**, so nobody is stopped — which means somebody has to
look.

## The three invariants

Everything above depends on these. They are stated with their reasons in
[`src/components/README.md`](./src/components/README.md) §3 and §5; in short:

1. A named node carries `data-ds-part="x"` **and** `className={styles.x}`, same name.
2. Every variant axis is a `cva` axis with a `defaultVariants` entry.
3. No generic wrapper around a variant type.

## Extraction, and the one thing that can quietly break it

The derived half comes from a hybrid reader in `scripts/extract/`:

| File        | Owns                               | Why                                                                                     |
| ----------- | ---------------------------------- | --------------------------------------------------------------------------------------- |
| `cva.mjs`   | variant axes, values, **defaults** | Syntax only, no type checker. The sole source for `defaultVariants`, and version-proof. |
| `props.mjs` | everything else, plus prose        | Follows imports and `extends` across files, which syntax cannot.                        |
| `parts.mjs` | rendered parts and states          | Replaces a generated manifest's inventory.                                              |

**`typescript` is tilde-pinned in the root `package.json` on purpose.** Measured: under
`typescript@6.0.3`, `react-docgen-typescript` stops classifying `VariantProps`-derived props as
enums — value arrays come back empty and only a union string survives. Its peer range is
`>= 4.3.x`, so nothing warns you. `props.mjs` recovers the values from the union string and flags
`degraded: true`, so a bad bump is visible instead of silently thinning every answer. **Read the
extraction warnings before trusting a thin-looking result.**

## Build output

Vite lib mode emits ESM + CJS + `.d.ts`, and **one prebuilt stylesheet** rather than runtime
`<style>` injection.

That is a deliberate consumer-facing choice: a downstream app may be an Electron renderer under a
CSP with no remote origins, whose bundler has a single global `.css` rule and no CSS-Modules
setup. A prebuilt stylesheet imports cleanly there; runtime injection and shipped `*.module.css`
do not. `package.json` keeps both a legacy `main`/`types` pair and an `exports` map for the same
reason — a consumer on classic Node resolution ignores `exports` entirely.

## Enforcement

| Runs                 | Gate or report | Catches                                                                  |
| -------------------- | -------------- | ------------------------------------------------------------------------ |
| `verify:contract`    | **gate**       | a contract that is illegal, invented, or contradicts the source          |
| `prop-map:check`     | **gate**       | a stale glossary or a disposition naming something that no longer exists |
| `typecheck`, `build` | **gate**       | the ordinary things                                                      |
| `report:paints`      | report         | a declaration that does not satisfy its declared token policy            |
| contract coverage    | report         | uncontracted components                                                  |
| extraction warnings  | report         | a prop the reader could not fully resolve                                |

Two rules behind that split, both worth internalising:

- **A contract whose breach produces no build error has to be gated in CI, not only in
  `pnpm verify`** — otherwise it is enforced on whichever machine happens to run verify.
- **A gate that fails on everything on day one gets switched off, and a switched-off gate protects
  nothing.** That is why missing contracts and paint findings report rather than fail.
