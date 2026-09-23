# Weave Design System Template

An experimental design-system monorepo where components are **specified once and compiled to whatever framework you need**.

Token pipeline, agnostic component contracts based on
[ds-contracts-poc](https://github.com/southleft/ds-contracts-poc) by
[Southleft](https://github.com/southleft) and [Tpitre](https://github.com/tpitre), prop glossary,
Figma wiring, ADR governance, agent skills and CI. All working.

Initial core component contracts generated from [Base UI](https://github.com/mui/base-ui).

## Thesis

**A component contract compiles to a framework the way a design token compiles to a platform.**

A token is written once in DTCG JSON and a compiler emits every target. Components are
still built the other way: written once per framework.

This repo tests whether they have to be. One agnostic contract per component that holds design intent, one emitter per framework + library combination, and generated source in your repo.

Components currently compile to **four web backends** — React, Vue, Angular, and web components from the same contracts, with no per-backend edits to any of them.

That number is the point. **A contract that compiles to one framework is that framework with extra
steps**, and there is no way to tell the difference from inside a single backend. Each additional one
found defects the others structurally could not see — the write-ups are
[`0004`](./docs/research/0004-a-second-backend-reading-the-same-contracts.md),
[`0005`](./docs/research/0005-a-third-backend-and-what-only-it-could-find.md) and
[`0006`](./docs/research/0006-the-shadow-boundary.md).

## Why it ships without components

Because a component is the _last_ step, an artifact of the system.

Most design systems get built by drawing a button, then arguing about what it should have been. The
arc this template is built for runs the other way:

> **explore → report → decide → build**

You read the design source and write down what is measurably there. That report raises questions.
The questions become decisions with their reasoning attached. The component is built against a
decision that already exists — and the machinery checks that it was.

`packages/react`, `packages/vue`, `packages/angular` and `packages/wc` each ship an emitter, bindings
and behaviour primitives, and **zero components**. `@ds/contracts` holds fifteen contracts, written
to find out what a contract must be able to say before it can be compiled at all. The four sandboxes
hold the generated components those contracts produce. Nothing here is a component library you are
meant to consume as is. I encourage you to modify or build your own emitters based on your product stack.

## Quick start

```bash
pnpm install
pnpm init-ds yourname      # fresh, unbranded checkout only; use your own name
pnpm install               # workspace links move with the scope
pnpm verify                # every gate, green
pnpm dev                   # React sandbox at localhost:4300
```

`pnpm init-ds` runs **once** on a fresh, unbranded checkout, before any components exist, and refuses
to re-brand an initialized repository. Try `--dry` first to see what moves. The scope, the token
prefix and the data-attribute prefix are one decision in three syntaxes; renaming one by hand leaves
a repo that builds green and is wrong. The current identity always comes from `ds.config.json`.

The other three sandboxes render the same fifteen contracts, and running them side by side is the
whole demonstration:

```bash
pnpm dev:vue        # :4301
pnpm dev:angular    # :4302
pnpm dev:wc         # :4303 — plain HTML, no framework in the document
```

## What is in the box

**The specification, and what every backend shares**

|                         |                                                                                  |
| ----------------------- | -------------------------------------------------------------------------------- |
| `packages/contracts`    | **The product.** Agnostic component contracts, their schemas, and the vocabulary |
| `packages/behavior`     | What Escape means, where an arrow key goes. No framework, no DOM                 |
| `packages/platform-web` | The web platform as data — which attribute carries a state, and why              |
| `packages/emit-web`     | What every DOM-emitting backend shares: contract reading, light-DOM CSS          |
| `packages/tokens`       | DTCG JSON → CSS custom properties + typed constants, via Style Dictionary        |

**The backends** — each one holds bindings, an emitter and a prop-binding table, and no components

|                    |                                                                             |
| ------------------ | --------------------------------------------------------------------------- |
| `packages/react`   | React 19, CSS Modules, CVA                                                  |
| `packages/vue`     | `defineModel`, SFCs. It exists to **test** the contract, not to serve Vue   |
| `packages/angular` | Signals. Attaches to elements rather than rendering them                    |
| `packages/wc`      | Custom elements and a shadow root. No framework, and no runtime in the page |

**Everything else**

|                  |                                                                                 |
| ---------------- | ------------------------------------------------------------------------------- |
| `apps/*-sandbox` | Four Vite harnesses at `:4300`–`:4303`, pointed at generated source             |
| `apps/storybook` | Complete on disk, deliberately **not installed** — one line to switch on        |
| `docs/ADR`       | Four decision records. One Accepted, three Draft — pre-v0, most stay Draft      |
| `docs/research`  | Pre-decision space: what is measurably true, ending in open questions           |
| `.ai/maps`       | The prop glossary. Generated, descriptive, CI-gated                             |
| `.figma`         | Which design file we read, how names map, what has been reconciled              |
| `.claude/skills` | Five. `ds-component` is superseded and `ds-figma-component` is blocked — #3, #4 |

## A component is described in two halves

The **contract** (`<Name>.contract.json`) is agnostic and holds what no framework's source can state:
what the component is _for_, which parts exist, which states it can enter and **who may set each
one**, the accessibility commitments, and which family of token is allowed to paint which channel of
which node. Nothing framework-shaped may enter it. The test is one question: _if it would still be
true in React Native, it belongs here._

The **binding** is that framework's half — which element actually renders, where a ref lands, what
the props are called. `checked` + `defaultChecked` + `onCheckedChange` is React's spelling of _this
state can be set from outside and the user can change it_; Vue spells the same fact `modelValue` +
`update:modelValue`. **The contract states the rule and each backend's `prop-bindings.json` compiles
it into that framework's vocabulary** — which is why there is deliberately no `props` block in a
contract, and will not be one. See
[ADR 0004](./docs/ADR/0004-a-state-declares-who-may-set-it-and-props-are-generated-from-that.md).

Restating a derivable fact in a contract is a _defect_, not redundancy — **except where a gate
asserts the two are equal.** That exception is deliberate and narrow. Everywhere a check is
impossible — purpose, accessibility, token policy — the fact is stated once and reviewed by a person.

See [`packages/contracts/schema/README.md`](./packages/contracts/schema/README.md) for where the line
falls, and what the gate costs you if it is ever switched off.

## Gates

```bash
pnpm verify              # the full local gate — run this before pushing
pnpm verify:parity       # the four backends have not drifted apart
pnpm contract <Name>     # what IS this component — source + contract, merged, no build
pnpm report:paints       # token policy vs stylesheet — a REPORT, never a gate
```

Two rules about enforcement, both learned expensively in the systems this template draws from:

- **A contract whose breach produces no build error has to be gated in CI**, not only in
  `pnpm verify` — otherwise it is enforced on whichever machine happens to run verify.
- **A gate that fails on everything on day one gets switched off, and a switched-off gate protects
  nothing.** Uncontracted components, paint findings and extraction warnings therefore **report**
  rather than fail. Promoting one to a gate is deliberate work against a clean baseline.

`verify:parity` only became possible once there was more than one backend: it
fails when a shared core reappears inside a framework package, when the behaviour barrels stop
agreeing, or when two bindings disagree about a root element.

`pnpm test:browser` drives generated components in Chromium, Firefox and WebKit and runs in its own CI job.
It covers the review regressions in accessible names, ARIA references, collection
identity changes, dialog lifecycle, and activation cancellation. See the
[browser test guide](./tests/browser/README.md) for setup and scope.

## What this does not do yet

- **Known accessibility relationships are non-conforming.** Field targets a wrapper instead of
  its supplied control; WC omits cross-member references. Contract and CI reports expose these
  gaps under [ADR 0005](./docs/ADR/0005-unsupported-contract-claims-are-non-conforming.md).
- **Form lifecycle support varies by backend.** WC implements the five declared form controls;
  other backend gaps are explicit in contract reports. See [form support](./packages/wc/forms.md).
- **No `layout` block.** Structure and consumer paint remain separate; component layout needs
  an explicit declaration before an emitter can derive it.
- **Styling is duplicated per sandbox on purpose.** The token package is deliberately empty here; the
  real arrangement is to build it first, so every backend paints from one source.

## New here? Start with the illustrated version

**[`docs/documentation/`](./docs/documentation/)** explains the whole system in plain language, with
diagrams, for people who do not read code. Six short pages: what this is, the two halves of a
component, naming its pieces, which token paints what, the shared vocabulary, and how a Figma file
becomes a component.

## Working in it

- **[`CLAUDE.md`](./CLAUDE.md)** — the entry map. Start here.
- **[`packages/react/CLAUDE.md`](./packages/react/CLAUDE.md)** — library internals.
- **[`packages/contracts/components/README.md`](./packages/contracts/components/README.md)** — the
  authoring contract. The most important document in the repo if you are writing a component.
- **[`packages/vue/README.md`](./packages/vue/README.md)** — the worked example of what adding a
  backend actually costs.

Everything is documented next to the thing it governs. Each README is an index for its own
territory; follow the pointer rather than reading everything at once.

## Requirements

Node ≥ 20, pnpm 10. `typescript` is tilde-pinned deliberately — the reason is in the `//typescript`
comment in `package.json`, and it is not cosmetic: widening it silently thins every contract answer
without any warning.

## Contributing

This is an experimental template, primarily maintained by Cristian Morales. Suggestions and
improvements are welcome.

### Reporting Issues

Found a bug or have a suggestion?
[Open an issue](https://github.com/cris-achiardi/weave-ds-template/issues)

### Proposing Improvements

1. Fork the repository
2. Make your improvements
3. Run `pnpm verify` — the full gate, and CI runs the same one
4. Submit a pull request with a clear description

**Adding a mobile framework backend is the most useful contribution there is**. A new backend is a `packages/<framework>/` with its own bindings, emitter and prop-binding table. Nothing in `@ds/contracts` should have to change to accommodate it — if something does, that is the finding, and it belongs in an issue.

## Links

- **Website:** [giorris.dev](https://giorris.dev)
- **Repository:** [weave-ds-template](https://github.com/cris-achiardi/weave-ds-template)
- **GitHub:** [@cris-achiardi](https://github.com/cris-achiardi)
- **LinkedIn:** [Cristian Morales Achiardi](https://www.linkedin.com/in/cristian-morales-achiardi/)
- **YouTube:** [@giongiorris](https://www.youtube.com/@giongiorris)

## Support

- **Documentation:** [`docs/documentation/`](./docs/documentation/) — the illustrated version
- **Issues:** [GitHub Issues](https://github.com/cris-achiardi/weave-ds-template/issues)
- **Contact:** crmorales.achiardi@gmail.com

---

#### Found this useful? Give us a heart to support the project!

[![Buy Me A Coffee](https://img.buymeacoffee.com/button-api/?text=Buy%20me%20a%20coffee&emoji=&slug=giorris&button_colour=5146e6&font_colour=ffffff&font_family=Comic&outline_colour=ffffff&coffee_colour=FFDD00)](https://www.buymeacoffee.com/giorris)
