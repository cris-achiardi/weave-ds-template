# angular-sandbox

A one-page Vite app that renders **Angular** components generated from the same fifteen contracts
[`apps/react-sandbox`](../react-sandbox/README.md) and [`apps/vue-sandbox`](../vue-sandbox/README.md)
render.

```bash
pnpm dev:angular   # http://localhost:4302
pnpm dev:vue       # http://localhost:4301
pnpm dev           # http://localhost:4300 — React
```

**All three ports at once is the point.** Findings are in
[`docs/research/0005`](../../docs/research/0005-a-third-backend-and-what-only-it-could-find.md).

## What it is rendering

`src/components/` holds **generated** components, and the sandbox is standing in for a consumer:

```bash
node packages/angular/src/emit/emit.mjs Switch --out apps/angular-sandbox/src/components
```

That produced `Switch/`, and the same command produced `Field/`, `Accordion/`, `AccordionItem/`,
`RadioGroup/`, `RadioItem/`, `Tooltip/`, `Button/`, `Checkbox/`, `TextField/`, `Slider/`, `Dialog/`,
`Tabs/`, `TabItem/` and `TabPanel/`. Nothing comes from `@ds/angular`, which exports no components.

## The markup looks different, and that is the whole finding

```text
React and Vue    <Button hierarchy="primary">Save</Button>
Angular          <button dsButton hierarchy="primary">Save</button>
```

An Angular component attaches to an element rather than rendering one, so **the consumer writes the
element**. Read `src/App.ts` next to `apps/vue-sandbox/src/App.vue` and the difference is on every
line.

Its cost showed up immediately while this page was being written: `Checkbox`'s binding declares
`button`, the first draft wrote `<div dsCheckbox>`, and Angular matched no selector, rendered an
empty `<div>`, and reported nothing at all. React and Vue cannot make that mistake, because the
component chooses its own element.

## The theme files are copied from the React sandbox, byte for byte

The same demonstration the Vue page makes, now with a third data point. `<Name>.theme.css` is the
CONSUMER's file; it selects on data attributes the contract produced and contains no framework. If
the three backends have really compiled one specification, **one stylesheet has to dress all three**
— and it does, with one Angular-only requirement: `ViewEncapsulation.None` on every generated
component, or Angular scopes those selectors to the component and the page renders unstyled with no
error.

The generated `<Name>.structure.css` files are not copied. All three emitters produce them
independently and they come out byte-identical apart from a doc pointer.

## No verdicts on this page

The React sandbox carries a status board labelling every specimen `works`, `partial` or `shell`,
because someone drove each one in a browser key by key. Nothing here has been through that full
process, so nothing here claims it.

What HAS been exercised in a browser, and passed: the switch toggles and follows an outside write; a
read-only switch refuses; a disabled button is genuinely disabled and an enabled one carries no
`disabled` attribute at all; the tri-state checkbox resolves `mixed` to `checked`; the accordion
expands and unhides its panel; tab arrow-keys move focus, carry the selection and the roving tab
stop with them; the slider steps by arrow and by `pageStep` and publishes `--ds-fraction`; the
dialog opens with `showModal()`, contains focus, makes the page behind inert, closes on Escape,
**syncs its model back and reopens**; radio arrows skip the disabled member and wrap; typing reaches
the model through the DOM's own `input` event and the Field's error appears.

## Two tsconfigs, and the second one exists for one flag

`tsconfig.json` sets `noEmit: true`, which is correct for `pnpm typecheck`. `tsconfig.app.json`
turns it off, and that is the file the Vite plugin is pointed at — because the plugin uses it to
drive a real TypeScript emit. With `noEmit` on it emits an **empty module** for every file: no
error, no warning, a served file containing nothing but a sourcemap comment, and a blank page. Real
Angular projects carry this same pair for the same reason.

## Restart the dev server after generating into a directory it has not seen

Vite's module graph is built when the server starts. The Angular plugin also caches its TypeScript
program aggressively, so after editing an emitter and regenerating, use `pnpm dev:angular` again and
clear `node_modules/.vite` if a stale compile persists — a page that still shows the previous bug
after a fix is almost always this.

`<Name>.ts` and `<Name>.structure.css` are overwritten on every run. `<Name>.theme.css` is emitted
once, empty, and then belongs to whoever fills it.

## Adding a component to it

`vite.config.ts` aliases `@ds/angular/behavior` to `packages/angular/src/behavior/index.ts` for hot
reload against source. That alias is for the behaviour runtime; components are generated into
`src/components/` and imported from there.

The page styles itself with plain CSS on purpose — it is the harness, not the system. `sandbox.css`
is copied from the React sandbox so the three pages are visually comparable at a glance.
