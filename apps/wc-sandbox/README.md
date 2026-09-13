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

## Not graded

The React sandbox labels every specimen `works` / `partial` / `shell` because someone drove each one
in a browser key by key. Nothing here has been through that, so nothing here claims it.

## The bundle is a quarter the size of the smallest framework build

```text
wc-sandbox        48 kB   (10 kB gzipped)
vue-sandbox       97 kB
angular-sandbox  477 kB
```

Not a fair comparison in every direction — these are dev-shaped builds of a demo page, and the
framework numbers include a runtime that does far more. It is worth writing down anyway, because the
thing it measures is real: this build ships no runtime at all.

## Two obligations this sandbox has and the others do not

- **`display` on every host.** A custom element is `display: inline` until a stylesheet says
  otherwise. The translated themes set it because the React themes already carried layout in the
  wrong file; a theme written from scratch would have to remember.
- **`?inline` on the stylesheet imports.** Vite-specific, and the one bundler token in the emitted
  output. It asks for the stylesheet as a string so it can be adopted into the shadow root — a plain
  CSS import would inject it into the page, where these rules can never match. The standard
  replacement is a CSS module script; it is not portable enough yet.
