# 0004 — A second backend reading the same contracts

- **Date:** 2026-09-13
- **Author:** cris
- **Status:** report. Measurements and open questions; no decisions.
- **Method:** a Vue emitter written against `packages/contracts` and `packages/platform-web`,
  fifteen contracts compiled into `apps/vue-sandbox`, typechecked with `vue-tsc`, and driven in
  Chrome.
- **Answers a question asked by:**
  [ADR 0002](../ADR/0002-agnostic-contracts-live-in-their-own-package.md), which is held at Draft
  until a second backend exists.

## Why this was done

ADR 0002 states the test it is waiting for, and states it as a specific test rather than a feeling:

> The proof is a second backend: a compiler for another target reads the same contracts and the same
> conformance definitions, and changes NOTHING inside `@ds/contracts` to do it.

It also names the amendment it earned when `@ds/platform-web` was extracted:

> **Adding a web framework must not require a change inside `@ds/platform-web` either.**

This report measures both.

## Headline

**Fifteen of fifteen contracts compiled. `@ds/contracts` was not edited. `@ds/platform-web` was not
edited.**

```
$ git diff --stat main -- packages/contracts packages/platform-web
 (no changes)
```

Every component renders, typechecks under `vue-tsc`, and behaves — arrow-key navigation, roving tab
stops, tri-state activation, range stepping and dragging, and a native `<dialog>` that contains
focus, inerts the page, closes on Escape and reopens.

That is the result ADR 0002 asked for. **It is also a narrower result than it sounds, and the rest of
this report is mostly about why** — starting with that record's own table, which says a second web
framework falsifies only _"the prop and event model is React's idiom in disguise"_.

## What the contract bought, measured

### 1. `control: shared` costs one prop in Vue and three in React

This is the clearest evidence on the page that the contract stayed agnostic, and it is worth stating
as a number.

| Contract says                        | React emits                                    | Vue emits                         |
| ------------------------------------ | ---------------------------------------------- | --------------------------------- |
| `"checked": { "control": "shared" }` | `checked`, `defaultChecked`, `onCheckedChange` | `defineModel<boolean>('checked')` |

React's `defaultChecked` is not a fact about the state. It is a workaround for a language with no
two-way binding, and a contract that had spelled the trio out — as an "agnostic" spec very easily
would — would have made Vue's single `defineModel` unreachable.

[ADR 0004](../ADR/0004-a-state-declares-who-may-set-it-and-props-are-generated-from-that.md) says a
state declares **who may set it**. That is the sentence that bought this, and it was written before
any Vue backend existed.

### 2. One stylesheet dresses both backends, with no edits

`apps/vue-sandbox`'s `<Name>.theme.css` files are copied **byte for byte** from
`apps/react-sandbox`, and the Vue components render identically. A theme file selects on
`[data-ds-component]`, `[data-ds-part]`, `[data-ds-<axis>]`, ARIA attributes and native
pseudo-classes — and not one of those is a framework.

The independently emitted `<Name>.structure.css` files are stronger still:

```
$ diff <(cat apps/react-sandbox/src/components/*/*.structure.css) \
       <(cat apps/vue-sandbox/src/components/*/*.structure.css)
   # 15 differing lines, all of them the same one-line doc pointer added by this branch
```

Two emitters written months apart produced the same CSS from the same contracts. Nothing enforced
that; it fell out.

### 3. `@ds/platform-web` did the job it was extracted to do

Eleven lookup tables were pulled out of the React emitter on the claim that they were web-platform
knowledge rather than React knowledge. That claim was untestable with one backend, and ADR 0002 said
so.

The Vue emitter imports the same fifteen functions, added **no table of its own**, and changed
nothing in `profile.json`. Every ARIA decision in the Vue output — `aria-checked` on a switch,
`aria-selected` on a tab and deliberately _not_ on its panel, `aria-disabled` instead of the native
attribute on a focusable-when-disabled tab, `showModal`/`close`/`open` for a `<dialog>` — came from
the profile.

### 4. The two emitters' assumption lists agree, and where they disagree it is informative

