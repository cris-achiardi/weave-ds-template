# `@ds/angular`

**The third backend.** Angular bindings, an Angular emitter, and the interaction primitives emitted
components import. It ships **no components**, exactly as [`@ds/react`](../react/README.md) and
[`@ds/vue`](../vue/README.md) ship none.

## Why a third one

The second backend answered [ADR 0002](../../docs/ADR/0002-agnostic-contracts-live-in-their-own-package.md)'s
stated question. This one exists because that record is also honest that a second _web_ framework
proves less than it looks like it does — and because two data points cannot distinguish a fact about
specifications from a coincidence about Vue.

What it found is in
[`docs/research/0005`](../../docs/research/0005-a-third-backend-and-what-only-it-could-find.md).
Fifteen contracts compiled, `@ds/contracts` unchanged, `@ds/platform-web` unchanged — and **one real
defect in `@ds/platform-web` that the first two backends could not see**, because both happened to
do the right thing for reasons of their own.

## The one structural difference

**An Angular component does not render its root element. It attaches to one.**

Every other difference between the three backends is a spelling. This one is not, and it changes the
shape of the binding, the emitter and the consumer's markup:

|                                 | React                          | Vue                            | Angular                                 |
| ------------------------------- | ------------------------------ | ------------------------------ | --------------------------------------- |
| the binding's `element` becomes | markup                         | markup                         | a **selector**                          |
| a consumer writes               | `<Button hierarchy="primary">` | `<Button hierarchy="primary">` | `<button dsButton hierarchy="primary">` |
| root attributes are             | JSX attributes                 | template attributes            | **host bindings**                       |

The alternative — an element selector like `<ds-button>` — was rejected and the reason is not taste.
The host would then be a custom element, and a `<ds-button>` is not a button: no native focus, no
native `disabled`, no implicit role, no form participation. `@ds/platform-web` records all four as
facts about `button`, so a backend that quietly discarded them would be compiling a different
component from the same contract.

The cost is real and it is Angular's, not the contract's: a consumer types more, must know which
element each component wants, and gets **nothing at all** if they guess wrong — `<div dsCheckbox>`
matches no selector, renders an empty div, and reports no error. That happened while this sandbox
was being written.

## What is here

| Path                                         | Holds                                                      |
| -------------------------------------------- | ---------------------------------------------------------- |
| [`bindings/`](./bindings/README.md)          | one binding per contract, and the schema governing them    |
| [`prop-bindings.json`](./prop-bindings.json) | where Angular's idiom differs from the agnostic prop canon |
| [`src/emit/`](./src/emit/README.md)          | the emitter, and the rules its output must honour          |
| [`src/behavior/`](./src/behavior/README.md)  | the interaction primitives, and the ones duplicated        |
| `src/index.ts`                               | a deliberately empty barrel — see the file                 |

## Where it agrees with Vue against React

Both of these matter because they are the shape of the evidence, not incidental detail:

**1. `control: shared` is ONE declaration.** `model<boolean>(false)` creates the input and the
`checkedChange` output together and supports `[(checked)]`. Vue's `defineModel` does the same in one
line. React needs three props — `checked`, `defaultChecked`, `onCheckedChange` — and the third
exists only because React has no two-way binding. **Two independent backends collapsed it the same
way**, which is much stronger evidence than one doing so.

**2. The editing event is the DOM's own `input`.** React wires `onChange`, which is React's
synthetic per-keystroke event and not the DOM's `change` at all. Two of three agree, and the odd one
out is the framework with its own event system.

## What Angular supplies that the other two do not

| React and Vue must write it                               | Angular gets it free                                   |
| --------------------------------------------------------- | ------------------------------------------------------ |
| composing a consumer's event handler with the component's | host listeners use `addEventListener`, so both fire    |
| protecting identity attributes from being overridden      | a host binding applies after the template's attributes |
| threading a ref to the root                               | `inject(ElementRef)`                                   |
| a `className` passthrough decision                        | the consumer wrote the element; their `class` is on it |

`ViewEncapsulation.None` is the one thing it must be _told_. Angular's default rewrites every
selector in a component's stylesheets to include a generated attribute, which would scope them to
the component and break the property the whole system rests on — that one theme file dresses all
three builds. It fails silently: the CSS loads, matches nothing, and the component renders unstyled.

## Commands

```bash
node packages/angular/src/emit/emit.mjs <Name> --out <dir>   # compile one contract
pnpm dev:angular                                             # the Angular sandbox at :4302
pnpm build:angular                                           # the package
pnpm verify:parity                                           # the three-backend gate
```
