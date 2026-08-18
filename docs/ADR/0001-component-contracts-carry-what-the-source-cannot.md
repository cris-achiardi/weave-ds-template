# ADR 0001 — Component contracts carry only what the source cannot state

- **Status:** Accepted — **amended by [ADR 0002](./0002-the-contract-specifies-and-the-gate-asserts-parity.md)**
- **Date:** 2026-08-17
- **Deciders:** Design Systems
- **Tags:** components, metadata, contracts, ai-consumption, governance, determinism

> **Read 0002 alongside this.** Decision §3 below forbids restating anything derivable. ADR 0002
> narrows that: the contract now _specifies_ the axes, their values and their defaults, because a
> file that omits them cannot be built from — and duplication is safe **exactly where a gate
> asserts equality**. The rule below still holds in full for everything a gate cannot check.
> Decisions 1, 2, 4, 5, 6 and 7 are unchanged.

## Context

A component in this library states its public surface in two places, and only one of them is
mechanical.

Prop names, their types, their value sets, their defaults, whether they are required, and the
inventory of parts and states the component renders are all **already in the TypeScript source**.
They can be read out of it, and — because they are read rather than written — they cannot drift
from the code.

Everything else about a component is stated nowhere a machine can reach: which element it actually
renders, what ARIA role it takes, what its accessibility commitments are, what a slot legitimately
accepts, where a forwarded ref lands, which node absorbs a consumer's `className`, how far along
its lifecycle it is, and which design token is expected to paint which visual channel of which
internal node.

That second set is not incidental. It is what a reviewer checks by reading source, what a designer
needs in order to reconcile a canvas against code, and what an agent has no way to know.

The obvious response — one hand-written metadata file per component describing the whole component
— is a trap, and both of the mature systems this template draws from say so explicitly. A metadata
file restating props and their value sets is a second, hand-maintained copy of something that can
be derived correctly. Two copies of one fact drift, and **a drifting trust signal is worse than
no signal**, because it is consulted with confidence.

There is one further constraint specific to this template: it must be useful **on a fresh clone,
with zero components, and with no build step**. A design that requires a generated manifest to
exist before any question can be answered fails that test on day one.

## Decision

**Every component may carry exactly one contract file, colocated with its source, and that
contract declares only the facts the TypeScript source cannot state. Anything derivable is read
from source at read time and is never committed.**

1. **One file, next to the code.** `src/components/<Name>/<Name>.contract.json`, validated against
   a single schema in the package. Colocation puts the contract in the same diff as the change it
   describes.
2. **Machine-readable, not prose.** JSON with a schema, so an illegal contract fails a gate rather
   than a reviewer's attention. A human-facing rendering may be generated from it; it is never the
   authoring surface.
3. **The division of labour is the whole point.** The source owns the derivable surface. The
   contract owns rendered element, ARIA role, ref target, `className` passthrough, accessibility
   commitments, slot composition constraints, structured lifecycle status, and the token policy
   for each node. **Restating a derivable fact in a contract is a defect, not redundancy** — with
   one exception: the component's name, so the file is self-describing, and tooling asserts it
   matches its directory, its export, and the barrel.
4. **The contract states token _policy_, not token values.** It declares which family of token is
   permitted to paint a given channel of a given node; the concrete value stays in the stylesheet.
   Copying resolved values into the contract would recreate the duplication this record exists to
   prevent, because the stylesheet would remain the thing the browser actually reads.
5. **Absence is a reportable state, not a failure.** A component without a contract is
   _uncontracted_ and says so in an audit. New components carry one; existing components are
   backfilled deliberately. A gate that fails on every component on day one gets switched off, and
   a switched-off gate protects nothing.
6. **The derivable half is read on demand and never committed.** No manifest file, no build before
   use. This is the one deliberate departure from the shadow-DOM system this design is drawn from,
   where the equivalent artifact is 1.79 MB and requires a full build before the prop glossary or
   the contract gate can run at all.
7. **Determinism is a requirement of every artifact in this chain, not an aspiration.** Generated
   outputs are byte-stable for a given input; generators sort with a fixed code-point comparator
   rather than a locale-dependent one; inputs derived from the filesystem do not depend on
   directory order; and generated artifacts contain nothing specific to the machine that produced
   them.

**The corollary that binds future work: before adding a field to the contract schema, establish
that the source cannot already answer it.** If it can, the field belongs in the composer, not in
the file.

## Contract

