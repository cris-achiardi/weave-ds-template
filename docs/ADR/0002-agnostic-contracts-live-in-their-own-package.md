# ADR 0002 — Agnostic contracts live in their own package, not at the repo root

- **Status:** Accepted
- **Date:** 2026-09-01
- **Deciders:** cris
- **Tags:** packaging, governance, components
- **Related:** [ADR 0001 — Every layer is self-describing, and context is pulled rather than pushed](./0001-every-layer-is-self-describing.md)

## Context

The component contract system shipped with its two schemas at the repo root, in `contracts/`, and
its per-component instances inside `packages/react/src/components/<Name>/`. The root README stated
the reason for the first half plainly:

> They live here — at the repo root, outside every package — because the first one belongs to no
> framework. Putting it inside `packages/react/` would have quietly made it a React artifact, and
> the whole point is that it is not.

That reasoning is correct and is not in dispute. What changed is what the contract is _for_.

The library is moving to contract-driven generation: the contract becomes the artifact that ships,
and component source is generated from it into a consumer's own repository. A specification that
consumers and multiple framework backends resolve, version and depend on has requirements that a
root-level directory cannot meet — it has no name, no version, no `exports` map, and no way to be
depended upon except by relative path.

The same README anticipated the structural half of this:

> The contract sits next to the React implementation today because there is only one. A second
> framework would move it up and leave a binding in each package — which is a rearrangement, not a
> rewrite, and that is the point of separating them now.

The tension: root-level placement was chosen _because_ it belonged to no framework, and the obvious
reading of "make it a package" is a reversal of that. It is not. The original decision protected a
**reason** (agnosticism) using the only **mechanism** available at the time (colocation outside every
package). A dedicated agnostic package serves the same reason strictly better, because it makes the
agnosticism enforceable at a package boundary rather than by convention about a directory.

## Decision

1. **Agnostic contracts and the schema governing them live in `packages/contracts` (`@ds/contracts`).**
   `contracts/` at the repo root is removed.
2. **Framework-specific artifacts live in that framework's own package** — including the schema that
   governs its bindings. `react-binding.schema.json` moved to `packages/react/bindings/binding.schema.json`,
   because a schema containing `"framework": {"const": "react"}` is a React artifact.
3. **Nothing in `@ds/contracts` may name a framework.** Not an element name, not a hook, not a ref,
   not `className`, not an import form. The existing test still decides every case: _if it would
   still be true in React Native, it belongs in the contract._
4. **The agnostic prop vocabulary lives with the contracts; each framework's spelling of it lives
   with that framework.** `prop-canon.json` in `@ds/contracts` holds axis names, canonical values and
   the anti-synonym glossary; `prop-bindings.json` in each framework package holds only the places
   that framework's idiom differs.
5. **Adding a framework must not require a change inside `@ds/contracts`.** A new backend is a new
   `packages/<framework>/` with its own bindings, emitter and prop-binding table. This binds future
   work: a change that can only be made by editing the contracts package to accommodate one
   framework is evidence the split has been breached, and the fix is to move the fact out, not to
   widen the schema.

## Contract

| Concern                                        | Where                                                                              |
| ---------------------------------------------- | ---------------------------------------------------------------------------------- |
| What a contract is, and what may never enter   | `packages/contracts/README.md`                                                     |
| What a contract may contain                    | `packages/contracts/components/README.md`                                          |
| The agnostic schema                            | `packages/contracts/schema/component.schema.json`                                  |
| Why the schema specifies rather than describes | `packages/contracts/schema/README.md`                                              |
| The agnostic prop vocabulary                   | `packages/contracts/prop-canon.json`                                               |
| The React binding schema and its rules         | `packages/react/bindings/README.md`                                                |
| Where React's idiom differs from the canon     | `packages/react/prop-bindings.json`                                                |
| Enforcement                                    | `packages/react/scripts/verify-contract.mjs` (`pnpm verify:contract`, gated in CI) |
| Pointer integrity                              | `scripts/verify-docs.mjs` (`pnpm verify:docs`, gated in CI)                        |

## Consequences

**Positive**

- Agnosticism is enforceable at a package boundary rather than by convention. "Does this belong in
  the contract?" becomes "would this compile without React installed?"
- The specification is resolvable, versionable and publishable. It can be depended on, and a
  consumer can hold a contract set without holding a framework backend.
- The prop canon split falls out cleanly: the vocabulary is agnostic, the spelling is not, and they
  were previously conflated in one file inside the React package.
- The migration was mechanically enumerated rather than guessed. `pnpm verify:docs` reported 26 stale
  pointers across 15 files and each was fixed against a list, which is the behaviour ADR 0001 was
  written to produce.

**Negative / trade-offs**

- **Every new directory costs a document, and this move added six.** ADR 0001 made entry-doc coverage
  a gate; three of the new READMEs describe folders that are currently empty, so they must be written
  to say what is target and what is built, and kept honest as that changes.
- **A package must be wired by hand.** There is no turbo or nx, and the root `build` and `typecheck`
  scripts name their packages literally. `@ds/contracts` needs no build today, so it is wired into
  nothing — which means the day it _does_ need one, nothing will remind anybody.
- **It forecloses reading a contract beside its implementation.** The two are now in different
  packages, and `pnpm contract <Name>` composes a view across a package boundary. Diffing a contract
  against the code it governs is a directory further apart than it was.
- **How this will fail quietly, and it already can:**
  - `verify-contract.mjs` reads a binding's `contract` field but never checks that it resolves.
    While the two files were siblings that was tolerable; now that they are in different packages
    that field is the only link between them, and a binding pointing at a contract that moved or was
    deleted leaves every gate green.
  - `lib.mjs` still counts a directory as a component only when it holds `<Name>.tsx`. A contract
    with no TSX beside it — which is now every contract that will ever be written — is invisible to
    every script. `pnpm contract --coverage` will report `0/0 components contracted` and look
    perfectly healthy while the contracts package fills up.
  - The parity check that gives the whole contract system its safety compares a contract's axes
    against `cva` axes in a TSX. With component source generated rather than written, that
    comparison is circular. It is harmless today only because there are zero components, and the
    schema README says so out loud precisely so it is not discovered later as a surprise.

## Alternatives considered

**Keep the schemas at the repo root and add per-component contracts beside them.** Preserves the
original decision verbatim and needs no ADR. Rejected because a root directory cannot be resolved,
versioned or published, and the contract set is the thing this library intends to ship. The
agnosticism it protected is better protected by a package boundary than by a directory convention.

**Put contracts inside each framework package.** Rejected for the original reason, which has not
weakened: a contract inside `packages/react/` is a React artifact no matter what its README claims,
and the second backend would have to either duplicate it or reach across into a sibling package.

**Name the package for the brand — `packages/weave`.** Rejected on mechanics. `pnpm init-ds` rewrites
the `@ds/` scope, the `--ds-` token prefix and the `data-ds-` attribute prefix, but it cannot rewrite
a directory name, and the CI straggler grep that catches a half-renamed repo would not catch it
either. The brand arrives through the scope; the directory stays generic.
