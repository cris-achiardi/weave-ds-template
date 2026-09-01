# storybook

**Complete, and deliberately not installed.**

Storybook is ~350 MB of `node_modules` and proves nothing the sandbox does not, so it stays out of
the install graph. Every clone would otherwise pay for it, including the ones that never open it.

## Switching it on

1. Uncomment `- 'apps/storybook'` in `/pnpm-workspace.yaml`
2. `pnpm install`
3. `pnpm dev:storybook` → http://localhost:4400

## What lives where

Stories sit **next to the component they document**, not in this app:

```
packages/react/src/**/<Name>.stories.tsx
```

`.storybook/main.ts` globs them from there and aliases `@ds/react` to source, so a story
hot-reloads against the component you are editing.

## When it earns its place

The sandbox answers _"does this render and behave"_. Storybook answers _"what is the whole matrix,
and can a stranger read it"_ — which starts to matter once the library has enough components that
nobody holds them all in their head. Turn it on then, not before.

Note that a story is a **third** description of a component, alongside the source and the
contract. Keep it to usage examples. The moment a story starts restating prop values or defaults,
it has become a copy that nothing keeps honest — `pnpm contract <Name>` is the answer to
"what is this component", and it is composed rather than written.
