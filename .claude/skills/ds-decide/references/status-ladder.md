# Status ladder

```
Draft -> Proposed -> Accepted -> (Superseded by NNNN | Deprecated)
```

| Status                 | Means                                                                 | Promote when                                                |
| ---------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------- |
| **Draft**              | Being worked out. Edited freely.                                      | —                                                           |
| **Proposed**           | Ready for a decision, awaiting one. Use when a human has to sign off. | someone with the authority agrees                           |
| **Accepted**           | Decided **and mechanized in code**.                                   | the contract table points at something that exists and runs |
| **Superseded by NNNN** | A later record replaced it. The text stays as written.                | never edit it — write the replacement                       |
| **Deprecated**         | No longer applies and nothing replaces it.                            | rare; usually you supersede instead                         |

## The Accepted bar

**A decision nobody has implemented is a Draft, however confident it sounds.**

This is the rule that keeps the folder honest. Without it, ADRs accumulate as a wish list, and a
reader cannot tell which records describe the system and which describe an intention. With it,
`Accepted` means "this is how the repo actually works" — which is what makes the records worth
consulting before a change.

Concretely: before promoting, open the `## Contract` table and check that each path exists and each
named gate runs.

## Pre-v0

Until the first release there is nothing downstream to protect, so:

- ADRs are **edited in place**. Decisions can still move.
- Most stay **Draft**, and that is the healthy state, not a backlog.
- Only foundational, already-mechanized decisions are Accepted.

At v0 the Accepted-is-immutable / supersede-don't-edit discipline switches on for good. Say so in
the record if the distinction matters for how someone should read it.

## Superseding

1. Write the new record. Its Context explains **what changed** — not just what the new decision is.
   A supersession whose context does not say why the old reasoning stopped holding is unreadable
   in a year.
2. Set the old record's status to `Superseded by NNNN`, linked.
3. **Leave the old text alone.** It is a record of what was decided and why, and rewriting it
   destroys the only reason to keep it.
4. Add the new row to the index; update the old row's status.

## Deprecating a component (not a record)

Different thing, different place — `status` in a component's contract file. That one has a schema
rule attached: a `deprecated` level **requires** `replacedBy` and `migrationUrl`, because a bare
"deprecated" with nowhere to go is not a valid state, it is how you strand consumers. The gate
checks that `replacedBy` names a component that exists.
