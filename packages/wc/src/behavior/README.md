# `behavior/`

The interaction primitives emitted components **import**. The fourth of these directories, and the
shortest.

[`packages/react/src/behavior/`](../../../react/src/behavior/README.md) holds the reasoning for why
this exception to "you own your generated component" exists at all — read that first. In short: what
you can see, you own; what must be correct, you depend on.

## What is here

```
useDismissal.ts         \
useLinearNavigation.ts   >  the vanilla bindings. This is the whole directory.
useRangeControl.ts      /
index.ts                    the public barrel
```

The decision logic they wrap lives once, in [`@ds/behavior`](../../../behavior/README.md).

## Why it is the shortest of the four

There is no reactivity system to satisfy. Two of the three are a closure over a `let` and a couple of
functions:

```ts
let pressBeganOnBackdrop = false;
```

where React keeps a `useRef` plus a `useEffect`, Vue a `ref` plus a `watchEffect`, and Angular a
`signal` plus an `effect`. All four do the same thing. Three of them do it through a scheduler.

`useLinearNavigation` is the clearest: it has **no version counter**. The other three keep one so
their reactivity system learns that the member list moved; nothing here needs telling, because the
collection recomputes on read and announces to its members itself.

## Where it costs something instead

**`useRangeControl` takes an `onDirty` callback**, and it is the only one of the four that does.
`dragging` is internal state that nothing outside writes, so when it changes the component has to be
TOLD to rewrite its attributes. That callback is what a reactivity system is, reduced to the one line
this component actually needs.

## One thing only this backend gets wrong without help

**`document.activeElement` does not cross a shadow boundary.** When focus is inside a shadow root it
reports the HOST, not the focused node — so the "which member holds focus" walk in
`useLinearNavigation` follows `shadowRoot.activeElement` down until it stops moving:

```ts
let node = document.activeElement;
while (node?.shadowRoot?.activeElement) node = node.shadowRoot.activeElement;
```

The other three backends never meet this, because their members are in the light DOM. It is the one
place where the shared conformance cases pass and the binding around them would still be wrong.

## The barrel must match the others

`pnpm verify:parity` asserts that this directory's `index.ts` exports the same set of names as every
other backend's. A barrel that drifts makes an emitted component compile against one backend and not
another, and nothing else in the repo would notice.
