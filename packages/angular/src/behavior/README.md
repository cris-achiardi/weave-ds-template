# `behavior/`

The interaction primitives emitted components **import**. The Angular twin of
[`packages/react/src/behavior/`](../../../react/src/behavior/README.md), which holds the reasoning
for why this exception to "you own your generated component" exists at all — read that first. In
short: what you can see, you own; what must be correct, you depend on.

## What is here, and what moved out

```
useDismissal.ts         useLinearNavigation.ts   >  the Angular BINDINGS. This is the whole directory now.
useRangeControl.ts      /
index.ts                    the public barrel
```

The decision logic these wrap — `dismissal.ts`, `linear-navigation.ts`, `range-stepping.ts` and
their conformance suites — **used to sit beside them, copied byte for byte from the React package.**
It now lives once, in [`@ds/behavior`](../../../behavior/README.md), which explains at length why it
was duplicated in the first place and what had to be true before it could move.

What is left here is genuinely Angular and nothing else: reading an event, and calling a state writer.

`pnpm verify:parity` asserts two things about this directory — that no copy of a shared core
reappears in it, and that its barrel exports the same names as every other backend's. The second is
what stops an emitted component compiling against one backend and not another.

## The bindings: everything reactive is a getter, plus one Angular-only addition

```ts
useDismissal(
  DISMISSAL,
  () => this.open(),
  () => this.open.set(false),
); // Angular
useDismissal(DISMISSAL, () => open.value, dismissOpen); // Vue
useDismissal(DISMISSAL, open, dismiss); // React
```

React re-runs the component function and closes over a fresh value each time. An Angular class body
and a Vue `setup` both run **once**, so a plain boolean would be frozen at construction and a dialog
would go on dismissing after it closed — with no error anywhere. Two backends, the same shape, for
the same reason.

The addition: **`useRangeControl` takes a getter for the TRACK ELEMENT too.** React hands the
primitive a callback ref to attach and Vue a function ref; Angular resolves the element itself with
a `viewChild` query and hands in a reader. Three ways of answering "which box does a pointer measure
against", none of which the contract knows about — it names the part and stops, which is exactly as
far as a framework-agnostic statement can go.

Three smaller consequences, each recorded because it produced a real bug or would have:

- **`register`, `unregister` and `isTabStop` are arrow-function properties, not methods.** A
  generated collection re-exports them as its own class fields, and a method would arrive with
  `this` unbound — the difference between a working tab list and a TypeError on the first arrow key.
- **`useDismissal` must be called from an injection context**, because it creates an `effect`. A
  field initializer is one, which is where generated components call it.
- **`useRangeControl` returns signals, not a `reactive` proxy.** Vue's binding needs `reactive` so
  the template unwraps `range.fraction`; Angular reads `range.fraction()` and needs no such trick.

## What is NOT here

The behaviour **vocabulary** the contract layer is supposed to declare these against still does not
exist — see `packages/contracts/README.md`. Three primitives exist because three contracts needed
them, and `prop-bindings.json > behaviorBindings` names the mapping by hand. Three backends have now
reached that gap from three directions, which makes it a gap in the contract layer rather than in
any of them.
