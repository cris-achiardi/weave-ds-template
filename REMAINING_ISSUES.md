# Remaining issue PR log

Each PR is tested locally, reviewed as a diff, and merged only after CI passes.
Existing user edits stay outside this worktree. Remove this log in the final PR.

| Order | Issues      | Scope                                                             | Status                          |
| ----- | ----------- | ----------------------------------------------------------------- | ------------------------------- |
| 1     | #13         | Repo-wide contract, prop-map, and paint tooling                   | Local checks passed; PR pending |
| 2     | #3, #4, #17 | Contract-first skills, explicit Figma paint policy, rename checks | Planned                         |
| 3     | #11, #14    | Shared web element map and styling conventions                    | Planned                         |
| 4     | #12         | Explicit live versus committed editing semantics                  | Planned                         |
| 5     | #10         | Shadow-DOM relationships and explicit backend conformance         | Planned                         |
| 6     | #16         | Contract form semantics and WC form participation                 | Planned                         |
| 7     | #15         | Deferred browser conformance cases and final log removal          | Planned                         |

## Decisions and evidence

- #13: readers expose each backend separately; framework surfaces must never be presented as a shared public API. Paint reporting accepts a consumer theme explicitly.

- Group 1 validation: full `pnpm verify` passed (116 tests, 8 deferred); six tooling regression tests cover backend attribution and both stylesheet grammars.

- Group 1 CI found stale generated WC event names after branding. `init-ds` now regenerates the glossary after updating identity; both branding matrix jobs must pass before merge.
