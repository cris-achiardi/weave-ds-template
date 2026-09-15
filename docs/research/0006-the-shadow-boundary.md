# 0006 — The shadow boundary

> Update (2026-09-15): [ADR 0005](../ADR/0005-unsupported-contract-claims-are-non-conforming.md) corrects the historical IDREF findings below and defines explicit non-conformance reporting.

- **Date:** 2026-09-13
- **Author:** cris
- **Status:** report. Measurements and open questions; no decisions.
- **Method:** a vanilla web-components emitter written against `packages/contracts`,
  `packages/platform-web` and `packages/behavior`; fifteen contracts compiled into
  `apps/wc-sandbox`, a plain-HTML page.
- **Reads with:** [0004](./0004-a-second-backend-reading-the-same-contracts.md) and
  [0005](./0005-a-third-backend-and-what-only-it-could-find.md), which this does not repeat.

## Why this one

[ADR 0002](../ADR/0002-agnostic-contracts-live-in-their-own-package.md)'s table says web components
would falsify _"the contract assumes a virtual DOM and a component-function render model"_. They do,
and that is the least interesting thing they did.

**The reason to build it was that this is the first backend where one stylesheet cannot dress them
all.** React, Vue and Angular all render into the light DOM, which is why one set of theme files is
copied byte for byte between three sandboxes and simply works. A shadow root ends that — and a
_light-DOM_ custom element would have passed without testing anything.

Vanilla rather than Lit, deliberately: Lit has a render model, which is the thing ADR 0002 wants
falsified.

## Headline

**Fifteen of fifteen compiled. `@ds/contracts` unchanged. `@ds/platform-web` unchanged.**

And the finding that only a shadow root could produce:

> **Three of the four attribute families the other backends invented are unnecessary. All three were
> standing in for scoping the platform can do itself — and nothing in the contract system ever
> defined them.**

## What the platform gave back

| Three emitters each invented  | Here                  | Because                                              |
| ----------------------------- | --------------------- | ---------------------------------------------------- |
| `data-ds-component="Button"`  | —                     | the shadow root is the scope                         |
| `data-ds-part="label"`        | `part="label"`        | a real platform attribute, with `::part()` behind it |
| `data-ds-hierarchy="primary"` | `hierarchy="primary"` | the host's attributes are scoped by its tag          |

0005 called `data-<prefix>-<axis>` _"the one invention a fourth backend is most likely to get wrong
while passing every gate"_. The fourth backend did not get it wrong. It did not need it.

That reframes all three. They were never contract facts and never framework facts — they were
**scoping**, hand-rolled, because a light-DOM component has none. Worth saying plainly: the other
three backends still need them, and they are still undefined anywhere.

Three more the platform supplies outright:

- **`delegatesFocus`** is a shadow-root option. React's binding carries `refTarget` and says outright
  that it exists _because React has no delegatesFocus_. 0005 already noted Angular reaching the host
  with `inject(ElementRef)`. Here it is the thing itself rather than a stand-in.
- **Handler composition** is free — `addEventListener` is additive. React and Vue each write a chain
  by hand.
- **Identity attributes cannot be overridden**, more thoroughly than anywhere else: the role and the
  ARIA live inside a shadow root a consumer cannot reach. There is no ordering rule to get right,
  because there is no way in.

## What it cost

### 1. The theme files could not be copied — but the RESULT is identical

**The computed styles match.** A `TextField`'s width, height, background, border, border-radius,
padding, colour and font-size are the same numbers in this build and the React one, from the same
declarations. That is a stronger claim than "it looks close", and it is the one worth making: the
shadow boundary costs the SELECTORS and nothing else.

Getting there needed one decision the first draft got wrong — §3.

### 1b. The translation, in full

The headline cost, and the reason this backend was built. Translating
`apps/react-sandbox`'s fifteen theme files into the shadow grammar was mechanical:

| Translation                                            | Count |
| ------------------------------------------------------ | ----: |
| `[data-ds-part='x']` → `[part='x']`                    |    53 |
| `[data-ds-<axis>='v']` → `:host([<axis>='v'])`         |    20 |
| native `:disabled` → `:host([disabled])`               |    18 |
| `:hover` / `:focus-visible` / `:active` → `:host(...)` |    16 |
| ARIA state → host attribute                            |    13 |
| boolean state → host attribute                         |     3 |
| `:empty` on a slot wrapper → `has-<slot>` on the host  |     2 |
| pseudo-element → `[part='root']::x`                    |     2 |

