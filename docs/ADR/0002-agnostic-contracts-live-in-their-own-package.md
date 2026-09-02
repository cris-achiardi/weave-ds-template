# ADR 0002 — Agnostic contracts live in their own package, not at the repo root

- **Status:** Draft
- **Date:** 2026-09-01
- **Revised:** 2026-09-02 — returned to Draft. The split is real on disk; what it EXISTS to prove
  is not proven, and cannot be by one backend. A third package category was then found and added.
  See "Why this is still Draft".
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

## Why this is still Draft

Everything in the decision above is on disk and gated. It is held at Draft anyway, because a
packaging boundary is not the point — **it is a mechanism for a claim, and the claim is untested.**

The claim is that a component contract is a source of truth that many backends can compile. Today
exactly one does: a React emitter, into a sandbox, on the web. One backend cannot demonstrate
agnosticism, because nothing distinguishes "this contract is framework-neutral" from "this contract
happens to suit the only compiler that has ever read it." Every field in the schema was added
because a React emitter needed it, and that is precisely the bias the package boundary is meant to
catch and currently cannot.

**The proof is a second backend, and it is a specific test, not a feeling:** a compiler for another
target reads the same contracts and the same conformance definitions, and changes NOTHING inside
`@ds/contracts` to do it. Decision 5 already states this as a rule for future work; until something
exercises it, the rule has never been tried.

The targets that would actually test it are deliberately unlike each other, because a second web
framework would prove much less than it appears to:

| Target                | What it would falsify                                                         |
| --------------------- | ----------------------------------------------------------------------------- |
| Vue, Angular, Svelte  | that the prop and event model is React's idiom wearing agnostic clothing      |
| Web components        | that the contract assumes a virtual DOM and a component-function render model |
| React Native, Flutter | that the contract assumes CSS, a cascade, and a document at all               |

The third row is the sharp one. Several things that read as agnostic today are not: ADR 0003's
decision 5 says the emitter produces two **stylesheets**, and there is no stylesheet in Flutter.
That is a backend's answer to an agnostic question — how a paint channel is delivered — recorded as
though it were the answer.

**Emitters are recipes, not a fixed set.** The intent is that this repo ships a core contract set and
a handful of worked emitters, and that a consumer can write their own for a target or a styling model
nobody here anticipated: Tailwind classes rather than custom properties, NativeWind, a token system
that emits JavaScript objects or platform declarations instead of CSS. That is not a stretch goal
bolted on afterwards — it is the reason ADR 0003 leaves a paint's source unbound, and the reason a
token pipeline built on Style Dictionary sits in this repo rather than a hardcoded set of variables.

### A third category, found by looking

This decision names two kinds of thing: agnostic contracts, and framework-specific backends. **There
is a third, and it was hiding inside the React emitter.**

A survey found 13 lookup tables there, of which exactly 2 were React — the ones mapping an element
to its React typings. The other eleven were WEB PLATFORM knowledge: which ARIA attribute a state maps
to, which roles accept it, which elements have a native `disabled`, which are focusable. Every web
backend needs all eleven; no Flutter or React Native backend needs any of them.

That is neither agnostic nor framework-specific, so this record's two boxes had nowhere to put it and
it ended up in a React file by default. It now lives in `@ds/platform-web` (2026-09-02), and the
decision above is amended by extension rather than contradiction:

- Decision 3 still holds unchanged. The web profile could not enter `@ds/contracts` precisely
  because it is element names and ARIA attributes, and would fail the React Native test on every
  line. That test did its job.
- Decision 5 — _adding a framework must not require a change inside `@ds/contracts`_ — now has a
  sibling: **adding a web framework must not require a change inside `@ds/platform-web` either.** A
  change that can only be made by editing the profile to suit one framework is the same evidence of
  a breached split, and the same fix applies: move the fact out.

**This is evidence for the Draft status rather than against it.** The category was not predicted; it
was found by asking what a second backend would actually need, which is the same question this record
cannot yet answer. A third missing category may be found the same way.

This record moves to Accepted when a second backend has been built and neither the contracts package
nor the web profile had to change to accommodate it.

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
| The web platform layer, and its boundary       | `packages/platform-web/README.md`                                                  |
| What a web backend must satisfy                | `packages/platform-web/conformance/aria-mapping.json`                              |

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
  - **The package boundary catches an import, not an assumption.** "Would this compile without React
    installed?" is the test the decision names, and a contract can pass it while still assuming a
    DOM, a cascade, or a stylesheet. Nothing in this repo detects that, and the emitter's own printed
    assumptions are currently the only place such a bias is visible at all.

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
