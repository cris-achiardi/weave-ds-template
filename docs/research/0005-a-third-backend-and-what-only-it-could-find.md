# 0005 — A third backend, and what only it could find

- **Date:** 2026-09-13
- **Author:** cris
- **Status:** report. Measurements and open questions; no decisions.
- **Method:** an Angular emitter written against `packages/contracts` and `packages/platform-web`,
  fifteen contracts compiled into `apps/angular-sandbox`, and driven in Chrome.
- **Reads with:** [0004](./0004-a-second-backend-reading-the-same-contracts.md), which this does not
  repeat.

## Why a third one, when the second already answered the question

[ADR 0002](../ADR/0002-agnostic-contracts-live-in-their-own-package.md)'s stated condition was met
by the Vue backend. It was built anyway, for two reasons that 0004 names itself:

1. **Two points cannot distinguish a rule from a coincidence.** When React and Vue disagreed, there
   was no way to tell which of them was the outlier.
2. **0004 was written by someone who had just read the React emitter.** Convergence is weak evidence
   when one author held both. The Angular emitter was written against the contracts and the two
   READMEs rather than by porting, and the places it _refused_ to be the Vue emitter are the
   interesting ones.

## Headline

**Fifteen of fifteen compiled. `@ds/contracts` unchanged. `@ds/platform-web` unchanged.**

And the thing a third backend bought that a second could not:

> **A defect in `@ds/platform-web` that React and Vue are both structurally incapable of seeing.**

## What three backends can say that two could not

### 1. A majority now separates "contract gap" from "backend invention"

Each emitter prints what it could not derive. With three lists the arithmetic changes:

| Assumption                                             |   React    |      Vue       |     Angular     | Reading                                |
| ------------------------------------------------------ | :--------: | :------------: | :-------------: | -------------------------------------- |
| no structural CSS — the contract has no `layout` block |     ●      |       ●        |        ●        | **contract gap, settled**              |
| a member contract is not self-contained                |     ●      |       ●        |        ●        | **contract-set property, settled**     |
| `data-<prefix>-<axis>` for axis values                 |     ●      |       ●        |        ●        | **an undocumented part of the system** |
| a valued state with no `between` cycles its values     |     ●      |       ●        |        ●        | **contract gap, settled**              |
| the editing event                                      | `onChange` |    `input`     |     `input`     | React is the outlier — see §2          |
| how a collection reaches its members                   |  context   | provide/inject |    injector     | backend invention, as expected         |
| the root element                                       |  rendered  |    rendered    | **attached to** | Angular is the outlier — see §3        |
| a stable id root                                       |  `useId`   |    `useId`     |  **a counter**  | Angular is the outlier — see §5        |

The three ● rows are the useful promotion. With two backends they were "both of them hit this"; with
three they are as close to settled as this repo can make them without a non-web target.

Row three deserves emphasis. `data-<prefix>-<axis>` was invented by the React emitter and
"documented nowhere". **Three independent backends now depend on it**, each reproducing it exactly,
because one stylesheet has to dress all three. It is not an emitter detail. It is an undocumented
part of the contract system, and it is the single thing a fourth backend is most likely to get wrong
while passing every gate in the repo.

### 2. React's `onChange` is now demonstrably the outlier, not the norm

0004 reported that React and Vue wire different editing events and that both were right. With a
third data point the shape is clearer: **Angular also wires the DOM's own `input`**. React's
`onChange` is React's synthetic per-keystroke invention; the DOM's `change` fires on blur.

Two of three agree, and the odd one out is the framework with its own event system. The contract is
still right to name neither — and it still cannot express "as the user types" versus "when they are
done", which are different products.

### 3. One backend does not render its root element at all

Everything else across the three is a spelling. This is a difference in kind.

An Angular component **attaches** to an element chosen by its selector rather than rendering one. So
the binding's `element` compiles into `selector: 'button[dsSwitch]'`, every root attribute becomes a
host binding, and **the consumer writes the element**: `<button dsSwitch>`.

What that pressure found:

- **The binding schema got smaller again.** React's has `refTarget` and `classNamePassthrough`; Vue's
  has neither but adds `exposes`; Angular's has neither and no `exposes`. The consumer wrote the
  element, so their `class` is already on it and `inject(ElementRef)` reaches it.
