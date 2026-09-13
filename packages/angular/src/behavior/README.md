# `behavior/`

The interaction primitives emitted components **import**. The Angular twin of
[`packages/react/src/behavior/`](../../../react/src/behavior/README.md), which holds the reasoning
for why this exception to "you own your generated component" exists at all — read that first. In
short: what you can see, you own; what must be correct, you depend on.

## Two kinds of file

```
dismissal.ts            \
linear-navigation.ts     >  PURE CORES — DUPLICATED, byte for byte, from packages/react
range-stepping.ts       /
*.test.ts                   the conformance suites, run against those cores

useDismissal.ts         \
useLinearNavigation.ts   >  the Angular BINDINGS.
useRangeControl.ts      /
index.ts                    the public barrel
```

### The pure cores are in their THIRD copy, and that is now the finding

Each carries a banner saying so. Nothing in them is Angular and nothing in the originals was React:
each is a function from (event facts, declared options, current state) to a decision, and the
conformance cases in `@ds/contracts/conformance/` execute against them directly.

By the rule [`@ds/platform-web`](../../../platform-web/README.md) states — _if it would still be
true in a Vue, Svelte or Lit backend rendering the same DOM, it belongs here_ — these belong in the
platform package and not in any framework package.

They were copied rather than moved so a second backend's cost could be **measured** before it was
optimised away. That measurement is taken ([`docs/research/0004`](../../../../docs/research/0004-a-second-backend-reading-the-same-contracts.md))
and a third backend has confirmed it ([`0005`](../../../../docs/research/0005-a-third-backend-and-what-only-it-could-find.md)).
**At three copies the argument for leaving them alone is weaker than it was at two**, and moving
them is the obvious next commit — a separate one, with its own diff.

Until then the three must not drift, and that is gated rather than trusted: `pnpm verify:parity`
compares every copy against the original below its banner and fails on any difference. The gate is
not decoration — each backend's conformance suite runs against **its own copy**, so all three could
stay green while the three components disagreed about what Escape does.

### The bindings: everything reactive is a getter, plus one Angular-only addition

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
