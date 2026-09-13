# `behavior/`

The interaction primitives emitted components **import**. The Vue twin of
[`packages/react/src/behavior/`](../../../react/src/behavior/README.md), which holds the reasoning
for why this exception to "you own your generated component" exists at all — read that first. In
short: what you can see, you own; what must be correct, you depend on.

## What is here, and what moved out

```
useDismissal.ts         useLinearNavigation.ts   >  the Vue BINDINGS. This is the whole directory now.
useRangeControl.ts      /
index.ts                    the public barrel
```

The decision logic these wrap — `dismissal.ts`, `linear-navigation.ts`, `range-stepping.ts` and
their conformance suites — **used to sit beside them, copied byte for byte from the React package.**
It now lives once, in [`@ds/behavior`](../../../behavior/README.md), which explains at length why it
was duplicated in the first place and what had to be true before it could move.

What is left here is genuinely Vue and nothing else: reading an event, and calling a state writer.

`pnpm verify:parity` asserts two things about this directory — that no copy of a shared core
reappears in it, and that its barrel exports the same names as every other backend's. The second is
what stops an emitted component compiling against one backend and not another.

## The bindings differ in exactly one way, consistently

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