Both emitters print everything they could not derive from the contract. **Diffing the two lists
separates a gap in the CONTRACT from an invention by one BACKEND**, which is a distinction that was
previously unavailable at any price.

| Assumption                                                                  |   React    |      Vue       | Reading                                        |
| --------------------------------------------------------------------------- | :--------: | :------------: | ---------------------------------------------- |
| no structural CSS — the contract has no `layout` block                      |     ●      |       ●        | contract gap, confirmed                        |
| a member contract is not self-contained (cardinality lives on the ancestor) |     ●      |       ●        | contract-set property, confirmed               |
| `data-<prefix>-<axis>` for axis values                                      |     ●      |       ●        | a shared invention nothing defines — see below |
| a valued state with no `between` cycles its values                          |     ●      |       ●        | contract gap, confirmed                        |
| the state→DOM channel                                                       |     ●      |       ●        | both defer to `@ds/platform-web`               |
| how a collection moves focus between members                                |  context   | provide/inject | backend invention, as expected                 |
| what changes a natively edited value                                        | `onChange` |    `@input`    | **see §6**                                     |

The third row deserves its own sentence. `data-<prefix>-<axis>` was invented by the React emitter
and "documented nowhere". A second backend had to reproduce it **exactly**, from nothing but the
other emitter's output, for one stylesheet to dress both. It is not an emitter detail; it is an
undocumented part of the contract system, and it is now load-bearing in two places.

## What it cost

### 5. Three framework-free files are now duplicated

`dismissal.ts`, `linear-navigation.ts` and `range-stepping.ts` are pure decision logic — no
framework, no DOM — and they now exist twice, identically, in `packages/react/src/behavior/` and
`packages/vue/src/behavior/`. So do `emitStructure` and `emitTheme`, which emit CSS.

By `@ds/platform-web`'s own stated rule (_would this still be true in a Vue, Svelte or Lit backend
rendering the same DOM?_) all of it belongs in the platform package.

**It was copied rather than moved on purpose**, and the reason is methodological: moving shared code
into the platform layer while building the thing that proves it is shared destroys the measurement.
The duplication IS the measurement. Deduplicating is separate work with its own diff.

The drift risk is real and is now gated rather than trusted. `pnpm verify:parity` fails if a copy
diverges, because **each backend's conformance suite runs against its own copy** — the two could
silently disagree about what Escape does while both suites stayed green.

### 6. The two backends wire a different editing event, and both are right

React wires a natively edited value to `onChange`. That is React's **synthetic** event and fires per
keystroke. The DOM's own `change` event fires on blur, so a Vue emitter wiring `@change` would
produce a text field that updates when focus leaves it — a real behavioural difference, from one
contract, with nothing anywhere reporting it.

The contract says only that the element edits its own value, which is correct: naming either event
would have put one framework's runtime into the specification. But note what that means — **the
contract cannot express "as the user types" versus "when they are done"**, and those are different
products. Today the answer is whatever each emitter's author chose.

### 7. The bindings duplicate platform knowledge

All fifteen `element` values in `packages/vue/bindings/` are identical to the fifteen in
`packages/react/bindings/`, because which element carries a role is a web-platform fact. Fifteen
contracts × N backends repeating the same string is the same class of misfiling that produced
`@ds/platform-web` in the first place, one level down.

Gated for now (`pnpm verify:parity` fails when two bindings disagree), not moved, for the reason in
§5.

The Vue binding schema is meanwhile **smaller** than React's by two fields, and the absence is a
finding rather than an omission: Vue merges a consumer's `class` onto the root itself and exposes
the root element as `$el`, so `classNamePassthrough` and `refTarget` have nothing to record.

### 8. Vue needed MORE emitter work in one place, not less

[`packages/vue/src/emit/README.md`](../../packages/vue/src/emit/README.md) §4 — _props that make the component what it is cannot be overridden_ — is harder to
honour in Vue than in React. Vue's default drops unrecognised attributes onto the root **after** the
element's own bindings, so a consumer could replace `role`, `type` or `id` from outside. The emitter
has to set `inheritAttrs: false` and bind `$attrs` explicitly first, which then also disables Vue's
automatic `class` and handler merging and forces §5's composed handlers to be written by hand.

