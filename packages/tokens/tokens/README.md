# Token source

**Authoring format: [DTCG](https://tr.designtokens.org/format/)** — every token is `$value` +
`$type`, and a token that references another uses `{dot.path}`.

This directory is **empty on purpose.** The token set is measured from the design source by hand,
reviewed, then committed here — see [`../../../.figma/README.md`](../../../.figma/README.md) for
how to read the file and what it can and cannot tell you. An invented token set is worse than none:
it looks authoritative and nobody re-checks it.

## 1. File naming

One file per group: `<group>.json`. Split by _what the token is_, never by _where it is used_.

```
color.palette.json     primitives — raw ramps, no meaning
color.semantic.json    roles — aliases into the palette
space.json  radius.json  typography.json  border.json  shadow.json  motion.json
```

## 2. Tiers — and the rule that makes them worth having

Tokens resolve top-down through `var()`:

| Tier               | Example                                      | May reference             |
| ------------------ | -------------------------------------------- | ------------------------- |
| **Primitive**      | `color.indigo.500` = `#5146e6`               | nothing — it is a literal |
| **Semantic**       | `color.brand.primary` = `{color.indigo.500}` | primitives only           |
| **Component slot** | `color.fill.loud`                            | semantics only            |

**A component styles against the group-less roles** (`--ds-color-fill-*`, `--ds-color-border-*`,
`--ds-color-on-*`), never against a branded family like `--ds-color-brand-*`. Those roles are what
a `variant` prop re-points, so a component styled against them picks up every variant for free.
Naming a branded family in a component pins it to one colour and is almost always a mistake.

## 3. From a Figma variable to a token

The mapping rule is **data, not an assumption baked into a script** — it lives in
`.figma/manifest.json → identity.variableNaming`, and until it has been measured against the real
file it is flagged `separatorUnknown: true`. Read it before writing a token.

The trap it records: the observed Figma variables carry a `-ds` infix (`weave-ds-space-3`) that is
part of the **Figma** name and must **not** survive into the CSS custom property.

```
weave-ds-surface-primary   ->  --ds-surface-primary   ->  surface.primary   (DTCG path)
weave-ds-space-3           ->  --ds-space-3           ->  space.3
```

## 4. Naming rules

- **kebab-case** for every segment. `interactive-selected-bg`, never `interactiveSelectedBg` and
  never the run-on `interactiveselectedbg`.
- **One scale vocabulary per dimension.** If radius is a t-shirt scale (`s`/`m`/`l`), spacing does
  not get to be a numeric index. Two naming systems in one file is a defect the exploration report
  should raise, not a thing to reproduce.
- **A numeric step is an index, not a value.** If `space.3` is `8px`, say so in `$description` —
  otherwise every reader guesses, and half of them guess `3px`.
- **No component-specific tokens in the global namespace.** A token used by exactly one component
  is that component's business; expose it as an unprefixed component property (see
  `packages/react/src/components/README.md` §4) rather than adding it here.

## 5. Modes and themes

If the system has more than one theme, model it as **one file per axis**, composed as classes —
not as a `light`/`dark` key inside every token. That keeps a new theme to one new file rather than
an edit to every existing one.

A system with only one theme should say so out loud in the exploration report. Dark-only _by
decision_ is fine; dark-only _by omission_ is a finding.