- **`elementByProp` cannot be compiled at all.** An Angular selector is fixed at declaration. The
  emitter refuses such a contract rather than rendering a wrapper and pretending — a wrapper is a
  different DOM and `semantics.role` would land on the wrong node. No contract exercises it today,
  so this is a limit recorded rather than a blocker hit.
- **The cost is the consumer's.** `<div dsCheckbox>` where the binding says `button` matches no
  selector, renders an empty `div`, and reports nothing. That happened while writing the sandbox.

### 4. Two backends now collapse `control: shared` to one declaration

0004 called React's three-prop trio a workaround for having no two-way binding. Angular's `model()`
independently produces the same single declaration Vue's `defineModel` does.

| Contract                             | React   | Vue           | Angular   |
| ------------------------------------ | ------- | ------------- | --------- |
| `"checked": { "control": "shared" }` | 3 props | `defineModel` | `model()` |

**Two independent backends reaching the same collapse** is much stronger than one. ADR 0004 said a
state declares _who may set it_; that sentence is what left room for one declaration or three, and
it was written before either backend existed.

### 5. Angular has no `useId`, and that is a gap in the framework rather than the contract

React has `useId`; Vue 3.5 has `useId`; Angular has neither. The emitter invented a module-level
counter, which is fine in a browser and wrong under server rendering with hydration — which nothing
in this repo exercises. Recorded rather than solved, and listed as an assumption so it cannot be
mistaken for a considered answer.

## The defect only a third backend could find

`channelFor` in `@ds/platform-web` returns, for every native channel:

```js
if (native) return { channel: 'native', attribute: native, rendersFalse: true };
```

`rendersFalse: true` is hardcoded, with no data behind it, and **as a statement about the web
platform it is false**: `disabled="false"` disables a button exactly as thoroughly as `disabled=""`.

It survived two backends because both do the right thing for reasons of their own:

| Backend     | Why it cannot see the error                                                        |
| ----------- | ---------------------------------------------------------------------------------- |
| React       | never renders a boolean DOM prop as an attribute; `disabled={false}` emits nothing |
| Vue         | special-cases boolean attributes; `:disabled="false"` removes it                   |
| **Angular** | `[attr.disabled]` does exactly what it is told — and renders `disabled="false"`    |

The symptom in Angular is a button that can never be enabled. The Angular emitter therefore ignores
`rendersFalse` on the native channel and always emits `|| null`, honouring it only on the `aria`
channel where it is a true statement.

**The profile was not corrected.** This repo's own rule — _a correction smuggled in alongside a move
destroys the proof that the move was faithful_ — applies: the fix belongs in its own commit, with
its own diff, and it changes generated output in all three backends. It is open question 1 below.

This is the clearest possible vindication of ADR 0002's Draft status, and worth stating plainly:
**a package that exists to hold platform truth had a React assumption in it, and only a third
backend was shaped wrongly enough to notice.**

## Three bugs the emitter shipped that nothing else would have caught

Each produced no error from any tool the repo had.

1. **An Angular template expression cannot see globals.** `[a, b].filter(Boolean).join(' ') || null`
   — which both other emitters write inline for `aria-describedby` — resolves `Boolean` to
   `undefined` and throws. It throws **inside change detection**, which aborts the entire pass: the
   visible symptom was not a broken tooltip but every other component on the page silently freezing
   with its first render still on screen. Found by a tab that moved focus and would not change
   selection. Fixed by hoisting the join into a component method.
2. **`inject()` only works in an injection context.** `inject(DestroyRef)` inside an
   `afterNextRender` callback throws NG0203 at first render and takes the page down. Rendering
   stopped at the Dialog specimen and the six specimens before it were left empty.
3. **`noEmit: true` makes the Angular Vite plugin emit an empty module for every file.** No error,
   no warning, a served file containing only a sourcemap comment, and a blank page. Split into
   `tsconfig.json` (typecheck) and `tsconfig.app.json` (build), which is the pair real Angular
   projects carry.

## What it cost

### The duplication is now threefold, and the argument for it has expired

Three copies of `dismissal.ts`, `linear-navigation.ts` and `range-stepping.ts`. Three copies of
`emitStructure` and `emitTheme`. Fifteen `element` values repeated three times.

