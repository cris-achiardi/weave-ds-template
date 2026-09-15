# Review fixes: PR #9

Each row is a separate PR, merged only after all CI checks pass. Fix the emitter,
regenerate its components, and prove the reported browser failure is covered.
Delete this temporary plan in the final PR.

| Order | Issue | Work                                                                                                     | Status                  |
| ----- | ----- | -------------------------------------------------------------------------------------------------------- | ----------------------- |
| 1     | #18   | Angular accordion IDs and ARIA references share one signal-aware helper; introduce browser regression CI | Merged in #23           |
| 2     | #22   | Defer WC dialog presentation until connection                                                            | Merged in #24           |
| 3     | #20   | Forward literal accessible names to WC controls                                                          | Implemented; CI pending |
| 4     | #19   | Remove obsolete navigation registrations on member identity changes                                      | Pending                 |
| 5     | #21   | Let host consumers cancel activation before state changes; remove this plan                              | Pending                 |

## Validation

- Each regression must fail against the previous implementation and pass with the fix.
- Run relevant browser tests and the repository verification checks.
- Preserve consumer-owned theme files during generation.
- Keep the original workspace's unrelated uncommitted files untouched.
- The browser lane starts with Chromium and grows with these five fixes. The other
  deferred conformance cases in #15 remain follow-up work.
