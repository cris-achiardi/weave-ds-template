# Remaining issue PR log

Each PR is tested locally, reviewed as a diff, and merged only after CI passes.
Existing user edits stay outside this worktree. Remove this log in the final PR.

| Order | Issues      | Scope                                                             | Status        |
| ----- | ----------- | ----------------------------------------------------------------- | ------------- |
| 1     | #13         | Repo-wide contract, prop-map, and paint tooling                   | Merged in #28 |
| 2     | #3, #4, #17 | Contract-first skills, explicit Figma paint policy, rename checks | Merged in #29 |
| 3     | #11, #14    | Shared web element map and styling conventions                    | Merged in #30 |
| 4     | #12         | Explicit live versus committed editing semantics                  | Merged in #31 |
| 5     | #10         | Shadow-DOM relationships and explicit backend conformance         | In progress   |
| 6     | #16         | Contract form semantics and WC form participation                 | Planned       |
| 7     | #15         | Deferred browser conformance cases and final log removal          | Planned       |

## Decisions and evidence

- #13: readers expose each backend separately; framework surfaces must never be presented as a shared public API. Paint reporting accepts a consumer theme explicitly.

- Group 1 validation: full `pnpm verify` passed (116 tests, 8 deferred); six tooling regression tests cover backend attribution and both stylesheet grammars.

- Group 1 CI found stale generated WC event names after branding. `init-ds` now regenerates the glossary after updating identity; both branding matrix jobs must pass before merge.

- Group 2: Figma derives axes/anatomy from contracts; null channels remain unbound. An explicit consumer mapping is required for styled output (ADR 0003).

- Group 2 validation: both skills passed metadata validation; Figma plan tests passed; all four emitters preserved an edited consumer theme on regeneration. Full `pnpm verify`: 119 passed, 8 deferred. No live Figma publication was part of this skill repair.

- Group 3: shared root map replaces 60 duplicated element fields; all binding schemas and pointers are gated. Regenerating and formatting all 60 components produced identical output. Existing 22 browser cases passed, plus four new styling/root cases; full verify passed (119 unit tests, 8 deferred).

- Group 4 decision: shared text explicitly chooses live or commit reporting. Commit means focus leaves on web; keep a local draft, suppress unchanged commits, and let changed external values replace the draft.

- Group 4 validation: all 34 browser tests passed, including eight live/commit scenarios; full verify passed (120 unit tests, 8 deferred). The schema rejects missing editing modes and modes on non-text/non-shared states.

- Group 5: chose explicit non-conformance (ADR 0005). No exemption counts as success; Field wrapper gaps affect all four backends, WC cross-member references are omitted.

- Group 5 validation: full verify passed (122 tests, 8 deferred); all 35 browser cases passed, including omitted references, the unnamed supplied control, and reflection scope restrictions.
