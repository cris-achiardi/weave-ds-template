# ADR 0002 — The contract is agnostic and specifies; a gate asserts parity

- **Status:** Accepted
- **Date:** 2026-08-17
- **Deciders:** Design Systems
- **Tags:** components, contracts, governance, framework-agnostic, determinism
- **Related:** [ADR 0001 — Component contracts carry only what the source cannot state](./0001-component-contracts-carry-what-the-source-cannot.md) (amended by this record)

## Context

ADR 0001 established one file per component holding what the source cannot state, and forbade
restating anything derivable. That rule bought a real property — two copies of one fact cannot
drift if there is only ever one copy — and it worked.

It also cost two things that turn out to matter more.

**1. The contract could only ever annotate, never specify.** A file that deliberately omits the
axes, their values and their defaults cannot be the thing a component is built _from_. It can only
describe something that already exists. That is backwards for a system whose entire premise is
that a component is produced from contracts rather than written and then documented.

**2. The contract was quietly a React artifact.** `classNamePassthrough`, `refTarget` and the
`data-*` part mechanism are React and DOM concepts. A contract carrying them cannot describe the
same component built on React Native or as a web component — so the "what is this component"
question had a different answer per framework, which is precisely the thing that should be stable.

The no-restating rule was also stricter than its own justification required. The danger was never
duplication as such; it was **unchecked** duplication. ADR 0001's reasoning applied to a system
where the second copy could not be mechanically compared. That is not our situation: variant axes,
their value sets and their defaults are read directly out of the `cva()` call in under a
millisecond, with no build and no type checker. Equality is decidable, so the risk the rule existed
to prevent can be gated instead of avoided.

## Decision

**The component contract is framework-agnostic and complete enough to build from. Framework
specifics move to a binding. The contract may specify anything, and anything it specifies that the
implementation also expresses must be asserted equal by a gate.**

1. **Two schemas, and the dividing line is a question.** `contracts/component.schema.json` holds
   what is true of the component on any platform; `contracts/react-binding.schema.json` holds what
   stops being true the moment you change framework. The test: _would this still be true in React
   Native?_ If yes, it is a contract field.
2. **They live outside every package.** `contracts/` sits at the repo root. Keeping the agnostic
   schema inside `packages/react/` would have made it a React artifact by location, whatever its
   contents claimed.
3. **The contract carries intent.** Purpose, behaviour, and what the component is deliberately not
   for. This is the written form of the use case — the reasoning that makes an anatomy a
   consequence rather than an opinion. It is also the part no gate can ever check, which is exactly
   why it has to be written down.
4. **States are declared once, at the top, and classified.** `intrinsic` means the platform
   provides it and you only style it; `authored` means the implementation has to track it.
   Per-part styling may then only reference a state that was declared.
5. **The contract specifies the axes it exposes**, with their value subsets and defaults, in
   canonical vocabulary from the prop map.
6. **Duplication is permitted exactly where it is checked.** `verify:contract` asserts that every
   declared axis exists in the implementation, that the value sets match, that the defaults match,
   and that the implementation exposes no axis the contract failed to declare. A disagreement fails
   the build.
7. **Where a check is impossible, ADR 0001's rule still holds.** Purpose, accessibility
   commitments, slot constraints and token policy are stated once, in the contract, because there
   is nothing to compare them against. Restating a _checkable_ fact is now specification; restating
   an _uncheckable_ one is still a defect.
8. **A binding is small by construction.** If a field in a binding would be equally true on another
   platform, it belongs in the contract. A binding that grows is a signal something agnostic leaked.

## Contract

| Concern                                    | Where                                                                              |
| ------------------------------------------ | ---------------------------------------------------------------------------------- |
| Agnostic component schema                  | `contracts/component.schema.json`                                                  |
| React binding schema                       | `contracts/react-binding.schema.json`                                              |
| Where the line falls, with worked examples | `contracts/README.md`                                                              |
| Per-component files                        | `packages/react/src/components/<Name>/<Name>.{contract,react}.json`                |
| Parity + invention enforcement             | `packages/react/scripts/verify-contract.mjs` (`pnpm verify:contract`, gated in CI) |
| Axis / value / default extraction          | `packages/react/scripts/extract/cva.mjs`                                           |
| Read-time composer                         | `packages/react/scripts/contract.mjs` (`pnpm contract <Name>`)                     |

## Consequences

**Positive**

- The contract becomes an input rather than an annotation. Handed the contract, the prop map for a
  target framework, and the code standards, you have enough to build the component.
- "What is this component" now has one answer across frameworks. A second binding is a new small
  file, not a re-litigation of what the thing is.
- The parity gate catches a class of drift that was previously invisible in both directions: a
  contract promising an axis value nobody implemented, and an implementation exposing a variant
  nobody agreed to. Both were silent before — no build error, no failing test.
- Intent and behaviour are recorded where they can be read, rather than surviving only in the head
  of whoever built it.

**Negative / trade-offs**

- **This is a real weakening of ADR 0001's central rule, and the safety now depends entirely on the
  gate.** If `verify:contract` is skipped, disabled, or its parity checks are removed, the contract
  degrades into exactly the stale second opinion ADR 0001 warned about — and it will look
  authoritative while doing it. The rule was self-enforcing; this is not.
- **Two files per component instead of one**, and a reader has to know that neither is complete
  alone. The composer mitigates it; it does not remove the concept.
- **The dividing line is a judgement call.** "Would this be true in React Native?" is a good test
  and not a decidable one. Fields will end up on the wrong side, and nothing will fail when they
  do — the symptom appears only when someone writes a second binding, possibly years later.
- **Intent is unfalsifiable.** A purpose that is vague, or wrong, or copied from another component,
  passes every check. The most valuable field in the file is the one with the least protection.
- **Migration cost is real if components already exist.** They do not today, which is why this is
  the moment to make the change; the same decision in a year would be a rewrite across every
  component.

## Alternatives considered

**Keep ADR 0001 unchanged and add a separate "spec" file for buildability.** Rejected: three files
describing one component, with the same overlap question between the new two. The overlap does not
disappear by being moved.

**Keep the contract React-shaped and defer agnosticism until a second framework exists.** Tempting,
and cheaper today. Rejected because the cost is not linear — the decision is nearly free with zero
components and expensive with fifty, and "we will make it agnostic later" is the kind of intention
that does not survive contact with a deadline.
