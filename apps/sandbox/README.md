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

## Adding a component to it

`vite.config.ts` aliases `@ds/react` to `packages/react/src/index.ts`, so you get hot reload
against source with no build step in between.

```tsx
import { Button } from '@ds/react';

<Specimen name="Button">
  <Button hierarchy="primary">Start recording</Button>
</Specimen>;
```

The page styles itself with plain CSS on purpose — it is the harness, not the system. Styling the
harness with the system's own tokens would make a token bug look like a layout bug.
