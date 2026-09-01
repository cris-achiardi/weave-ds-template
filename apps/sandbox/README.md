# sandbox

A one-page Vite app that renders components from **source**. The fast default harness.

```bash
pnpm dev      # http://localhost:4300
```

## Why this exists alongside Storybook

They answer different questions.

|                             | Sandbox                       | Storybook                                             |
| --------------------------- | ----------------------------- | ----------------------------------------------------- |
| Boots in                    | ~1s                           | ~15–25s                                               |
| Install cost                | tiny                          | ~350 MB                                               |
| Answers                     | "does this render and behave" | "what is the full matrix, and can a stranger read it" |
| In the workspace by default | yes                           | **no** — see `apps/storybook/README.md`               |

Use the sandbox while building. Switch Storybook on when the library is worth browsing.

## What it is currently rendering

`src/components/` holds a **generated** component, and the sandbox is standing in for a consumer:

```bash
node packages/react/src/emit/emit.mjs Switch --out apps/sandbox/src/components
```

That produced `Switch/`, and the same command produced `Field/`, `Accordion/`, `AccordionItem/`,
`RadioGroup/`, `RadioItem/` and `Tooltip/` — each one a TSX, its structural CSS, an empty theme file
and a barrel, from the matching contract in `packages/contracts/components/`. Note what the imports in `src/App.tsx` do
**not** say: nothing comes from `@ds/react`, because that package exports no components. The
components live here, in the consumer's own tree, which is the whole architecture in one import path.

The page labels each specimen `works`, `partial` or `shell`, because the four contracts did not
compile equally and hiding that would make the harness a worse instrument.

**Restart the dev server after generating into a directory it has not seen.** Vite's module graph
is built when the server starts; a `theme.css` that appears afterwards is served correctly and never
loaded by the page, so the component renders with no styling and looks like an emitter defect. It is
not one. `pnpm dev` again, and clear `node_modules/.vite` if it persists.

`Switch.tsx` and `Switch.structure.css` are overwritten on every run. `Switch.theme.css` is emitted
once, empty, and then belongs to whoever fills it — it is the only file in that directory a person
wrote. See `docs/research/0002-compiling-a-contract-into-a-component.md` for what the emitter could
not derive.

## Adding a component to it

`vite.config.ts` aliases `@ds/react` to `packages/react/src/index.ts` for hot reload against source
with no build step in between. That alias is for the behaviour runtime; components are generated
into `src/components/` and imported from there.

The page styles itself with plain CSS on purpose — it is the harness, not the system. Styling the
harness with the system's own tokens would make a token bug look like a layout bug.
