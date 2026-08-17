# How this design system works

Written for designers. No prior knowledge of the code assumed.

The rest of this repo is written for engineers and agents, and it is deliberately precise rather
than friendly. This folder is the friendly version. Read it first, then go to the technical docs
when you need the exact rules.

## Start here

| Read                                                            | When                                                                            |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| [1. What this whole thing is](./01-what-this-is.md)             | You have never seen this repo before                                            |
| [2. The two halves of a component](./02-the-two-halves.md)      | You want to understand the one idea everything else rests on                    |
| [3. Naming the pieces](./03-anatomy-and-parts.md)               | You care about how a component is broken up, and how you style one from outside |
| [4. Which token paints what](./04-tokens-and-paint.md)          | You want to know how "use the token, not the hex" is actually enforced          |
| [5. The shared vocabulary](./05-the-shared-vocabulary.md)       | You are naming a variant and want to know if the name already exists            |
| [6. From Figma to a component](./06-from-figma-to-component.md) | You are handing a design over, or wondering why your variants did not survive   |

Roughly ten minutes each. They build on each other, but each stands alone.

## An important caveat

**These pages explain. They do not decide.**

Everywhere else in this repo, each fact lives in exactly one authoritative place, and everything
else points at it rather than restating it. That rule is what stops documentation drifting away
from the thing it describes.

These pages break that rule on purpose, because an explanation that refuses to restate anything is
useless. So: **if one of these pages ever disagrees with the technical doc it links to, the
technical doc is right and this one is stale.** Say so and we will fix it.

The authoritative versions:

| Topic                         | The real spec                                                                      |
| ----------------------------- | ---------------------------------------------------------------------------------- |
| What a contract may contain   | `packages/react/contract.schema.json`                                              |
| The decision behind all of it | [`docs/ADR/0001`](../ADR/0001-component-contracts-carry-what-the-source-cannot.md) |
| How to author a component     | `packages/react/src/components/README.md`                                          |
| The vocabulary of prop names  | `.ai/maps/prop-map.md`                                                             |
| How we read the Figma file    | `.figma/README.md`                                                                 |

## The one-paragraph version

If you read nothing else:

> A component is described in two halves. The **code** already knows the mechanical things —
> what properties it takes, what values they accept, what the defaults are. The **contract** is a
> small file next to it that records everything the code cannot say: what it really is, what it
> promises about accessibility, and which family of design token is allowed to paint each part of
> it. Neither half is complete alone, and a tool merges them on demand. Writing something in the
> contract that the code already knows is treated as a mistake, because two copies of one fact
> always drift apart.