**Not one declaration changed.** Every colour and every length is the React sandbox's, unedited. What
the shadow boundary costs is the _selectors_ and nothing else — which is a much better result than
"it does not work", and a much worse one than the other three had.

Note what does **not** break: custom properties inherit into a shadow root, so `--ds-*` tokens reach
inside untouched. The token pipeline is unaffected.

### 2. One fact, two places

A state has to reach ARIA on the **inner** element, where assistive technology reads it, and be
reflected onto the **host**, where CSS can select it. `::part()` cannot take an attribute selector,
so no single place serves both.

This is precisely the duplication `packages/react/src/emit/README.md` §2 warns against — _"two
attributes for one fact can disagree"_ — and here it is forced rather than chosen. The emitter writes
both from one decision, so they cannot disagree in generated output; a hand-written component would
have no such protection.

### 3. The host box, and the first answer was wrong

A custom element is `display: inline` until a stylesheet says otherwise. The first version treated
that as a new obligation to hand the consumer — a commented `/* display: ; */` socket, on the
grounds that the emitter guesses no other layout.

**That was solving the wrong problem.** The contract's `anatomy.root` describes the component's
outermost VISUAL box, and in a shadow build that is the element the binding names, not the host
wrapping it. Painting `:host` put the background on a wrapper and left the real control unstyled: a
`TextField` rendered as a styled box containing a bare `<input>`.

The answer is `display: contents` on the host, and root paints on `[part='root']`. The host then
generates no box, `[part='root']` lays out exactly where the light-DOM backends' root element does,
and the translated stylesheet becomes **the same rules under different selectors** rather than the
same rules on a different element. That is what produces the identical computed styles in §1.

### 3b. An axis default has to be written into the DOM

A property getter can fall back to the contract's default —
`getAttribute('hierarchy') ?? 'secondary'` — and every script that reads it gets the right answer.
**A stylesheet cannot.** `:host([hierarchy='secondary'])` matches an ATTRIBUTE, and an unset button
had none, so it rendered with no variant styling at all.

React, Vue and Angular never meet this, because a framework prop with a default flows into the
rendered attribute on the way past. Here the component writes it down itself, on every update,
idempotently.

### 4. An IDREF cannot cross a shadow boundary

**The one thing this backend cannot do.** `aria-controls`, `aria-labelledby` and `aria-describedby`
take IDREFs, and an IDREF resolves within a single tree. A tab and its panel are in different shadow
roots. A `Field`'s control is slotted in from the page. The reference names an element that, from
where it is written, does not exist.

Not an emitter shortcut. The platform answer is the **ARIA reflection API** (`ariaControlsElements` —
element references rather than ids), which ships in Chrome and Safari and not yet in Firefox. The
emitter writes the id anyway and records the assumption, because every workaround — moving the
reference to light DOM, duplicating the panel, dropping the relationship — changes what the contract
says.

**This is the first contract claim any backend has been unable to honour.** Four backends in, that is
worth marking.

### 5. A slot's emptiness is invisible to CSS

React renders nothing into an unfilled slot, so the element is genuinely `:empty` and
`:empty { display: none }` hides it. A shadow root always contains the `<slot>` element whether or not
anything is assigned. CSS cannot ask a slot whether it has assigned nodes, so the component answers
with a `slotchange` listener reflecting `has-<name>` on the host.

Every shipping web-component library does this. It is still a real obligation the contract creates
and cannot express.

### 6. No form participation

The host is not a form control: it does not participate in a form and does not carry a value.
`ElementInternals` and form association are their own piece of work and are not done here. Recorded
rather than solved.

## A `shared` state, four ways

|                   | React   | Vue           | Angular   | Web components               |
| ----------------- | ------- | ------------- | --------- | ---------------------------- |
| `control: shared` | 3 props | `defineModel` | `model()` | attribute + property + event |

Three again, and **not** the same three. React's trio stands in for a language with no two-way
binding. Each of these does a genuinely different job: markup and CSS reach the attribute, script
reaches the property, and the event is how the component says it changed.

The contract said `control: shared` to all four, and none of them argued.

## Four bugs this found, and one of them froze a browser tab

0. **A collection must announce only when something moved.** A member re-registers with its
   collection from its own `#update()`; the collection announced on every call; an announcement makes
   every member update; every member re-registers. An infinite loop, and the symptom was not a wrong
   pixel — it was Chrome becoming unresponsive.

   **Where it could not have been caught, which is the useful part.** The conformance cases execute
   against `@ds/behavior` and passed throughout: they test what an arrow key MEANS, and this was the
   binding around them. `pnpm verify` was green, and so were `tsc` and `vue-tsc`. The other three
   backends never had it, because each compares the incoming entry against the stored one to decide
   whether to bump its reactivity counter — this binding has no counter, so the comparison was
   dropped as unnecessary, and the comparison was the part that mattered. **A reactivity system had
   been doing loop prevention as a side effect, and removing it removed that too.**

