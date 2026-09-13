# `emit/`

The Vue backend: templates that turn a contract plus its binding into component source in a
consumer's repo.

**This one is built**, unlike its React twin's README, which describes rules for an emitter that was
still being written. Fifteen contracts compile, the output typechecks under `vue-tsc`, and every
component has been driven in `apps/vue-sandbox`.

## What it emits, per component

```
<Name>.vue              a single-file component: markup, ARIA, types
<Name>.structure.css    layout only. Token-free. REGENERATED — do not hand-edit.
<Name>.theme.css        emitted EMPTY, one commented socket per unbound channel. YOURS.
index.ts                local barrel
```

Four files, the same four the React emitter produces, and the two stylesheets are the same two —
because a stylesheet has no framework in it. See
[`packages/react/src/emit/README.md`](../../../react/src/emit/README.md) for why the split exists;
none of that reasoning changed.

**`theme.css` is emitted once and never touched again**, because it is the consumer's file.
Regeneration distinguishes files it owns from files it handed over, and getting that wrong destroys
consumer work.

## Rules the emitted SFC must honour

The React emitter's README states these rules and earned every one of them expensively. They did not
stop being true in Vue. What follows is only where the SPELLING differs — read that file first.

### 1. Every named node carries a part attribute

```vue
<span data-ds-part="icon-start">
```

Identical, and identically load-bearing: `[data-ds-part="root"]` is the styling handle the library
offers, part names are read back out to check the contract, and the paint chain runs
part → declarations → `var()` → declared channel.

No CSS Modules and no scoped styles. A `<style scoped>` block would add Vue's own hash attribute to
every element and give the consumer a second, framework-specific selector for the same node — and
the whole point of the data attributes is that the CONSUMER's stylesheet dresses both backends.
`apps/vue-sandbox` proves it: its theme files are copied byte for byte from the React sandbox.

Read the prefix from `/ds.config.json`. Never hard-code `ds`.

### 1b. Three attribute families, not one

`data-<prefix>-component`, `data-<prefix>-part`, `data-<prefix>-<axis>` — unchanged, and emitted
identically. The emitter logs an assumption about the third one saying it is an invention nothing in
the contract system defines, and that assumption is now stronger rather than weaker: a second
backend had to reproduce it exactly, from nothing but the other emitter's output, for one stylesheet
to dress both.

### 2. States use the platform's own mechanism where one exists

Resolved entirely by [`@ds/platform-web`](../../../platform-web/README.md). **This backend added no
table of its own and changed nothing in the profile**, which is the single strongest result in
`docs/research/0004`: eleven lookup tables were extracted from the React emitter on the claim that
they were web knowledge rather than React knowledge, and the claim was untestable with one backend.

### 3. Variant axes are real axes, with declared defaults

Vue's equivalent of `cva`'s `defaultVariants` is `withDefaults(defineProps<Props>(), { … })`, and it
is emitted from the contract's `axes[*].default` for exactly the reason the React rule gives: a
variant default is not in the type, so no type-level tool can see it unless something writes it
down.

### 4. Props that make the component what it is cannot be overridden

**This is where Vue needs MORE work than React, not less.**

Vue's default (`inheritAttrs: true`) drops every unrecognised attribute onto the root element
_after_ the element's own bindings — so a consumer passing `role="button"` to a tab would win, and a
tab whose role can be replaced from outside is not a tab. The emitter therefore sets
`inheritAttrs: false` and binds `$attrs` explicitly as the FIRST attribute on the root, which
reproduces React's `{...rest}`-before-identity ordering exactly.

Turning fallthrough off also turns off Vue's automatic merging of `class` and of `onX` handlers,
which is why §5 below is emitted by hand rather than inherited.

### 5. Event handlers are composed, never overridden

Collected per event name and emitted as one function that calls the consumer's first, then each
primitive:

```ts
function onRootKeydown(event: KeyboardEvent) {
  (attrs['onKeydown'] as ((e: KeyboardEvent) => void) | undefined)?.(event);
  dismissal.onKeyDown(event);
  nav.onKeyDown(event);
}
```

Every composed handler is deleted from the fallthrough object, or it would be bound twice.

**`onKeydown`, NOT `onKeyDown`.** Vue capitalises only the first letter after `on`, so `@keydown`
arrives in `$attrs` as `onKeydown`. Reading React's spelling here finds nothing: the consumer's
handler is simply never called, the composed chain still runs, and no error is produced anywhere.

**Which events terminate the chain** is unchanged and is a rule rather than a habit — `keydown` and
`click` guard on `defaultPrevented`; `pointerdown`, `pointermove`, `pointerup` and `input` do not.
The reasoning, and the bug each direction produced, is in the React emitter's README. The behaviour
comes from the same shared primitives, so it cannot diverge silently.

## What the two emitters do NOT share, and why that is not tidied up

`emitStructure` and `emitTheme` in [`emit.mjs`](./emit.mjs) are ports of the React emitter's
functions with the framework taken out — and there was nothing to take out. Both emit CSS. The
generated `structure.css` files in the two sandboxes are byte-identical apart from one comment.

They are duplicated rather than shared because **the experiment was to measure what a second backend
costs**, and sharing a file before measuring it is a guess. The same applies to the three
framework-free behaviour cores in [`../behavior/`](../behavior/README.md).

`pnpm verify:parity` gates the duplication so it cannot drift while nobody is looking.
[`docs/research/0004`](../../../../docs/research/0004-a-second-backend-reading-the-same-contracts.md)
reports the measurement, and deduplicating is separate work with its own diff.

## The assumptions it prints

Like the React emitter, this one records everything it could not derive from the contract and prints
the list after every run. **Diffing the two lists is the point.** Where both backends log the same
assumption, the gap is in the contract; where only one does, it is that backend's invention. Two
examples, one of each:

- **Both** log that a member contract is not self-contained — cardinality lives on the ancestor, so
  a member cannot be compiled from its own contract alone. That is a contract-set property.
- **Only this one** logs that the editing event is `@input`. React wires `onChange`, which is
  React's synthetic per-keystroke event; the DOM's own `change` fires on blur. The contract says
  only that the element edits its own value, and it is right not to name either.
