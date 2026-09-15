# `@ds/wc`

**The fourth backend, and the first with no framework in it at all.** `class extends HTMLElement`, a
shadow root, and the platform.

It ships **no components**, exactly as the other three ship none.

## Why this one, and why shadow DOM

[ADR 0002](../../docs/ADR/0002-agnostic-contracts-live-in-their-own-package.md)'s table says web
components would falsify _"the contract assumes a virtual DOM and a component-function render
model"_. True, and worth having — but it is not the interesting half.

**The interesting half is that this is the first backend where one stylesheet cannot dress them
all.** React, Vue and Angular all render into the light DOM, which is why
`apps/react-sandbox`'s theme files are copied byte for byte into the Vue and Angular sandboxes and
just work. A shadow root ends that, and a **light-DOM** custom element would not have tested it.

Findings are in [`docs/research/0006`](../../docs/research/0006-the-shadow-boundary.md).

## Deliberately vanilla, not Lit

Lit has a template and a render model, which is exactly the thing ADR 0002 wants falsified. Vanilla
has neither. It is more code and uglier output, and it is the only version that actually tests the
claim — the Lit version is the realistic production recipe and is different work.

## What the platform gives back

Three attribute families the other three emitters each had to invent, reproduce exactly, and
document nowhere, are all **unnecessary** here:

| Other three                   | Here                  | Why                                                  |
| ----------------------------- | --------------------- | ---------------------------------------------------- |
| `data-ds-component="Button"`  | —                     | the shadow root is the scope                         |
| `data-ds-part="label"`        | `part="label"`        | a real platform attribute, with `::part()` behind it |
| `data-ds-hierarchy="primary"` | `hierarchy="primary"` | the host's attributes are scoped by its tag          |

That is not this backend being clever. It is evidence that all three were standing in for scoping
the platform can do itself — and that nothing in the contract system ever defined them.

`delegatesFocus` is a shadow-root option where React's binding carries `refTarget`.
Event listeners are additive, but their ordering still matters: click-driven activation
runs in a later task so a normal host listener can call `preventDefault()` before state
and change notifications are committed. See the [event rules](./src/emit/README.md#5-event-handlers-are-composed-never-overridden).

## What it costs

| Cost                                   | Detail                                                                                                                                                         |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **one fact, two places**               | a state reaches ARIA on the INNER element and is reflected onto the HOST for CSS. `::part()` cannot take an attribute selector, so no single place serves both |
| **the host has no display**            | a custom element is `display: inline` until told otherwise. No other backend hands a consumer this                                                             |
| **an IDREF cannot cross a boundary**   | a tab and its panel are in different shadow roots, so `aria-controls` names nothing. See below                                                                 |
| **no form participation**              | the host is not a form control. `ElementInternals` is its own work and is not done here                                                                        |
| **slot emptiness is invisible to CSS** | a `<slot>` element is always present, so `:empty` never matches. The component reflects `has-<slot>` on a `slotchange`                                         |

### The one thing it cannot do

A literal `aria-label` on a host is forwarded to its internal root when that root has
a semantic role. Changes and removal are reflected too. This lets a consumer name a
TextField, Slider, or icon-only Button without reaching into the shadow root. The
emitter preserves contract-owned roles and `aria-labelledby` relationships; the
latter still take precedence over a literal label.

`aria-controls`, `aria-labelledby` and `aria-describedby` take **IDREFs**, and an IDREF resolves
within a single tree. A `Field`'s control is slotted in from the page; a `TabItem` points at a
`TabPanel` in a different shadow root. Both references name an element that, from where the
reference is written, does not exist.

This is not an emitter shortcut. The platform answer is the **ARIA reflection API**
(`ariaControlsElements` — element references rather than ids), which ships in Chrome and Safari and
not yet in Firefox. It is recorded rather than worked around, because every workaround — moving the
reference to light DOM, duplicating the panel, dropping the relationship — changes what the contract
says.

## What is here

| Path                                         | Holds                                                                 |
| -------------------------------------------- | --------------------------------------------------------------------- |
| [`bindings/`](./bindings/README.md)          | one binding per contract, and the schema governing them               |
| [`prop-bindings.json`](./prop-bindings.json) | how the platform spells the agnostic vocabulary                       |
| [`src/emit/`](./src/emit/README.md)          | the emitter, the shadow CSS grammar, and the rules its output honours |
| [`src/behavior/`](./src/behavior/README.md)  | the interaction primitives — the shortest of the four                 |
| `src/index.ts`                               | a deliberately empty barrel — see the file                            |

## A `shared` state costs three mechanisms

| Contract                             | React   | Vue           | Angular   | Here                         |
| ------------------------------------ | ------- | ------------- | --------- | ---------------------------- |
| `"checked": { "control": "shared" }` | 3 props | `defineModel` | `model()` | attribute + property + event |

Three again, and **not** the same three. React's trio stands in for a language with no two-way
binding; each of these does a genuinely different job — markup and CSS reach the attribute, script
reaches the property, and the event is how the component says it changed.

## Commands

```bash
node packages/wc/src/emit/emit.mjs <Name> --out <dir>   # compile one contract
pnpm dev:wc                                            # the sandbox at :4303
pnpm build:wc                                          # the package
pnpm verify:parity                                     # the four-backend gate
```