1. **A component that changes its own state must announce it.** The emitter emitted the event from
   `#activate` and `#handleInput` and nowhere else — so a slider dragged with a pointer, a dialog
   closed by the platform, and a tooltip dismissed by Escape all changed value and told nobody. It
   typechecked; the symptom was a readout that stopped updating. Fixed by routing every internal
   write through the same emit.
2. **NEITHER `document.activeElement` NOR `contains()` crosses a shadow boundary**, and they had to
   be fixed separately. The first reports the HOST rather than the focused node, so "which member
   holds focus" walks `shadowRoot.activeElement` DOWN until it stops moving. The second is the
   mirror image: a member registers its host, the focused node is inside that host's own shadow
   root, and `element.contains(focused)` — which all three other bindings use — is false for every
   member. Fixing only the first left the arrow keys doing nothing at all.

   Climbing needs two different moves because they are two different edges: `parentNode` walks the
   tree a node is in, and a ShadowRoot's `parentNode` is null — its `host` is how you leave it.

   The shared conformance cases pass either way. This is the clearest example in the repo of a
   defect a binding can have while the decision logic underneath is perfectly right.

3. **`noEmit`, unused privates, and a `<slot>` typed as `Element`.** Caught by typechecking generated
   output, which is the fourth backend in a row where that has paid.

## The other three backends, revisited

Two things 0005 left open are now answered by contrast rather than argument:

- **The `data-<prefix>-*` families are scoping.** See above.
- **`element` in a binding is two questions, not one.** 0005 declined to move the duplicated
  `element` field into a shared package because _"a shadow-DOM backend introduces a host tag
  alongside the internal element, and a shared map designed before anyone has seen that shape is a
  guess."_ That guess is now unnecessary: a shadow binding genuinely has **two** — `<ds-switch>` and
  the `<button part="root">` inside it — where the other three have one. A shared per-component map
  would have to hold both.

## What this still does NOT prove

| Target                | What it would falsify                                                         |     Done?      |
| --------------------- | ----------------------------------------------------------------------------- | :------------: |
| Vue, Angular, Svelte  | that the prop and event model is React's idiom in disguise                    | **yes, twice** |
| Web components        | that the contract assumes a virtual DOM and a component-function render model |    **yes**     |
| React Native, Flutter | that the contract assumes CSS, a cascade, and a document at all               |     **no**     |

The third row is still untouched and is still the sharp one. Every backend so far emits **CSS**,
reads `@ds/platform-web`, and resolves `visibleWhen` to a `hidden` attribute. What this one did
change is the _shape_ of the CSS question: it is now demonstrated that the styling grammar is a
backend concern rather than a contract one, which is a step toward a target that has no stylesheet at
all — but only a step.

Two more limits, stated because a fourth green result invites more over-reading than a third:

- **The page is driven but not graded.** Every behaviour listed in `apps/wc-sandbox/README.md` was
  exercised in Chrome and passed — the same bar the Vue and Angular sandboxes meet, and a lower one
  than the React page, which carries `works` / `partial` / `shell` per specimen.

  Getting there took three rounds. The browser automation used for the first three sandboxes
  stopped responding partway through this one, and that was not a tooling failure: **the page was
  hanging the browser.** Two further defects were only visible once it loaded — §3 and §4 below.

- **`apps/wc-sandbox` is not graded**, like the Vue and Angular sandboxes.

## Open questions

1. **Do the `data-<prefix>-*` families get specified, or replaced?** Three backends depend on them and
   the fourth proved they are scoping. Specifying them is the cheap answer. The interesting one is
   whether a light-DOM backend could adopt `part` and `:host`-shaped conventions instead, and share
   more of the theme.
2. **Does `Field` keep an ARIA relationship it cannot honour in one backend?** The contract states it,
   three backends deliver it, one cannot. That is a decision about what a contract claim MEANS when a
   platform cannot express it — the first time this repo has had to ask.
3. **Does the binding schema grow a second element field?** See above. Not urgent; nothing is broken.
4. Carried forward, unchanged: where "as the user types" versus "when they are done" gets said
   (0004 §6); whether `pnpm contract` and `prop-map` should still live in `packages/react/scripts/`
   now that they describe one of **four** backends.
