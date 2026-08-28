# How this design system works

Written for designers. No knowledge of the code assumed. Six short pages.

|     |                                                              |                                                     |
| --- | ------------------------------------------------------------ | --------------------------------------------------- |
| 1   | [How this is meant to work](./01-what-this-is.md)            | The pipeline, and the one idea behind it            |
| 2   | [The two halves of a component](./02-the-two-halves.md)      | What everything else rests on                       |
| 3   | [Naming the pieces](./03-anatomy-and-parts.md)               | How a component is broken up, and how you style one |
| 4   | [Which token paints what](./04-tokens-and-paint.md)          | How "use the token, not the hex" is enforced        |
| 5   | [The shared vocabulary](./05-the-shared-vocabulary.md)       | Naming, and which props are even yours to name      |
| 6   | [From Figma to a component](./06-from-figma-to-component.md) | Why your variants don't survive the trip            |

## The whole thing in a paragraph

> A component is described in two halves. The **code** already knows the mechanical things — what
> properties it takes, what values they accept, the defaults. The **contract** is a small file next
> to it holding what the code cannot say: what it really is, what it promises about accessibility,
> and which family of token is allowed to paint each part. Neither half is complete alone, and a
> tool merges them on demand. Writing something in the contract that the code already knows is
> treated as a mistake — **unless a check compares the two**, in which case it is allowed on
> purpose, because a contract that left out the settings could never be the thing you build from.

And the idea behind that: **you don't fix the output, you fix the system that produced it.**

## These pages explain. They don't decide.

Everywhere else in this repo, each fact lives in exactly one place and everything points at it
rather than restating it — that's what stops docs drifting.

These pages break that rule on purpose, because an explanation that refuses to restate anything is
useless. So: **if one of these ever disagrees with the technical doc it links to, the technical doc
is right and this one is stale.** Say so and we'll fix it.

| Topic                       | The real spec                                                                      |
| --------------------------- | ---------------------------------------------------------------------------------- |
| What a contract may contain | `contracts/` — the schemas and where the line falls                                |
| The decision behind it      | [`docs/ADR/0001`](../ADR/0001-component-contracts-carry-what-the-source-cannot.md) |
| How to author a component   | `packages/react/src/components/README.md`                                          |
| The prop vocabulary         | `.ai/maps/prop-map.md`                                                             |
| How we read the Figma file  | `.figma/README.md`                                                                 |
