# @ds/react

The React component library.

**It ships with no components.** That is this template's intended starting state — components are
built against an accepted decision, not scaffolded in advance. See `docs/ADR/README.md`.

## Consuming it

```tsx
import '@ds/tokens/css'; // once, at the app root
import '@ds/react/styles.css'; // one prebuilt stylesheet
import { Button } from '@ds/react';
```

The package emits ESM **and** CJS, keeps a legacy `main`/`types` pair alongside its `exports` map,
and ships **one prebuilt stylesheet** rather than injecting styles at runtime. Those are choices
made for awkward consumers — a bundler on classic Node resolution ignores `exports` entirely, and
an Electron renderer under a strict CSP with a single global CSS rule cannot handle either runtime
injection or shipped `*.module.css`.

## Styling a component from outside

Class names are hashed by CSS Modules and are not a public surface. Target the **part attributes**
instead — they are stable, semantic, and the thing the library actually promises:

```css
.myToolbar [data-ds-part='label'] {
  letter-spacing: 0.02em;
}
```

`className` merges onto whichever node the component's contract names in
`semantics.classNamePassthrough`, so `pnpm contract <Name>` tells you exactly what a `className`
can reach.

## Working on it

Read [`CLAUDE.md`](./CLAUDE.md) for library internals and
[`src/components/README.md`](./src/components/README.md) for the authoring contract.
