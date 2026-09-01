# `behavior/`

The interaction primitives emitted components **import**. One implementation per entry in the
contract layer's behaviour vocabulary.

**Nothing here is built.** The vocabulary it implements does not exist yet either — see
`packages/contracts/README.md` "Not built yet".

## The deliberate exception

Everywhere else, this project's rule is that a generated component is yours: your file, your repo,
edit it freely. **Behaviour is the exception.** The emitted component will import its primitives from
here rather than have them copied into it.

```
what you can see, you own.       markup, structure, theme
what must be correct, you depend on.   focus, keyboard, selection
```

The reason is the whole point of encoding behaviour once. A roving-tabindex implementation copied
into two hundred consumer repositories is two hundred places a focus bug has to be found and fixed,
and the copies drift the moment one of them is edited. Keyboard and focus management is also the part
consumers are least equipped to review: a subtly wrong `Home`/`End` or a focus trap that leaks is
invisible until an assistive-technology user hits it.

This is a real cost and worth stating plainly rather than burying: **a consumer who wants total
ownership of every line does not get it here.** They get an import they cannot edit without forking.
That tension is recorded in its own ADR rather than left as an implementation detail, because someone
will reasonably object to it.

## Why a vocabulary and not a state machine

The contract declares _which_ named behaviours apply and parameterises them:

```json
"navigation": { "kind": "linear", "orientation": "inline", "wrap": true, "skipDisabled": true }
```

Not this:

```json
"transitions": [{ "on": "ARROW_RIGHT", "guard": "...", "to": "...", "effects": ["..."] }]
```

The second form looks more powerful and is a trap. A free-form state machine means inventing
execution semantics — evaluation order, a guard language, effect scheduling, what happens when two
transitions match — and then reimplementing that interpreter _identically_ in every framework. Each
backend becomes an interpreter with its own bugs, and the schema quietly becomes a programming
language nobody chose to design.

A closed vocabulary avoids all of it. Each primitive maps to a behaviour the
[W3C ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/) defines normatively, so the
specification work is citation rather than invention. Each backend implements each primitive once, by
hand, in whatever way is idiomatic for that framework.

Adding a component may add a primitive. That is a bounded, reviewable act with an APG citation
attached. Extending a language is not.

## The vocabulary starts small on purpose

It will hold exactly what the first real contracts need, and grow only when a component demands
something genuinely absent. Designing for components that do not exist yet is how the closed
vocabulary stops being closed.

## How agnosticism gets proved

A primitive implemented here is only evidence about React. The conformance definitions live in
`@ds/contracts` as framework-neutral data — "given linear navigation with wrap and skipDisabled,
ArrowRight from the last enabled item lands on the first enabled item" — and each backend ships a
thin adapter that runs them against its emitted output in a real DOM.

A second framework is credible when it passes the same file. Without that, "agnostic" is an
assertion rather than a claim anyone has checked.