The realizing specifics live with the code they govern, not here:

| Concern                             | Where                                                                                                                                       |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Contract schema                     | `packages/react/contract.schema.json`                                                                                                       |
| Per-component contracts             | `packages/react/src/components/<Name>/<Name>.contract.json`                                                                                 |
| Derived-half extractors             | `packages/react/scripts/extract/{props,cva,parts}.mjs`                                                                                      |
| Read-time composer                  | `packages/react/scripts/contract.mjs` (`pnpm contract <Name>`)                                                                              |
| Contract enforcement                | `packages/react/scripts/verify-contract.mjs` (`pnpm verify:contract`, wired into `pnpm verify` **and** into `.github/workflows/verify.yml`) |
| Token-policy report                 | `packages/react/scripts/report-paints.mjs` (`pnpm report:paints`, report only)                                                              |
| Axis / value canon                  | `packages/react/prop-map.config.json`; prose in `packages/react/src/components/README.md` §2                                                |
| Measured prop surface + drift queue | `.ai/maps/prop-map.{json,md}`, generated by `packages/react/scripts/build-prop-map.mjs` (`pnpm prop-map`; gated as `pnpm prop-map:check`)   |
| Authoring rules the gate enforces   | `packages/react/src/components/README.md`                                                                                                   |

## Consequences

**Positive**

- The facts an agent, a reviewer, and a designer all need stop living only in source, and become
  queryable from one place per component.
- `pnpm contract <Name>` works on a fresh clone in well under a second, with no build. Decision 6
  is what buys that, and it is what makes agent-driven authoring practical rather than theoretical.
- Because variant value sets are read from the `cva()` call, the gate can check that
  `whenProp["hierarchy=secondary"]` names a **real value of a real prop**. The system this design
  is drawn from can only check that the attribute name exists — its own gate says so in a comment.
- Because a node carries both `data-ds-part="x"` and `className={styles.x}`, the declared token
  policy can be resolved against the stylesheet. In the shadow-DOM original this is impossible:
  no part-name → selector mapping exists, and its token policy is documentation rather than a
  check. Here it is `pnpm report:paints`.
- A change to a component's public surface shows up as a reviewable contract diff next to the code.

**Negative / trade-offs**

- **A merged view requires tooling.** Neither the contract nor the source alone answers "what is
  this component", so reading either in isolation is misleading. The composer is load-bearing, not
  a convenience.
- **Extraction depends on a type checker whose behaviour has already changed once.** Measured:
  under `typescript@6.0.3`, `react-docgen-typescript@2.4.0` stops classifying
  `VariantProps<typeof x>`-derived props as enums — the literal value arrays come back empty while
  only the union string survives. Its declared peer range is `>= 4.3.x`, so nothing warns you.
  `typescript` is therefore tilde-pinned in the root `package.json`, the reader recovers the values
  from the union string as a fallback, and any such recovery is flagged `degraded: true`. The
  mitigation is real, but the dependency on someone else's type checker is permanent.
- **A generic wrapper around a variant type silently loses its value set.** `ResponsiveValue<Size>`
  resolves to a bare name with no values. The authoring rules forbid it, and nothing but those
  rules prevents it.
- **The contract is only as true as its author.** Schema validation catches shape and the gate
  catches the mechanically decidable parts, but a wrong ARIA role or an optimistic contrast claim
  passes both.
- **Two artifacts describe one component, and we accept that purely on the strength of the
  no-overlap rule in Decision 3.** If that rule erodes, this becomes the duplication the record
  exists to prevent — and the erosion would be gradual and comfortable, one convenient field at a
  time.
- **Enforcement has teeth only where a rule is decidable.** Judgment-heavy standards — is this the
  right node decomposition, is this genuinely a new axis — stay human, and the tooling's confidence
  must not be read as covering them.

## Alternatives considered

**A committed, generated manifest (the shadow-DOM approach, ported).** Closest to the system this
design comes from, and it keeps one mental model. Rejected because it puts a generated file in
every diff and makes "what is this component" depend on a prior build — which fails the fresh-clone
test that matters most for a template someone clones and immediately asks questions of.

**A single hand-written metadata file per component, carrying everything.** The simplest thing to
explain in one sitting, and it is what one of the two reference systems actually does. Rejected on
its own reference system's evidence: that repo now runs a 44 KB scanner specifically to detect
where its hand-written metadata has drifted from the code, which is the cost of the approach made
visible.
