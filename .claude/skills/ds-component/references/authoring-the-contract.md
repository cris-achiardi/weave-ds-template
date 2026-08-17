# Authoring the contract

Field by field, and the rule that governs all of them.

> **Declare only what the source cannot state. Restating a derivable fact is a defect, not
> redundancy.** — `docs/ADR/0001` §3

## What is already derivable — never write these

The reader gets all of this from source at read time. Putting any of it in the contract creates a
second copy that nothing keeps honest, which is the exact failure the record exists to prevent.

| Fact                                | Where it comes from                         |
| ----------------------------------- | ------------------------------------------- |
| prop names, types, required-ness    | the props interface                         |
| variant value sets                  | the `cva()` call                            |
| variant defaults                    | `defaultVariants`                           |
| other defaults                      | the destructuring pattern                   |
| prop descriptions                   | JSDoc                                       |
| which parts and states are rendered | `data-ds-part` / `data-ds-state` in the TSX |

**Before adding any field to a contract, ask whether the source already answers it.** If it does,
the field belongs in the composer, not in the file.

## What only the contract can state

### `status`

```json
"status": { "level": "experimental", "since": "2026-08-17", "note": "…" }
```

`experimental` is the honest default for something new. Promote to `stable` when you would accept
the cost of a breaking change to alter it. A `deprecated` level **requires** `replacedBy` and
`migrationUrl` — a bare deprecation with nowhere to go is how you strand consumers, and the schema
will not let you write one.

### `semantics`

```json
"semantics": {
  "element": "button",
  "elementByProp": { "prop": "as", "map": { "button": "button", "a": "a" } },
  "refTarget": "root",
  "classNamePassthrough": "root"
}
```

- **`element`** — what actually renders. Lives inside the function body, invisible to any type-level read.
- **`role`** — only when set explicitly. A role that duplicates what the native element already
  conveys is a defect, not documentation.
- **`refTarget`** — where the forwarded ref lands. React has no `delegatesFocus`; this is the
  equivalent load-bearing fact, and a consumer calling `.focus()` on the wrong node has no way to
  discover it except by trying.
- **`classNamePassthrough`** — which node absorbs the consumer's `className`. Every declaration on
  that node is overridable from outside whether you intended it or not; recording it makes the
  blast radius reviewable.

### `a11y`

The section nothing can check. A wrong role or an optimistic contrast claim passes every gate, so
write it as a statement of intent that a human reviews.

The most valuable thing you can put here is **what the component cannot enforce**:

```json
"notes": [
  "Icon-only usage (iconStart set, no children) needs an aria-label from the consumer. Nothing here can enforce it.",
  "As a link (as=\"a\") the disabled state cannot use the native attribute, so it sets aria-disabled and tabIndex={-1}."
]
```

### `composition`

What a slot legitimately _accepts_ — the source only says `ReactNode`.

```json
"composition": {
  "children": { "accepts": ["text"] },
  "slots": { "iconStart": { "accepts": ["Icon"], "max": 1 } }
}
```

Every `slots` key must be a prop whose type can hold rendered content. The gate checks that, which
is what stops this becoming a free-text escape hatch.

### `anatomy`

The node tree, and the token policy per node. See `token-policy.md` for `paints`.

```json
"anatomy": {
  "root": {
    "part": "root",
    "element": "button",
    "paints": { "background-color": "--ds-color-fill-" },
    "states": { "hover": { "background-color": "--ds-color-fill-" } },
    "whenProp": { "hierarchy=secondary": { "border-width": "--ds-border-width-" } },
    "parts": {
      "iconStart": { "part": "icon-start", "element": "span" },
      "label": { "part": "label", "element": "span" }
    }
  }
}
```

**`states` vs `whenProp` is the distinction people get wrong**, and the two look identical in a
stylesheet:

- **`states`** — something the component _enters_: `hover`, `focus-visible`, `disabled`, or a
  `data-ds-state` value it sets.
- **`whenProp`** — something an author _sets_: `hierarchy=secondary`, `fullWidth`.

Getting it backwards produces a contract describing styling nobody can trigger. The gate catches
part of it — a `whenProp` value must be a real value of a real prop — but a state that should have
been a prop will pass if a boolean prop of that name exists.

## Leave a field out rather than guessing

Every field except `component`, `status`, `semantics` and `anatomy` is optional. **An absent field
is an honest "not decided". A plausible wrong one passes every check in this repo and misleads
every reader after you.**

If you leave something out because you do not know it, say so when you report back. That sentence
is worth more than a filled field.

## Check your own work before the gate does

```bash
pnpm contract <Name>          # read the merged view back
pnpm verify:contract          # then let the gate check it
```

Step one is the one people skip. The gate proves the contract is _legal_; reading the merged view
is the only thing that proves it is _true_.
