# `emit/`

The React backend: templates that turn a contract plus its binding into component source in a
consumer's repo.

**Nothing here is built.** This directory holds the rules the emitter must honour, salvaged from the
hand-authoring contract it replaces, so they are not lost between deciding and building.

## What it will emit, per component

```
<Name>.tsx              markup, ARIA, types. Imports behaviour, does not implement it.
<Name>.structure.css    layout only. Token-free. REGENERATED — do not hand-edit.
<Name>.theme.css        emitted EMPTY, one commented socket per unbound channel. YOURS.
index.ts                local barrel
```

Two stylesheets, not one, and the split is the whole unstyled story:

- **`structure.css` is not decoration.** Some layout declarations _are_ the mechanism behind a
  promise the contract makes in prose. An out-of-flow selection indicator is what makes "selecting
  never changes row height" true. `flex: 1 1 0; min-inline-size: 0` is what makes a label truncate
  instead of widening its row. `isolation: isolate` is what stops a hover wash fading the text above
  it. None of those touch a colour or a token, and stripping them makes the contract lie.
- **`theme.css` is emitted once and never touched again**, because it is the consumer's file. It
  arrives as a list of commented sockets — one per `null` channel in the contract — and the emitter
  must never rewrite it on regeneration.

Regeneration therefore has to distinguish files it owns from files it handed over. Getting that wrong
destroys consumer work, which makes it the highest-risk behaviour in the emitter.

## Rules the emitted TSX must honour

These are the invariants the tooling depends on. They were learned expensively in the hand-authored
flow and none of them stopped being true.

### 1. Every named node carries a part attribute and a matching class

```tsx
<span data-ds-part="icon-start" className={styles.iconStart}>
```

Attribute is kebab-case; style key is camelCase; the tooling converts. Three reasons this is a rule
and not a preference:

1. **CSS Modules hashes class names.** `.root` becomes `Button__root___a1b2c`, which a consumer
   cannot target. `[data-ds-part="root"]` is stable and semantic — it is the styling handle the
   library actually offers, and for an unstyled library it is the _only_ one.
2. **It is what makes the contract checkable.** Part names are read back out of the source, so a
   contract cannot name a node that does not render.
3. **It is what makes the paint surface checkable.** The chain is
   part → class → declarations → `var()` → declared channel. Break the pairing and the check
   silently degrades into a comment.

Read the prefix from `/ds.config.json`. Never hard-code `ds` — `pnpm init-ds` renames it, and a
hard-coded prefix in emitted code survives the rename and breaks silently.

### 1b. Three attribute families, not one

`data-<prefix>-part` was the only one documented. Generated code emits **three**, and a consumer
styling an unstyled library depends on all of them:

| Attribute                 | Carries                                      | Example                       |
| ------------------------- | -------------------------------------------- | ----------------------------- |
| `data-<prefix>-component` | which component this is — the scoping handle | `data-ds-component="Button"`  |
| `data-<prefix>-part`      | which named region                           | `data-ds-part="label"`        |
| `data-<prefix>-<axis>`    | an axis value                                | `data-ds-hierarchy="primary"` |

**Why `component` exists.** Without CSS Modules there is no hashing, so `[data-ds-part="root"]`
would match every component on the page. Something has to scope it. The emitter invented this and
it is now load-bearing.

**Why an axis needs an attribute at all.** A variant that reaches no attribute cannot be styled:
there is no class to select in an unstyled library, so a declared `variant` would generate a prop
that changes nothing. That is exactly what happened before `Button` — `axes` and `whenAxis` sat in
the schema unread, and a contract could declare a full variant surface and produce a component with
no variants.

A state uses none of these where the platform already has an answer — see below.

### 2. States use the platform's own mechanism where one exists

Native pseudo-class for anything the browser owns (`:hover`, `:focus-visible`, `:disabled`). A
`data-ds-state` attribute **only** for a state the browser does not own. Reflecting hover as an
attribute forces JavaScript to track the pointer to do something CSS already does.

Where an ARIA attribute already carries the state — `aria-selected`, `aria-expanded` — style against
that attribute rather than emitting a second copy. Two attributes for one fact can disagree.

**That rule is now executable, and it does not live here.** It is data in
[`@ds/platform-web`](../../../platform-web/README.md) — which ARIA attribute a state maps to, which
roles accept it, whether its `false` is meaningful, which elements have a native `disabled`, and the
pseudo-class for each state the browser owns. The emitter reads it; a Vue or Angular emitter would
read the same file. Twenty conformance cases pin the mapping down, every one of them derived from a
defect this repository actually shipped.

What deliberately did NOT move, so the boundary is a stated line rather than an accident:

