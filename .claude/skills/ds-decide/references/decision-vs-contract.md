# Decision vs contract — where the line falls

The one rule that decides what goes in an ADR and what does not:

> **An ADR records the decision and stays agnostic. The specifics that realize it are its
> contracts, they live with the code they govern, and the record _links_ them.**

## Why, concretely

Contracts change on the implementation's schedule. A JSON schema gains a field; a script gets a
new check; a generated file grows a section. If those specifics live inside the record, then every
one of those changes is an edit to an Accepted decision — and a record that is edited constantly
is one nobody trusts to still mean what it said.

Keeping them out is what lets the decision hold still while the implementation moves.

## The test

Ask: **if this changed, would the decision have changed?**

- No → it is a contract. Link it.
- Yes → it is part of the decision. Write it.

Adding a field to `contract.schema.json` does not change the decision "contracts carry only what
the source cannot state". So the schema is a contract. Deciding that contracts are _machine-readable
rather than prose_ does change the decision, so it is Decision item 2.

## Worked example

From `docs/ADR/0001`:

| Belongs in the **record**                                                        | Belongs in the **contract table**                           |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| "Every component may carry exactly one contract file, colocated with its source" | `packages/react/src/components/<Name>/<Name>.contract.json` |
| "Machine-readable, not prose"                                                    | `contracts/component.schema.json`                           |
| "Restating a derivable fact is a defect, not redundancy"                         | `packages/react/scripts/verify-contract.mjs`                |
| "The contract states token policy, not token values"                             | the `tokenPolicy` definition inside the schema              |
| "Absence is a reportable state, not a failure"                                   | the coverage output of the gate                             |

Notice the shape: the left column is **rules**, the right column is **files**. If your left column
has a file path in it, or your right column has a sentence in it, the line is in the wrong place.

## What a Contract table looks like

```markdown
## Contract

The realizing specifics live with the code they govern, not here:

| Concern         | Where                                                                              |
| --------------- | ---------------------------------------------------------------------------------- |
| Contract schema | `contracts/component.schema.json`                                                  |
| Enforcement     | `packages/react/scripts/verify-contract.mjs` (`pnpm verify:contract`, gated in CI) |
| Authoring rules | `packages/react/src/components/README.md`                                          |
```

Always name **how it is enforced**, not just where it lives. A contract with no gate is a
suggestion, and it is worth the record saying which of the two this is.

## The failure mode to watch for

Erosion is gradual and comfortable: one convenient field at a time, each individually reasonable.
A record that started as a decision becomes a specification, then becomes stale, then becomes
misleading. The moment you want to paste a schema fragment "just so it is all in one place", that
is the erosion starting.