Worth recording because the intuition runs the other way: the framework with more built-in
conveniences needed more deliberate work to satisfy a rule about not being overridable.

## Three bugs this found that nothing else would have

Each produced no error from any tool the repo had before this branch.

1. **`Set.add` takes one argument.** `vueImports.add('ref', 'watchEffect', 'onBeforeUnmount')`
   silently kept only `ref`, and the emitter reported success, because nothing an emitter does
   resolves an import. Caught by `vue-tsc` on the emitted output — the same way three defects were
   caught in emitted TSX by giving the React sandbox a tsconfig.
2. **A parameter shadowed a model.** Every collection spells its member identity `value`, and in Vue
   the selection model is a real binding also called `value`. `function toggle(value: string)` made
   `value.value = value` read the parameter's own `.value` — `undefined` on a string — and write it
   back. It compiled, it ran, and selecting a tab did nothing.
3. **An array prop default must be a factory.** `defineModel<string[]>('value', { default: [] })`
   would have been ONE array shared by every accordion on the page. Vue's types reject it; plain
   `tsc` would have said nothing, because a `.vue` file has no types until the SFC compiler splits
   it.

## What this does NOT prove

Restating ADR 0002's own table, because a green result invites over-reading:

| Target                | What it would falsify                                                         |  Done?  |
| --------------------- | ----------------------------------------------------------------------------- | :-----: |
| Vue, Angular, Svelte  | that the prop and event model is React's idiom wearing agnostic clothing      | **yes** |
| Web components        | that the contract assumes a virtual DOM and a component-function render model |   no    |
| React Native, Flutter | that the contract assumes CSS, a cascade, and a document at all               |   no    |

The third row is the sharp one and is untouched. Both backends emit two **stylesheets**; there is no
stylesheet in Flutter. Both read `@ds/platform-web`, which is element names and ARIA attributes and
would be useless to either. Both resolve `visibleWhen` to a `hidden` attribute. None of that was
challenged here, and this report should not be cited as though it had been.

Two more limits worth naming:

- **Vue was written by someone who had just read the React emitter.** Convergent output is weaker
  evidence than it looks when one author held both. A backend written by someone who had never seen
  the first would be a better test, and nothing here substitutes for it.
- **The Vue sandbox is not graded.** The React sandbox labels every specimen `works` / `partial` /
  `shell` because a person drove each one against its contract key by key. The behaviours listed in
  `apps/vue-sandbox/README.md` were exercised in Chrome and passed; that is less than the React
  page's bar, and the Vue page deliberately claims nothing.

## Open questions

1. ~~**Do the three pure cores, `emitStructure`/`emitTheme`, and the bindings' `element` move into
   `@ds/platform-web`?**~~ **ANSWERED, and the answer was "no, and not to one place either."** The
   suspicion in the second half of this question decided it: `emitStructure` emits CSS, so a platform
   package holding it would have quietly decided that every backend targets a document. Three homes
   rather than one — `@ds/behavior` for the pure cores (more agnostic than the web profile, not
   less), `@ds/emit-web` for the CSS and the contract reading (the fourth layer this question guessed
   at), and the bindings' `element` left where it is, gated. See open question 2 in
   [0005](./0005-a-third-backend-and-what-only-it-could-find.md).
2. **Where does "as the user types" versus "when they are done" get said?** §6. It is a product
   decision the contract currently cannot express, and each emitter answers it by accident.
3. **Does `data-<prefix>-<axis>` become a specified part of the contract system?** Two backends now
   depend on it and nothing defines it. It is the one invention a third backend could get wrong
   while passing every gate in the repo.
4. **Can ADR 0002 move to Accepted?** Its own stated condition is met. Its own stated _doubt_ — that
   a second web framework proves much less than it appears to — is unchanged. That is a decision, and
   decisions do not belong in this folder.
5. **Does `pnpm contract`, `pnpm prop-map` and `report:paints` living in `packages/react/scripts/`
   still make sense?** They are invoked from the root, govern the whole repo, and now describe one
   of two backends. `prop-map.md` is generated from the canon plus **React's** bindings alone.