| Stays here                                                                                                   | Because                                                                      |
| ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `ATTR_TYPE` / `attrTypeFor`                                                                                  | `ButtonHTMLAttributes` is a React type name                                  |
| `tabIndex`, `readOnly`, `className`                                                                          | React's spellings of DOM names; they belong with `prop-bindings.json`        |
| The `<dialog>` effect topology                                                                               | two effects, a composed ref and a MutationObserver are a SHAPE, not a lookup |
| Three inline branches in `renderPart` (`type="button"`, `disabled` from role, the `aria-expanded` inference) | they consult no table today and unifying them is a behaviour change          |

The last row is a known weakness rather than a design, and it is worth stating in full because
nothing detects it: **the child-part path decides from a part's ROLE where the root path decides
from the element.** So a part declaring `role="button"` is handed a native `disabled` whatever
element it actually renders — and since a child part is only ever a `<button>` when it declares
`activates`, a `role="button"` part without one becomes a `<div disabled>`, which is invalid HTML the
browser ignores. The same split means `type="button"` is applied by two different rules in the two
paths. Unifying them is a behaviour change and needs its own diff.

### 3. Variant axes are real axes, with declared defaults

If the emitter uses `cva`:

1. **Every variant axis is a `cva` axis**, never a bare union handled with a ternary.
2. **Every axis has a `defaultVariants` entry.** That object is the only machine-readable home for a
   variant default — it is not in the type, so no type-level tool can see it.
3. **No generic wrapper around a variant type.** `ResponsiveValue<Size>` resolves to a bare name with
   no values, and every downstream artifact silently gets thinner without failing.

### 4. Props that make the component what it is cannot be overridden

Spread the consumer's props **before** the attributes that constitute the component's identity —
`role`, `id`, the ARIA relationships, `tabIndex`, `type="button"`. A tab whose `role` can be replaced
from outside is not a tab.

Accessibility attributes a consumer may legitimately want to supply — `aria-label` on a decorative
element — go before the spread instead, deliberately, and the contract's `a11y.notes` records which
way each one went and why.

### 5. Event handlers are composed, never overridden

The rule above is about **identity** attributes and it does not extend to handlers. Handlers are
collected per event name and emitted as one inline arrow that calls the consumer's first, then each
primitive:

```tsx
onKeyDown={(event) => { rest.onKeyDown?.(event); dismissal.onKeyDown(event); nav.onKeyDown(event); }}
```

Two failures made this a rule rather than a preference, and neither produced an error:

- **Primitives clobbered each other.** A contract declaring `range`, `dismisses` and a navigation
  pattern pushed `onKeyDown` three times. JSX keeps the last, so two primitives went dead silently.
- **The consumer was clobbered.** No handler name is produced by `surfaceFrom`, so none is ever in
  the props type's `Omit` list — a consumer can always pass one, and with `{...rest}` spread first it
  was overwritten. There is no case where emitting a handler bare is safe.

**Which events terminate the chain.** A handler that guards on `defaultPrevented` and returns stops
everything after it. That is correct for some events and wrong for others, and guessing per handler
produced a bug in each direction inside one review cycle:

| Event            | Guards? | Why                                                                                                                                                            |
| ---------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `keydown`        | yes     | `preventDefault()` means "I claimed this key" and nothing else.                                                                                                |
| `click`          | yes     | Same, and the platform agrees: `preventDefault()` on a click is what cancels a native checkbox's toggle, so guarding makes the output match it.                |
| `pointerdown`    | **no**  | Same idiom, one event earlier: `preventDefault()` there suppresses text selection and the focus change. Guarding stopped a slider from starting a drag at all. |
| `pointermove/up` | **no**  | There it is the ordinary way to suppress selection and scrolling, not a claim — and a drag already owns the pointer. Guarding froze a slider mid-gesture.      |
| `change`         | **no**  | `preventDefault()` cancels nothing natively on a change event, so there is no established meaning to honour.                                                   |

So the chain is self-terminating for the first group only. For the rest, order is load-bearing:
every handler runs.

## Rules that retired with the old flow

For the record, since deleting them silently would lose the reasoning:

- **"Five files per component, hand-written."** Replaced: there are four emitted files and nobody
  writes them.
- **"`<Name>.module.css`, tokens only, every value `var(--ds-*)`."** Replaced by the structure/theme
  split. Emitted CSS now contains _no_ token references at all — the tokens are the consumer's.
- **"Style against group-less role families."** Now advice for a consumer wiring their own tokens,
  not a rule the library can enforce. It moved to `@ds/tokens` as reference-implementation guidance.
- **"Re-export from the package barrel, alphabetically."** Gone. Emitted components live in the
  consumer's repo and this package exports no components.
