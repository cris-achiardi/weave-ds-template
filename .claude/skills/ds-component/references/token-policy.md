# Token policy

`paints` declares **which family of token is permitted to supply a CSS channel** — a namespace
prefix, never a value.

```json
"paints": {
  "background-color": "--ds-color-fill-",
  "border-color": ["--ds-color-border-", "literal"],
  "opacity": "literal"
}
```

## Why a prefix and not a value

If the contract held `background-color: var(--ds-color-fill-loud)`, it would be a second copy of
what the stylesheet says — and the stylesheet is the one the browser reads, so the contract would
be the copy that rots.

A prefix states _intent_ and lets the implementation move. `pnpm report:paints` resolves the real
declaration, follows `var()` fallback chains to their last resort, and reports what it lands on
against this prefix.

## Prefer group-less role families

```json
"background-color": "--ds-color-fill-"      // good
"background-color": "--ds-color-brand-"     // almost always wrong
```

The group-less roles (`--ds-color-fill-`, `--ds-color-border-`, `--ds-color-on-`) are the slots
that a `variant` prop re-points. A component styled against them **picks up every variant for
free**. Naming a branded family pins the component to one colour, and the first time someone needs
`variant="danger"` the whole stylesheet has to be rewritten.

## The three kinds of atom

| Atom                   | Means                                                                                  |
| ---------------------- | -------------------------------------------------------------------------------------- |
| `"--ds-space-"`        | a token prefix — the declaration must resolve into that family                         |
| `"literal"`            | a deliberate non-token value: `transparent`, `0`, `currentColor`, a 1px hairline       |
| `"component-property"` | an unprefixed component knob (`--button-width`) — the documented customization channel |

**`literal` always wants a reason** in the node's `description`. It is legitimate, and it is also
what a hardcoded hex looks like from the outside, so the reason is what separates the two.

## Arrays are a permitted set, not a preference

```json
"border-color": ["--ds-color-border-", "literal"]
```

Read as: _this channel legitimately draws from more than one source across states and variants_.
A border that is `transparent` at rest and a token under an outlined treatment is exactly this.

The checker requires every resolved declaration to match **at least one** entry. It is not ordered.

**Keep them short.** A channel listing three or more sources usually means the node decomposition
is wrong — the thing you are describing is really two nodes.

## What to list, and what not to

List the channels that carry **design intent**: colour, spacing, radius, type, elevation, motion.

Do not list every declaration. A contract with `display: literal` on every node is noise, and noise
is how a reviewer stops reading a file that is mostly signal.

## The invariant this depends on

`report:paints` finds the CSS by pairing the part name with the class name:

```
data-ds-part="icon-start"  ->  .iconStart in Button.module.css
```

**Break that pairing and the token policy silently becomes documentation instead of a check.** The
gate reports a part with no matching class for exactly this reason — it is telling you that this
node's policy is now unverifiable.

This pairing is also why the check is possible here at all. In a shadow-DOM system there is no
part-name → selector mapping, and the equivalent field can only ever be documentation.

## It is a report, not a gate — for now

`pnpm report:paints` never fails the build. Its CSS reading is pragmatic rather than a full cascade
resolution: it does not evaluate media queries, `calc()`, `color-mix()`, or anything that only
resolves at runtime.

A gate whose false-positive rate is unknown gets switched off, and a switched-off gate protects
nothing. Promote it once the findings are a clean baseline you trust.
