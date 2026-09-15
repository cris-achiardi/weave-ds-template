# Browser conformance and regressions

Playwright drives generated components in Chromium, Firefox and WebKit across React, Vue,
Angular and vanilla web components. The browser lane complements pure behavior tests with
real focus order, geometry, accessibility relationships, events, and form lifecycle behavior.

Install once with `pnpm exec playwright install chromium firefox webkit`, then run
`pnpm test:browser`. On Linux, use `playwright install --with-deps` to install system libraries.
The command generates alternate contract fixtures, builds tokens, and starts isolated Vite
servers on ports 4401 through 4404. Existing servers are never reused.

Select a backend/browser pair with `pnpm test:browser --project=wc-firefox`. The `browser` CI
job runs the complete matrix separately from `pnpm verify`. `.browser.mjs` files are excluded
from Vitest. Failure traces are kept under `node_modules/.cache/playwright-results`.

## Contract cases

`conformance.mjs` reads all `needsARenderedDOM` records from the contract JSON. Five navigation
and three dismissal cases run across all four backends. Multi-pattern cases exercise both
radio and tabs where declared. Unknown case IDs fail. The pure suites require matching flags
and contain no skipped placeholders for these cases.

Assertions cover forward and reverse Tab entry, one Tab stop and exit from a collection,
manual Space activation, inert reselection, dialog padding, overflowing children and backdrop
drags. Positive controls ensure a disabled or absent event handler cannot falsely pass the
negative cases. Drag fixtures suppress native HTML drag-and-drop so they exercise pointer
press/release rather than browser text dragging. This is coverage of those declared cases, not blanket accessibility certification.

## Generated fixtures

`pnpm browser:generate` writes alternate modes under ignored `src/browser-generated/` folders:
commit-mode TextField and manual-activation Tabs with its TabItem. Both `pnpm typecheck` and
`pnpm test:browser` run generation. WC alternate tabs omit duplicate global tag typings and
load only on their dedicated page; the production emitter still emits its global tag declarations by default.

Fixtures import generated components. They remain separate from specimen pages. Additional
regressions cover styling, editing drafts, ARIA references, collection identity, modal lifecycle,
activation cancellation, and form contribution/validation/reset/disabled behavior. Form state
restoration invokes the platform callback directly; history/autofill scheduling is not asserted.
Known relationship gaps are characterized and reported as non-conforming under ADR 0005.

The matrix also guards WC roving focus without host delegation: negative-tabindex arrow targets
and forward/reverse Tab traversal must work in every engine.
