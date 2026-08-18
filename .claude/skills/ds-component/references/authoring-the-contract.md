# Authoring the contract

Two files per component, and the line between them is a question.

```
Button.contract.json   agnostic — what it IS, on any framework
Button.react.json      the binding — what it becomes here
```

> **If it would still be true in React Native, it goes in the contract.**

Schemas: `contracts/component.schema.json` and `contracts/react-binding.schema.json`. Reasoning in
[ADR 0002](../../../../docs/ADR/0002-the-contract-specifies-and-the-gate-asserts-parity.md);
`contracts/README.md` has a worked table of which facts land where.

## The rule about repetition

Not "never repeat the code". Sharper:

> **The contract may specify anything. Anything it specifies that the code also expresses is
> asserted equal by `pnpm verify:contract`.**

So the contract **does** declare the axes, their values and their defaults — it has to, or you
could not build from it — and a mismatch fails:

```
[parity] Button: axis "size" — contract says [l | m | s | xl], implementation says [l | m | s]
```

**Where a check is impossible, the old rule still holds.** Purpose, accessibility claims, slot
constraints and token policy are stated once, because there is nothing to compare them to.

Still never write these — derived, and nothing would check them:

| Fact                             | Comes from                |
| -------------------------------- | ------------------------- |
| prop names, types, required-ness | the props interface       |
| descriptions                     | JSDoc                     |
| which parts actually render      | `data-ds-part` in the TSX |

## The contract, field by field

### `intent` — the one that matters most

```json
"intent": {
  "purpose": "Triggers an action in place. The only control that performs rather than navigates.",
  "behaviour": ["Activates on click, Enter and Space.", "While loading it blocks activation but keeps its label."],
  "notFor": ["Navigation — use Link, which renders an anchor and supports open-in-new-tab."]
}
```

This is the written form of the use case. Without it the anatomy below is an opinion rather than a
consequence — there is nothing to have laid it out _from_.

**A purpose that would equally describe three other components means the boundary is wrong.** Say
so rather than writing a vaguer purpose to make it fit.

`notFor` is what stops the component being widened until it means nothing. It is also the field
future-you will thank present-you for.

### `states` — declared once, and classified

```json
"states": {
  "hover":    { "kind": "intrinsic", "visual": "fill lightens" },
  "loading":  { "kind": "authored",  "visual": "busy cursor, label stays" }
}
```

- **`intrinsic`** — the platform provides it. You style it; you never track it.
- **`authored`** — the implementation has to track it.

Getting this wrong is caught: declaring `loading` intrinsic fails, because no platform provides it.
Declaring `hover` authored means you were about to write code to follow the mouse.

Per-part styling may only reference a state declared here.

### `axes` — the buildable part

```json
"axes": {
  "hierarchy": { "values": ["primary", "secondary", "tertiary"], "default": "primary" },
  "size":      { "values": ["s", "m", "l"], "default": "m" }
}
```

Names and values come from `.ai/maps/prop-map.md` §1. A component **narrows** an axis; it never
invents a value. Checked against the `cva()` call in both directions — a missing axis and an extra
one both fail.

### `semantics` — meaning, not markup

```json
"semantics": { "role": "button", "focusable": true }
```

`role`, not `element`. `<button>` and `Pressable` are the same meaning on two platforms; the
element is a binding concern.

### `a11y` — unfalsifiable, and worth writing anyway

Nothing checks this. A wrong role or an optimistic contrast claim passes every gate. Write it as a
statement of intent a human reviews, and put the most weight on what the component **cannot**
enforce:

```json
"notes": ["Icon-only usage needs an aria-label from the consumer. Nothing here can enforce it."]
```

### `anatomy` — pieces and token policy

See `token-policy.md` for `paints`. Each node is a named region with a job, not a div.

## The binding, field by field

Small by construction. Growing past a handful of fields means something agnostic leaked in.

```json
{
  "component": "Button",
  "contract": "./Button.contract.json",
  "framework": "react",
  "element": "button",
  "refTarget": "root",
  "classNamePassthrough": "root"
}
```

| Field                  | Why it is here and not in the contract                                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `element`              | there is no `<button>` in React Native                                                                                                      |
| `elementByProp`        | polymorphism via an `as` prop is a React idiom                                                                                              |
| `refTarget`            | refs are a React concept, and calling `.focus()` on the wrong node is undiscoverable                                                        |
| `classNamePassthrough` | names the node a consumer's styles can reach — the blast radius                                                                             |
| `propOverrides`        | only when the framework or a base library already owns the canonical name. Requires a reason; a rename without one is drift with paperwork. |

## Leave a field out rather than guessing

Everything except `component`, `status`, `intent` and `anatomy` is optional.

**An absent field is an honest "not decided". A plausible wrong one passes every check here and
misleads every reader after you.** If you left something out because you did not know it, say so
when you report back — that sentence is worth more than a filled field.

## Check your own work before the gate does

```bash
pnpm contract <Name>          # read the merged view back
pnpm verify:contract          # then let the gate check it
```

The gate proves the contract is _legal_. Reading the merged view is the only thing that proves it
is _true_.
