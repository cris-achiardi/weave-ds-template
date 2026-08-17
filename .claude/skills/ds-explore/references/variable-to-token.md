# From a Figma variable to a design token

Three names for one thing, and the rules that connect them.

```
weave-ds-surface-primary     Figma variable name
--ds-surface-primary         CSS custom property
surface.primary              DTCG path in packages/tokens/tokens/*.json
```

The mapping rule is **data, not something you infer per token**: it lives in
`.figma/manifest.json → identity.variableNaming` and is the thing to update if it turns out to be
wrong.

## The infix trap

The observed Figma names carry a **`-ds` infix** — `weave-ds-space-3`. It is part of the _Figma_
name (the file's own namespacing) and must **not** survive into the CSS custom property, or every
property ends up `--ds-ds-space-3`.

```
weave-ds-space-3
└──┬─┘ └┬┘ └──┬──┘
 brand  ds   path      -> keep only `path`, prepend the repo's own tokenPrefix
```

## Resolve the separator before generating anything

`separatorUnknown: true` in the manifest means nobody has confirmed whether groups are separated
by `/` (Figma's grouping convention) or `-` (flat names). It decides the DTCG nesting:

```
"surface/primary"   ->  { "surface": { "primary": {...} } }      nested
"surface-primary"   ->  { "surface-primary": {...} }             flat
```

Getting it wrong produces a token set that looks right and cannot be aliased. **Confirm it from a
live read, then clear the flag** — do not clear the flag because the answer seems obvious.

## Which tier is this?

| Signal                                                                             | Tier                                                          |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Value is a literal (`#5146e6`, `8`) and the name is a ramp position (`indigo-500`) | **primitive**                                                 |
| Value is an alias to another variable                                              | **semantic**                                                  |
| Name mentions a component (`control-waveform`, `button-height`)                    | **component slot** — and probably should not be global at all |

A file with no primitives, where every semantic token holds a raw hex, is a **finding**: it means
the palette exists only in the designer's head, and every re-theme is a manual sweep. Say so.

## Known problems in this source file

Already measured and recorded in the manifest. Do not re-derive them; do decide what to do about
them.

| Problem                                                                         | Why it matters                                                                                         |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `space-0/1/3/5` is a numeric index (0, 2, 8, 16); `radius-m` is a t-shirt scale | Two scale vocabularies in one system. Reproducing both bakes the inconsistency into code.              |
| `interactive-selectedbg` is a run-on word                                       | Every other token is dash-separated. One convention has to lose.                                       |
| `control-waveform` is component-specific but global                             | A token used by one component is that component's business, not the system's.                          |
| `UI/Button` line height is `1.2487`; every other style uses `100`               | One is wrong. Generating both produces type that does not line up and nobody knows which was intended. |
| No light/dark axis                                                              | Dark-only _by decision_ is fine. Dark-only _by omission_ means the first theme request is a rewrite.   |

Each of these is an **open question for the report**, not something to fix on the way past. Fixing
it silently is how a decision gets made by whoever happened to be writing the token file.
