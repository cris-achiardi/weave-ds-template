# `@ds/behavior`

**The decision logic behind the interaction primitives. No framework, no DOM, no side effects.**

Three modules — what Escape means, which member an arrow key moves to, where a number lands when you
step it — plus the conformance suites that execute them against
[`@ds/contracts/conformance/`](../contracts/conformance/README.md).

## Why it exists, and why it did not exist sooner

These lived in `packages/react/src/behavior/` and were **copied** into the Vue and Angular packages
as each backend was built. That was deliberate, not an oversight:

> The experiment was to measure what a second backend costs, and moving shared code into a shared
> place while building the thing that proves it is shared destroys the measurement.

`pnpm verify:parity` compared the copies byte for byte in the meantime, so they could not drift. The
measurement is in [`docs/research/0004`](../../docs/research/0004-a-second-backend-reading-the-same-contracts.md)
and [`0005`](../../docs/research/0005-a-third-backend-and-what-only-it-could-find.md), and at three
copies the reason had run out. This package is the move those reports named.

## Why not somewhere that already existed

Two packages were plausible and both are wrong, in opposite directions.

**Not [`@ds/platform-web`](../platform-web/README.md).** Its rule is _"if it would still be true in a
Vue, Svelte or Lit backend rendering the same DOM, it belongs here"_. These pass that test and then
keep going: none of them needs a DOM at all, and all of them would be true in React Native or
Flutter. They are **more** agnostic than the web profile, so a home inside it would have been a
demotion — and would have quietly told a future non-web backend that it could not use them.

**Not [`@ds/contracts`](../contracts/README.md).** That package is the specification and ships JSON.
The conformance cases these satisfy already live there. This is the executable **reference
implementation** of those cases, which is a different kind of artifact, and keeping it out is what
lets a consumer hold the contract set without holding any code at all.

So: a third thing, between the specification and any platform.

## What is here

```
src/dismissal.ts            closing a region with a key or a press that is not activation
src/linear-navigation.ts    moving between the members of a collection
src/range-stepping.ts       moving a number within a bounded, stepped range
src/*.test.ts               the conformance suites — ONE copy, not three
src/index.ts                the barrel, with the two `intentFor`s disambiguated
```

Each module is a function from **(event facts, declared options, current state) to a decision**. The
parameters are the contract's own blocks, one for one: `dismisses`, `collection.navigation`,
`range`. If a name here drifts from a name there, the schema is the authority.

## What a framework package does with it

A backend wraps these in its own binding and **re-exports them under the same names**, so an emitted
component imports `@ds/react/behavior` and never reaches in here:

|                        | reads the shared core | adds                                                             |
| ---------------------- | --------------------- | ---------------------------------------------------------------- |
| `@ds/react/behavior`   | ✓                     | `useCallback`/`useRef` plumbing, plain-value inputs              |
| `@ds/vue/behavior`     | ✓                     | refs, getter inputs, a `reactive` return for template unwrapping |
| `@ds/angular/behavior` | ✓                     | signals, getter inputs, a getter for the track element           |

`pnpm verify:parity` asserts those three barrels export the same set of names. That check replaced
the drift check: with one copy there is nothing to drift, but a barrel that gains or loses a name
still makes an emitted component compile against one backend and not another, and nothing else in
the repo would notice.

## The test suites moved with the code, and the count went down

There were nine test files and there are three. That is the point — but it is worth being explicit
about what was lost, because a falling test count usually is a loss:

**Before**, each backend ran the suite against its own copy, and the suites passing proved nothing
about whether the copies agreed. `verify:parity` proved that separately. **Now** one copy runs once
and there is nothing left to disagree.

## Source, not a build

`exports` points at `./src/*.ts`. This package has no build step and produces no `dist`: every
consumer compiles TypeScript already, and a build here would only add an order dependency between
`pnpm build` and `pnpm dev`.
