# vue-sandbox

A one-page Vite app that renders **Vue** components generated from the same fifteen contracts
[`apps/react-sandbox`](../react-sandbox/README.md) renders in React.

```bash
pnpm dev:vue   # http://localhost:4301
pnpm dev       # http://localhost:4300 — the React one
```

**Both ports at once is the point.** This app is not here to support Vue; it is the instrument for
the question [ADR 0002](../../docs/ADR/0002-agnostic-contracts-live-in-their-own-package.md) is held
at Draft waiting on — put one contract through two backends, and do you get the same component?
Findings are in
[`docs/research/0004`](../../docs/research/0004-a-second-backend-reading-the-same-contracts.md).

## What it is rendering

`src/components/` holds **generated** components, and the sandbox is standing in for a consumer:

```bash
node packages/vue/src/emit/emit.mjs Switch --out apps/vue-sandbox/src/components
```

That produced `Switch/`, and the same command produced `Field/`, `Accordion/`, `AccordionItem/`,
`RadioGroup/`, `RadioItem/`, `Tooltip/`, `Button/`, `Checkbox/`, `TextField/`, `Slider/`, `Dialog/`,
`Tabs/`, `TabItem/` and `TabPanel/` — each one a `.vue` single-file component, its structural CSS, a
theme file and a barrel, from the matching contract in `packages/contracts/components/`. Note what
the imports in `src/App.vue` do **not** say: nothing comes from `@ds/vue`, because that package
exports no components.

## The theme files are copied from the React sandbox, byte for byte

That is the demonstration rather than a shortcut. `<Name>.theme.css` is the CONSUMER's file; it
selects on data attributes the contract produced and contains no framework at all. If the two
backends have really compiled one specification, **one stylesheet has to dress both** — and it does,
without a single edit.

The generated `<Name>.structure.css` files are not copied. They are emitted independently by the two
emitters and come out byte-identical apart from one comment line, which is the stronger version of
the same result.

## No verdicts on this page

The React sandbox carries a status board labelling every specimen `works`, `partial` or `shell`,
because someone drove each one in a browser key by key. Nothing here has been through that process
end to end, so nothing here claims it. Copying its neighbour's verdicts would be inventing a
measurement.

What HAS been exercised in a browser, and passed: the switch toggles and follows an outside write;
a read-only switch refuses; the tri-state checkbox resolves `mixed` to `checked`; the accordion
expands and unhides its panel; tab arrow-keys move focus, carry the selection and the roving tab
stop with them, and land on the disabled tab without selecting it; the slider steps by arrow and by
`pageStep` and publishes `--ds-fraction`; the dialog opens with `showModal()`, contains focus,
makes the page behind genuinely inert, closes on Escape, **syncs its model back and reopens**; radio
arrows skip the disabled member and wrap; typing reaches the model through `@input`.

## Restart the dev server after generating into a directory it has not seen

Vite's module graph is built when the server starts; a `theme.css` that appears afterwards is served
correctly and never loaded by the page, so the component renders with no styling and looks like an
emitter defect. It is not one. `pnpm dev:vue` again, and clear `node_modules/.vite` if it persists.

`<Name>.vue` and `<Name>.structure.css` are overwritten on every run. `<Name>.theme.css` is emitted
once, empty, and then belongs to whoever fills it.

## Typechecking needs `vue-tsc`, not `tsc`

A `.vue` file's types only exist once the SFC compiler has split it, so plain `tsc` reports nothing
at all and looks exactly like a pass. `pnpm typecheck` runs `vue-tsc` for this app, and it earns its
place: the array-default bug in the emitter — a `[]` literal shared across every instance of a
component — was caught here and nowhere else.

## Adding a component to it

`vite.config.ts` aliases `@ds/vue/behavior` to `packages/vue/src/behavior/index.ts` for hot reload
against source with no build step in between. That alias is for the behaviour runtime; components
are generated into `src/components/` and imported from there.

The page styles itself with plain CSS on purpose — it is the harness, not the system. `sandbox.css`
is copied from the React sandbox so the two pages are visually comparable at a glance.
