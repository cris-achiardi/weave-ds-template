# Browser regressions

These tests drive generated components in the sandboxes with Playwright and Chromium.
They complement the pure behavior tests: actual DOM relationships, focus, browser events,
and custom-element lifecycle callbacks must run in a browser.

Install the browser once with `pnpm exec playwright install chromium`, then run
`pnpm test:browser`. That command builds tokens and starts isolated Vite servers on
ports 4401–4403. It refuses to reuse an existing server, so another checkout cannot
silently supply the components under test.

The `browser` CI job installs Chromium and runs this lane separately from `pnpm verify`.
Test files use the `.browser.mjs` suffix so Vitest does not collect them. Failure traces
are written beneath node_modules and can be opened with Playwright's trace viewer.

The sandbox browser-tests entries are dedicated fixtures, separate from the specimen
pages. Fixtures import the same generated components consumers use. Add assertions for
observable behavior rather than emitter source text.

Current coverage includes styling handles and semantic roots across all four backends, Angular accordion ID references, Vue/Angular/WC collection
identity changes, WC literal accessible names, dialog connection state, and activation
cancellation through real mouse and keyboard input. It does not yet replace the eight
deferred conformance cases tracked in #15, and Chromium is the only browser in this lane.