They were copied so a second backend's cost could be measured before it was optimised away. **That
measurement is taken.** At three copies the reason has run out, and deduplicating is the obvious next
commit. `pnpm verify:parity` now covers all three and keeps them from drifting meanwhile — adding
the third backend to that gate was a one-line change, which is the one piece of evidence in this
report that something was designed well the first time.

### A fourth syntax for the prefix

`pnpm init-ds` already covered the data-attribute, package-scope and custom-property forms of the
prefix. The Angular selector — `<prefix>Button` — is a fourth syntax of the same decision and matched
none of them, so a renamed repo would have kept the old selector in already-generated components
while the emitter produced `<new-prefix>Button`: green everywhere, broken on the next regeneration.
A fourth rule was added, and two unrelated locals matching `<prefix>Config` were renamed so the
rule's blast radius is exactly the selectors.

Worth noting how close that came to shipping: the rule's first version used `` `\b${from}` `` inside
a template literal, where `\b` is the BACKSPACE character. It matched nothing, silently, and the dry
run reported a plausible-looking count from the _other_ rules.

## What this still does NOT prove

Unchanged from 0004, and worth restating because a third green result invites more over-reading than
a second:

| Target                | What it would falsify                                                         |     Done?      |
| --------------------- | ----------------------------------------------------------------------------- | :------------: |
| Vue, Angular, Svelte  | that the prop and event model is React's idiom in disguise                    | **yes, twice** |
| Web components        | that the contract assumes a virtual DOM and a component-function render model |       no       |
| React Native, Flutter | that the contract assumes CSS, a cascade, and a document at all               |     **no**     |

All three backends emit two **stylesheets**, read `@ds/platform-web`, and resolve `visibleWhen` to a
`hidden` attribute. The sharp test is untouched, and three web frameworks agreeing is exactly what
you would expect whether or not the contract is genuinely platform-neutral.

The Angular sandbox is also deliberately ungraded, like the Vue one. The behaviours listed in its
README were exercised in Chrome and passed; that is less than the React page's bar.

## Open questions

1. ~~**Fix `rendersFalse` on the native channel in `@ds/platform-web`.**~~ **CLOSED**, in its own
   commit immediately after this report was written. The fix is a fourth attribute-keyed table in
   `profile.json` rather than a corrected literal in `resolve.mjs` — a literal there is what the bug
   was. The blast radius turned out to be eight lines of generated output across React and Vue and
   none in Angular, and `packages/platform-web/conformance/aria-mapping.json` now pins it as
   `native-disabled-must-not-render-false`.
2. ~~**Move the duplicated cores, the CSS emitters and the bindings' `element` out of the framework
   packages.**~~ **CLOSED**, in its own commit. The answer was three homes rather than one, and the
   suspicion in this question is what decided the split:

   - **`@ds/behavior`** — the three pure cores and their conformance suites, in one copy. NOT in
     `@ds/platform-web`: none of them needs a DOM and all would be true in React Native, so they are
     _more_ agnostic than the web profile and a home inside it would have been a demotion.
   - **`@ds/emit-web`** — contract reading and the two stylesheets. This is the fourth layer this
     question guessed at. Its README is explicit that every selector it writes is a light-DOM
     descendant selector, and that it stops at a shadow boundary.
   - **The bindings' `element` stays duplicated and gated**, because a shadow-DOM backend introduces
     a host tag alongside the internal element, and a shared map designed before anyone has seen that
     shape is a guess.

   Proof the move was faithful: all three backends now emit **byte-identical** `structure.css` for
   all fifteen contracts, and the only change to committed output across 38 files was one comment
   line. `verify:parity` lost its drift check — with one copy there is nothing to drift — and gained
   two: no core may reappear in a framework package, and the three behaviour barrels must export the
   same names.

3. **Specify `data-<prefix>-<axis>`.** Three backends depend on it and nothing defines it.
4. **Where does "as the user types" versus "when they are done" get said?** Carried over from 0004,
   now with a 2–1 split behind it.
5. **`pnpm contract`, `pnpm prop-map` and `report:paints` still live in `packages/react/scripts/`.**
   They are invoked from the root, govern the whole repo, and now describe one of _three_ backends.
   `prop-map.md` is generated from the canon plus **React's** bindings alone.
6. **Does ADR 0002 move to Accepted?** Held deliberately, at the repo owner's direction. Its stated
   condition has now been met twice; its stated doubt is unchanged.
