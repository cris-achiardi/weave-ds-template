# `contracts/`

The schemas that govern what a component **is**, and how a framework realises it.

They live here — at the repo root, outside every package — because the first one belongs to no
framework. Putting it inside `packages/react/` would have quietly made it a React artifact, and the
whole point is that it is not.

| File                                                       | Governs                                                                        | Agnostic? |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------ | --------- |
| [`component.schema.json`](./component.schema.json)         | What the component is: purpose, behaviour, states, axes, anatomy, token policy | **yes**   |
| [`react-binding.schema.json`](./react-binding.schema.json) | How that becomes React: element, ref target, className passthrough             | no        |

## The split, and how to decide where a field goes

> **If it would still be true in React Native, it belongs in the contract.**

| Fact                              | Where    | Why                                                |
| --------------------------------- | -------- | -------------------------------------------------- |
| "this means _button_"             | contract | `<button>` and `Pressable` are the same meaning    |
| "this renders `<button>`"         | binding  | there is no `<button>` in React Native             |
| "it has a `label` region"         | contract | every platform has one                             |
| "the ref lands on `root`"         | binding  | refs are a React idea                              |
| "background must be a fill token" | contract | token families are the system's, not a framework's |
| "hover must dim it"               | contract | every platform has _some_ pressed/hover treatment  |

A binding that grows past a handful of fields is usually a sign something agnostic leaked into it.

## Why the contract specifies rather than merely describes

Earlier versions held only what the code could not state, and forbade restating anything derivable
— because two copies of one fact drift.

That rule bought safety and cost buildability. A file that deliberately omits the axes and their
values cannot be the thing you build _from_; it can only annotate something that already exists.

So the rule changed, in one specific way ([ADR 0002](../docs/ADR/0002-the-contract-specifies-and-the-gate-asserts-parity.md)):

> **The contract may specify anything. Anything it specifies that the implementation also expresses
> must be asserted equal by a gate.**

Duplication is not dangerous because it is duplication. It is dangerous when nothing checks it.
Here the axes and their values are read straight out of the implementation, so equality is
mechanical — and the moment the two disagree, the build fails rather than one of them quietly
becoming a lie.

The old rule survives wherever a check is _not_ possible: an accessibility claim, a purpose, a
token policy. Those are still stated once, in the contract, because there is nothing to compare
them against.

## Per component

```
packages/react/src/components/Button/
├── Button.contract.json    ← agnostic. Governed by component.schema.json
├── Button.react.json       ← the React binding
├── Button.tsx
├── Button.module.css
└── index.ts
```

The contract sits next to the React implementation today because there is only one. A second
framework would move it up and leave a binding in each package — which is a rearrangement, not a
rewrite, and that is the point of separating them now.

## Reading one

```bash
pnpm contract Button      # contract + binding + what the code actually does, merged
```

Never read any of the three alone. The contract says what should be true, the code says what is
true, and the merged view is the only place you see both.
