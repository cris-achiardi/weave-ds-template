# wc-sandbox

A one-page app that renders the same fifteen contracts as web components — **in plain HTML, with no
framework in the document at all.**

```bash
pnpm dev:wc        # http://localhost:4303
pnpm dev:angular   # :4302
pnpm dev:vue       # :4301
pnpm dev           # :4300 — React
```

## View source

`index.html` is hand-written markup. Every other sandbox in this repo is a component tree in a
framework's own language; this one is a document. `src/main.ts` imports the component definitions —
a side-effect import, because each generated module ends in `customElements.define` — and wires
three readouts with `addEventListener`.

That is the strongest single result of the four sandboxes: **these components run with nothing
installed.**

## The theme files could NOT be copied, and that is the finding

The React, Vue and Angular sandboxes share their `<Name>.theme.css` byte for byte. This one cannot:
a descendant selector over data attributes does not cross a shadow boundary. The files here are the
same values in the shadow grammar —

```text
[data-ds-component='Button']                       ->  :host
[data-ds-component='Button'] [data-ds-part='x']    ->  [part='x']
[data-ds-component='Button'][data-ds-size='s']     ->  :host([size='s'])
[data-ds-component='Button'][aria-checked='true']  ->  :host([checked])
[data-ds-component='Button']:disabled              ->  :host([disabled])
```

— translated mechanically from `apps/react-sandbox` and then checked. **Not one declaration
changed**: every colour and every length is the React sandbox's, unedited. What the shadow boundary
costs is the selectors and nothing else, and that is the useful half of the result.

The translation had one thing it could not do mechanically, and it is a real obligation rather than
a quirk: `:empty` on an icon wrapper. React renders nothing into an unfilled slot, so the element is
genuinely empty; a shadow root always contains the `<slot>`. The component reflects `has-icon-start`
on a `slotchange` instead, and the rule became `:host(:not([has-icon-start]))`.

## What is rendering

`src/components/` holds **generated** components:

```bash
node packages/wc/src/emit/emit.mjs Switch --out apps/wc-sandbox/src/components
```

That produced `Switch/`, and the same command produced `Field/`, `Accordion/`, `AccordionItem/`,
`RadioGroup/`, `RadioItem/`, `Tooltip/`, `Button/`, `Checkbox/`, `TextField/`, `Slider/`, `Dialog/`,
`Tabs/`, `TabItem/` and `TabPanel/` — each one a `.ts` custom element, its structural CSS, a theme
file and a barrel. Nothing comes from `@ds/wc`, which exports no components.

## Driven, and what that took

The React sandbox labels every specimen `works` / `partial` / `shell` because someone drove each one
against its contract key by key. This page has not been through that full process, so it carries no
verdicts — but it HAS been driven, and the following were checked in Chrome:

the switch toggles, announces `ds-checked-change`, writes `aria-checked` on the inner element and
the attribute on the host, and follows a property written from outside; a read-only switch refuses;
the tri-state checkbox resolves `mixed` to `checked`; enumerated defaults are present in the DOM;
the accordion expands and unhides its panel; tab arrow-keys move focus, carry the selection and the
roving tab stop, and land on the disabled tab without selecting it; the slider steps by `pageStep`,
updates `aria-valuenow`, and **the page's readout updates**; radio arrows skip the disabled member
and wrap; the dialog opens with `showModal()`, puts focus on its first slotted button, makes the
page behind genuinely inert, syncs its state back when the platform closes it, and reopens; typing
reaches the model through the DOM's own `input` event and the Field's error unhides.

**And the styling is identical, not merely similar.** A `TextField`'s computed width, height,
background, border, border-radius, padding, colour and font-size are the same numbers in this build
and the React one, from the same declarations.

### Three bugs the page found that nothing else could

**The first version froze the tab it was opened in.** A member re-registered with its
collection from its own update; the collection announced the change; the announcement made every
member update; every member re-registered. The React, Vue and Angular bindings never had it, because
each compares the incoming entry against the stored one to decide whether to bump its reactivity
counter — this binding has no counter, so the comparison was dropped as unnecessary, and the
comparison was the part that mattered.

It is fixed at the source (a collection announces only when something moved), guarded a second time
(`#update()` refuses to re-enter), and pinned by
`packages/wc/src/behavior/useLinearNavigation.test.ts`, which fails without the fix.

**An axis default lived only in JavaScript.** A property getter falls back to the contract's
default — `getAttribute('hierarchy') ?? 'secondary'` — and every script that reads it gets the right
answer. A stylesheet cannot: `:host([hierarchy='secondary'])` matches an ATTRIBUTE, and an unset
button had none, so it rendered with no variant styling at all. React, Vue and Angular never meet
this, because a framework prop with a default flows into the rendered attribute on the way past. The
component now writes it down itself.

**`contains()` does not cross a shadow boundary either.** The same family as
`document.activeElement`, and it had to be fixed separately: a member registers its HOST, the
focused node is inside that host's own shadow root, and `element.contains(focused)` — which the
other three bindings use — was false for every member, so the arrow keys did nothing at all.
Climbing needs two different moves because they are two different edges: `parentNode` walks the tree
a node is in, and a ShadowRoot's `parentNode` is null — its `host` is how you leave it.

It is worth recording where these could and could not have been caught. The conformance cases execute
against `@ds/behavior` and passed throughout — they test what an arrow key MEANS, and this was the
binding around them. `pnpm verify` was green. `vue-tsc` and `tsc` were green. **The only thing that
could have found it was opening the page**, which is the same lesson `docs/research/0002` drew about
generated components and is apparently one this repo has to keep relearning.

## The bundle is a quarter the size of the smallest framework build

```text
wc-sandbox        48 kB   (10 kB gzipped)
vue-sandbox       97 kB
angular-sandbox  477 kB
```

Not a fair comparison in every direction — these are dev-shaped builds of a demo page, and the
framework numbers include a runtime that does far more. It is worth writing down anyway, because the
thing it measures is real: this build ships no runtime at all.

## A custom element cannot be redefined, so HOT RELOAD CANNOT WORK HERE

`customElements.define` throws if the tag is already registered, so every emitted module guards with
`if (!customElements.get(tag))`. That guard is correct, and it makes hot reload a lie: regenerate a
component while the page is open, Vite swaps the module, the guard declines to re-register, and the
page keeps running elements backed by the previous class. **The symptom is not an error — it is a
page that stops responding to things that work fine after a refresh.**

Reload the page after regenerating; restart the server if it persists.

No other sandbox here has this constraint. All three frameworks can swap a component's
implementation because the component is theirs; this one's belongs to the browser's registry.

## Two more obligations this sandbox has and the others do not

- **`display` on every host.** A custom element is `display: inline` until a stylesheet says
  otherwise. The emitter answers it with `display: contents`, which is the one answer that is not a
  guess about layout — it removes the host from the box tree so `[part='root']` lays out exactly
  where the light-DOM backends' root element does.
- **`?inline` on the stylesheet imports.** Vite-specific, and the one bundler token in the emitted
  output. It asks for the stylesheet as a string so it can be adopted into the shadow root — a plain
  CSS import would inject it into the page, where these rules can never match. The standard
  replacement is a CSS module script; it is not portable enough yet.
