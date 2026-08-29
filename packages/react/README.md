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

## The font is yours to load

The type tokens **name** a family — `--ds-font-font-family-primary` — but the library never fetches
it. `@ds/react/styles.css` has to import cleanly into an Electron renderer under a CSP with no
remote origins, and a stylesheet that reaches out to a font CDN does not. So loading the face is
the consuming app's job:

```html
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  rel="stylesheet"
  href="https://fonts.googleapis.com/css2?family=Lexend+Deca:wght@300;400;500&display=swap"
/>
```

Weights 300, 400 and 500 are the three the type scale uses. Self-host them instead if your CSP
forbids remote origins — the library does not care where the face comes from, only that the family
resolves.

**If you skip this, nothing fails.** Every component still renders, in the token's `sans-serif`
fallback, and the only symptom is that the type looks slightly wrong — which is exactly the kind of
defect that survives review. Both harnesses in this repo (`apps/sandbox`, `apps/storybook`) load it
themselves for that reason.

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
