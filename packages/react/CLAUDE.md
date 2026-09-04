# CLAUDE.md — `@ds/react`

**The authority for library internals.** The root `CLAUDE.md` covers the monorepo, the token
pipeline and the governance layer; this file covers authoring components and the contract system.
Where the two disagree, this one wins for anything under `packages/react/`.

> [!IMPORTANT]
>
> **Mid-migration. This file describes machinery that still works and a flow that has been
> reversed.** Read it for how the scripts behave today; do not read it as the plan.
>
> This package no longer holds components — `src/components/` is gone, and the barrel exports
> nothing. The library is becoming contract-driven: a contract in `packages/contracts/components/`
> is the source, and component code is generated from it into a consumer's own repository.
>
> What is still accurate below: every command, the build-output reasoning, and the gate/report
> split. Those describe code that exists and runs. The extraction readers do not — they were
> deleted, and the section on them now records why.
>
> What has reversed: **"the source owns everything derivable"**. With no source to derive from, the
> contract must carry the props, and the parity check that compares a contract's axes against `cva`
> axes in a TSX becomes circular. It is harmless today only because there are zero components for
> it to compare. `packages/contracts/schema/README.md` carries the full argument.
>
> New territory has its own docs: [`README.md`](./README.md) routes to the emitter rules, the
> behaviour primitives and the bindings.

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

**The contract (`<Name>.contract.json`, agnostic) plus its React binding (`<Name>.react.json`) owns
what the source cannot state** — the rendered element, ARIA role, where the ref lands, which node
absorbs `className`, accessibility commitments, what a slot accepts, lifecycle status, and the token
policy per node. The full reasoning, and the line between the two files, is in `packages/contracts/schema/README.md`.

**Read them merged:** `pnpm contract Button`. Reading either alone is misleading.

**Restating a derivable fact in a contract is a defect, not redundancy — _except where a gate
asserts equality._** That exception is not a loophole; it is the whole reason the contract is
buildable-from:

- **The contract DOES specify the axes it exposes**, with their value subsets and defaults, in
  canonical vocabulary from the prop map. Those are derivable facts, deliberately duplicated.
- **`verify:contract` asserts they match the implementation** — every declared axis exists, the
  value sets agree, the defaults agree, and no axis exists in code that the contract failed to
  declare. A disagreement fails the build.
- **Everywhere a check is impossible, the no-restating rule still holds in full:** purpose,
  accessibility commitments and token policy are stated once and reviewed by a person, because
  there is nothing to compare them against.

So the test is not "is this derivable?" but **"is this checked?"** A file that omitted the axes
could only ever annotate something that already exists, which is backwards for a system whose
premise is that a component is produced _from_ contracts.

`pnpm verify:contract` also enforces the plain half: a contract cannot name a part the TSX never
renders, a state nothing can enter, or a prop value that was never in the axis.

Components without a contract are **reported, not failed**. Backfilling is deliberate work.

## Before adding a prop, read the prop map

[`.ai/maps/prop-map.md`](../../.ai/maps/prop-map.md) §1 is the axis registry. Reuse an axis and its
canonical values instead of coining a synonym. The canon is
[`packages/contracts/prop-canon.json`](../contracts/prop-canon.json) (data) and
[`packages/contracts/components/README.md`](../contracts/components/README.md) §2 (prose); the map measures reality
against it and **flags rather than blocks**, so nobody is stopped — which means somebody has to
look.

## The three invariants

Everything above depends on these. They are stated with their reasons in
[`packages/contracts/components/README.md`](../contracts/components/README.md) §3 and §5; in short:

1. A named node carries `data-ds-part="x"` **and** `className={styles.x}`, same name.
2. Every variant axis is a `cva` axis with a `defaultVariants` entry.
3. No generic wrapper around a variant type.

## Extraction is gone, and why it is not coming back

`scripts/extract/` held three readers that pulled prop types, `cva` axes and rendered parts out of
hand-written TSX. **Deleted 2026-09-03**, along with its `react-docgen-typescript` dependency.

It went because it had become unreachable rather than merely unused. Components are generated from
contracts into a consumer's repository, so there is no hand-written source here to read — and the
check it existed to serve, comparing a contract's axes against the code, is **circular** once the
code is derived from the contract. Repointing the prop map at the contracts removed its last
importer, and a file-scoped lint finds an unused import but never an orphaned module.

The cost of leaving it was concrete, not tidiness: `typescript` was tilde-pinned for the whole
monorepo solely to protect that one library from a silent regression, so **dead code was holding the
toolchain version hostage.** The pin is still there and its note now says the reason is gone.

The one use that would justify bringing it back: a consumer who HAND-EDITS their generated
components and wants drift against the contract detected. That is speculative, nobody does it, and
git has the code.

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

Two rules behind that split, both worth internalising:

- **A contract whose breach produces no build error has to be gated in CI, not only in
  `pnpm verify`** — otherwise it is enforced on whichever machine happens to run verify.
- **A gate that fails on everything on day one gets switched off, and a switched-off gate protects
  nothing.** That is why missing contracts and paint findings report rather than fail.
