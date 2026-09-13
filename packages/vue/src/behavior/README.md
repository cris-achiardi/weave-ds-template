# `behavior/`

The interaction primitives emitted components **import**. The Vue twin of
[`packages/react/src/behavior/`](../../../react/src/behavior/README.md), which holds the reasoning
for why this exception to "you own your generated component" exists at all — read that first. In
short: what you can see, you own; what must be correct, you depend on.

## Two kinds of file, and the difference is the whole point of this directory

```
dismissal.ts            \
linear-navigation.ts     >  PURE CORES — DUPLICATED, byte for byte, from packages/react
range-stepping.ts       /
*.test.ts                   the conformance suites, run against those cores

useDismissal.ts         \
useLinearNavigation.ts   >  the Vue BINDINGS. Genuinely Vue, genuinely different.
useRangeControl.ts      /
index.ts                    the public barrel
```

### The pure cores are copied, not shared, and that is deliberate

Each of the three carries a banner saying so. Nothing in them is Vue and nothing in the originals
was React: each is a function from (event facts, declared options, current state) to a decision, and
the conformance cases in `@ds/contracts/conformance/` execute against them directly.

By the rule [`@ds/platform-web`](../../../platform-web/README.md) states — _if it would still be
true in a Vue, Svelte or Lit backend rendering the same DOM, it belongs here_ — these belong in the
platform package and not in either framework package.

**They are copied rather than moved because the experiment was to measure what a second backend
costs.** Moving shared code into the platform layer while building the thing that proves it is
shared destroys the measurement. The duplication is the finding;
[`docs/research/0004`](../../../../docs/research/0004-a-second-backend-reading-the-same-contracts.md)
reports it, and moving it is a separate commit with its own diff.

Until then the copies **must not drift**, and that is gated rather than trusted: `pnpm verify:parity`
compares each copy against its original below the banner and fails on any difference. The gate is
not decoration — each backend's conformance suite runs against **its own copy**, so two backends
could silently disagree about what Escape does while both suites stayed green.

### The bindings differ in exactly one way, consistently

**Every reactive input is a getter.**

```ts
useDismissal(DISMISSAL, () => open.value, dismissOpen); // Vue
useDismissal(DISMISSAL, open, dismiss); // React
```

React re-runs the component function on every render and closes over a fresh value each time. Vue's
`setup` runs **once**. A plain boolean passed in here would be the value it had at mount, forever —
so a dialog would go on dismissing after it closed, and nothing would report it: no type error, no
warning, no failing test. The same shape applies to `useLinearNavigation`'s `selection` and
`useRangeControl`'s `value` and `disabled`.

Two smaller consequences, recorded because each one produced a real bug while this was being built:

- **`useRangeControl` returns a `reactive` object, not a plain one holding refs.** Vue unwraps a ref
  reached through a `reactive` proxy and **not** one reached through a plain object, so
  `range.fraction` in a template would otherwise render `[object Object]` — and render it with no
  error at all. React's binding returns a memoised plain object because React has no unwrapping to
  get wrong.
- **`useDismissal`'s "forget the press" effect needs no note about writing during render.** The
  React version carries a paragraph explaining why that write had to move into a `useEffect`: a ref
  written during a discarded concurrent render escapes a render that never happened. Vue's setup
  body runs once, so the hazard does not exist. Worth stating, because the absence of the comment
  would otherwise look like an oversight.

## What is NOT here

The behaviour **vocabulary** the contract layer is supposed to declare these against still does not
exist — see `packages/contracts/README.md`. Three primitives exist because three contracts needed
them, and `prop-bindings.json > behaviorBindings` names the mapping by hand. That is the same gap
the React package has, reached from the other side, which makes it a gap in the contract layer
rather than in either backend.
