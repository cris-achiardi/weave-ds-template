# Authoring components

**The authoring contract.** Everything the tooling assumes about a component is written down here.
If you are about to write a component, this is the file to have read.

This directory is **empty on purpose.** Components are built against an accepted decision, not
scaffolded in advance — see `docs/ADR/README.md`, then use the `ds-component` skill.

## 1. The five files

```
<Name>/
├── <Name>.tsx             cva + clsx + forwardRef
├── <Name>.module.css      tokens only, no raw values
├── <Name>.contract.json   agnostic — what it IS, on any framework
├── <Name>.react.json      the React binding — element, ref target, className target
└── index.ts               local barrel
```

Then re-export from `../index.ts`, alphabetically. `pnpm verify:contract` fails without it,
because an unexported component is invisible to every consumer and nothing else complains.

## 2. Prop naming — the canon

**Before naming a prop, read [`.ai/maps/prop-map.md`](../../../../.ai/maps/prop-map.md) §1.**

The axes are `size`, `hierarchy`, `variant`, `orientation`, `placement`. A component exposes a
**subset** of an axis's canonical values — never a synonym, never an extra value bolted on.

| Rule          |                                                                                                                                                         |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Props         | `camelCase`                                                                                                                                             |
| Values        | `kebab-case`                                                                                                                                            |
| Booleans      | a bare adjective or state: `disabled`, `loading`, `fullWidth`. Never `is*` / `has*` / `show*` — the prop already reads as a predicate at the call site. |
| Content props | named for the slot, not the content: `iconStart`, not `startIcon` or `leftIcon`                                                                         |

The data half of this canon is `../../prop-map.config.json`; this section is its prose statement.
Keep the two in step.

**Why bother.** A synonym is only visible by comparing value sets _across_ components, which is
exactly what a per-component review cannot see. One person adds `emphasis="high"`, another adds
`hierarchy="primary"`, both reviews pass, and the library now has two names for one idea. The
generated map is the only place that shows up — and it flags rather than blocks, so it is on you
to look.

## 3. Anatomy — `data-ds-part` and `data-ds-state`

**Every named node carries `data-ds-part="x"` and `className={styles.x}` with the same name.**

```tsx
<span data-ds-part="icon-start" className={styles.iconStart}>
```

Attribute is kebab-case; style key is camelCase; the tooling converts.

Three reasons this is a rule and not a style preference:

1. **CSS Modules hashes class names.** `.root` becomes `Button__root___a1b2c`. A consumer cannot
   target it. `[data-ds-part="root"]` is stable and semantic — it is the styling handle the
   library actually offers.
2. **It is what makes the contract checkable.** The gate regexes part names out of the TSX, so a
   contract cannot name a node that does not render.
3. **It is what makes the token policy checkable.** `report:paints` resolves
   part → class → declarations → `var()` chain → declared prefix. Break the pairing and the token
   policy silently degrades from a check to a comment.

**States:** use a native pseudo-class where the browser has one (`:hover`, `:focus-visible`,
`:disabled`). Only add `data-ds-state="x"` for a state the browser does not own — `loading`,
`current`. Reflecting hover as an attribute would force JavaScript to track the pointer to do
something CSS already does.

## 4. Styling

- **`<Name>.module.css`, tokens only.** Every value carrying design intent is `var(--ds-*)`. A raw
  `#5146e6` or `12px` is what `pnpm report:paints` exists to find.
- **Style against group-less role families** — `--ds-color-fill-*`, not `--ds-color-brand-*`. Those
  roles are what a `variant` prop re-points, so a component styled against them picks up every
  variant for free.
- **A component-specific knob is an unprefixed custom property** (`--button-width`), documented in
  the contract as `component-property`. It does not belong in the global token set.
- **One class per named node**, matching its part.

## 5. Variants

```tsx
const buttonVariants = cva(styles.root, {
  variants: { hierarchy: {...}, size: {...} },
  defaultVariants: { hierarchy: 'primary', size: 'm' },
});
```

Three hard rules, each with a reason you can check:

1. **Every variant axis is a `cva` axis.** Not a bare union prop handled with a ternary.
2. **Every axis has a `defaultVariants` entry.** That object is the only machine-readable home for
   a variant default — it is not in the type, so no type-level tool can see it.
3. **No generic wrapper around a variant type.** `ResponsiveValue<Size>` resolves to a bare name
   with no values, and every downstream artifact silently gets thinner without failing.

## 6. What goes in the contract, and what goes in the binding

Two files. The line between them is one question:

> **If it would still be true in React Native, it goes in the contract.**

`<Name>.contract.json` holds purpose, behaviour, states, axes, semantics, accessibility, anatomy
and token policy. `<Name>.react.json` holds the handful of facts that stop being true off React:
the rendered element, where the ref lands, which node `className` merges into.

The contract **does** specify the axes, their values and their defaults — otherwise you could not
build from it. That duplication is safe because `pnpm verify:contract` asserts the two agree; a
mismatch fails the build. Where a check is impossible (purpose, a11y claims, token policy), the
fact is stated once and a human reviews it.

See `contracts/README.md` and
`.claude/skills/ds-component/references/authoring-the-contract.md`.

## 7. Before you call it done

```bash
pnpm contract <Name>      # read the merged view back — does it say what you meant?
pnpm verify:contract      # legality
pnpm prop-map             # any new unreviewed divergence?
pnpm report:paints        # findings are not failures, but read them
pnpm typecheck && pnpm build
```

The first one is the step people skip. The gate proves the contract is _legal_; reading the merged
view is the only thing that proves it is _true_.

## 8. Tests

Optional, and deliberately not gated — `pnpm test` runs with `--passWithNoTests`.

Where a test earns its place it is `<Name>.test.tsx` beside the component. Test **behaviour**, not
the things the contract and the gate already assert: do not write a test that checks a variant class
name, and do not write one that re-states a default. Those are covered, and a test that duplicates
a gate is a third copy of a fact.
