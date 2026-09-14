# `emit/`

The Angular backend: templates that turn a contract plus its binding into component source in a
consumer's repo.

Fifteen contracts compile, the output typechecks, and every component has been driven in
`apps/angular-sandbox`.

## What it emits, per component

```
<Name>.ts               a standalone component: host bindings, template, signal inputs
<Name>.structure.css    layout only. Token-free. REGENERATED — do not hand-edit.
<Name>.theme.css        emitted EMPTY, one commented socket per unbound channel. YOURS.
index.ts                local barrel
```

Four files, the same four the other two emitters produce, and the two stylesheets are the same two —
because a stylesheet has no framework in it. See
[`packages/react/src/emit/README.md`](../../../react/src/emit/README.md) for why the split exists;
none of that reasoning changed.

## Rules the emitted component must honour

The React emitter's README states these and earned every one expensively. They did not stop being
true in Angular. What follows is only where Angular differs — read that file first, then
[the Vue emitter's](../../../vue/src/emit/README.md), then this.

### 0. The component ATTACHES to an element; it does not render one

This has no counterpart in the other two backends and it drives everything below.

```ts
selector: 'button[dsSwitch]'; // the binding's `element` plus the prefix and the component name
```

A consumer writes `<button dsSwitch>`. Because the host element is theirs, the component has no root
node in its own template — so every attribute the other two emitters put in markup becomes a **host
binding** here.

The prefix comes from `/ds.config.json`, and `pnpm init-ds` rewrites it: the codemod grew a fourth
rule for exactly this family. Never hard-code `ds`.

### 1. Every named node carries a part attribute

Unchanged, and identically load-bearing. On the host it is a static `host` entry; on inner parts it
is a plain template attribute.

**`ViewEncapsulation.None` is not optional.** Angular's default rewrites every selector in
`styleUrls` to include a generated `_ngcontent` attribute, scoping them to this component. That would
break the one property the whole system rests on — that a theme file selecting on
`[data-ds-component]` dresses the React, Vue and Angular builds alike — and it breaks it silently:
the CSS loads, matches nothing, the component renders unstyled.

### 2. States use the platform's own mechanism where one exists

Resolved by [`@ds/platform-web`](../../../platform-web/README.md), with **one deliberate departure**
that is the most interesting thing this backend found.

`channelFor` returns `rendersFalse: true` for every `native` channel, hardcoded. As a statement
about the web platform that is simply false: `disabled="false"` disables a button exactly as
thoroughly as `disabled=""`. React never renders a boolean DOM prop as an attribute and Vue
special-cases boolean attributes, so both do the right thing for reasons of their own and neither
can see the error. Angular's `[attr.x]` does what it is told, so it is the first backend to read the
field literally enough for the lie to matter — and the symptom is a button that can never be
enabled.

The emitter therefore **ignores `rendersFalse` on the native channel** and always emits `|| null`,
and honours it on the `aria` channel where it is a true statement. The profile is not corrected from
here: a correction smuggled in alongside a move destroys the proof that the move was faithful. It is
recorded in [`docs/research/0005`](../../../../docs/research/0005-a-third-backend-and-what-only-it-could-find.md)
as an open question with its own commit waiting.

### 3. Variant axes are real axes, with declared defaults

`input<'s' | 'm' | 'l'>('m')`. The default is written down because it is not in the type, and no
type-level tool can see it otherwise — the same reason `cva`'s `defaultVariants` and Vue's
`withDefaults` exist.

### 4. Props that make the component what it is cannot be overridden

**Free here, and it is the only backend where it is.** A host binding is applied after the
template's own attributes, so a consumer writing `role="button"` on a tab loses. React has to spread
props before identity attributes to get this; Vue has to disable attribute fallthrough entirely.

### 5. Event handlers are composed, never overridden

**Also free.** Angular attaches host listeners with `addEventListener` rather than assigning a prop,
so a consumer's own `(click)` and the component's host `(click)` both fire, in DOM order, with no
emitter involvement at all. Compare the hand-written chains in the other two emitters.

Which events terminate the chain is unchanged, and it cannot diverge silently because the behaviour
comes from the same shared primitives.

### 6. A template expression can only see members of this class

Angular templates have no access to globals. `[a, b].filter(Boolean).join(' ') || null` — which the
React and Vue emitters both write inline for `aria-describedby` — resolves `Boolean` to `undefined`
and throws.

It throws **inside change detection**, which aborts the entire pass. The visible symptom is not a
broken tooltip: it is every other component on the page silently freezing, with the first render
still on screen looking fine. That is how it shipped in this emitter's first draft and how it was
found — a tab that moved focus but would not change selection.

So the emitter hoists it into a method:

```ts
protected ids(...parts: (string | null)[]): string | null {
  return parts.filter(Boolean).join(' ') || null;
}
```

The same rule is why `snap(value, RANGE)` becomes a `computed` on the class rather than an inline
call in a host binding.

### 7. `inject()` only works in an injection context

A constructor is one; an `afterNextRender` callback is not. Calling `inject(DestroyRef)` inside the
callback throws NG0203 at the first render and takes the page down. The emitter captures it in the
constructor and closes over it.

## What the emitters share now

`emitStructure`, `emitTheme`, `stateSelector`, `partsOf` and the contract loader are **not in this
file**. They were identical in all three emitters — one half reads JSON, the other emits CSS, and
neither knows what a framework is — and they now live in
[`@ds/emit-web`](../../../emit-web/README.md).

They were duplicated on purpose while a second and third backend were built, so that what a backend
costs could be measured before it was optimised away. The proof the move was faithful: all three
backends now emit **byte-identical** `structure.css` for all fifteen contracts.

That package is also explicit about where it stops. Every selector it writes is a light-DOM
descendant selector, and a descendant selector cannot cross a shadow boundary.

## The assumptions it prints

Like the other two, this emitter records everything it could not derive from the contract and prints
the list after every run. **Diffing three lists is worth more than diffing two**, because it
separates three cases rather than one:

- **All three log it** → the gap is in the contract. No structural CSS; a member contract that is
  not self-contained; a valued state with no `between`. These are now as close to settled as this
  repo can make them.
- **Two log it, one does not** → usually the odd one out is doing something framework-specific.
  React's synthetic `onChange` against Angular's and Vue's DOM `input`.
- **Only one logs it** → that backend's invention. The selector; the id counter, because Angular has
  no `useId` where React and Vue 3.5 both do.
