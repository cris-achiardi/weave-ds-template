# Authoring a contract

**The authoring contract.** Everything the tooling assumes about a component contract is written down
here. If you are about to write one, this is the file to have read.

A contract is written against measured evidence and an accepted decision, never scaffolded in
advance — see `docs/ADR/README.md`.

## What is here

Seven contracts, and they did **not** compile equally. The verdict column is measured by generating
each one and using the result — see `docs/research/0002-compiling-a-contract-into-a-component.md`.

| Contract         | Compiles       | What the contract could not say                                                  |
| ---------------- | -------------- | -------------------------------------------------------------------------------- |
| `Switch/`        | **fully**      | nothing — the platform supplies its behaviour                                    |
| `Accordion/`     | **fully**      | nothing, since `collection` was added                                            |
| `AccordionItem/` | **fully**      | its heading level, which the APG says must fit the page                          |
| `Field/`         | **partially**  | what changes `invalid`, `touched` and `dirty`                                    |
| `RadioGroup/`    | **partially**  | its whole keyboard model: arrows that move and select, wrapping, roving tabindex |
| `RadioItem/`     | **partially**  | that exactly one option belongs in the Tab order                                 |
| `Tooltip/`       | **shell only** | what opens it, after how long, what dismisses it, and where it goes              |

Three kinds of gap, in rising order of difficulty:

1. **Solved.** A parent holding a selection across children — `collection` and `member` closed it.
2. **Named but unbuilt.** The behaviour vocabulary. `RadioGroup` is the sharpest case: its APG
   pattern is normative and complete, and demands a keyboard model the contract cannot carry.
3. **Not even named.** Positioning. `Tooltip` needs an anchor, a side, collision handling and a
   layer, and `layout` does not exist. The accordion's width defect suggests it will need
   constraints and not just declarations.

**`Switch` was never proof the system works — it is the easy case**, where the browser supplies the
behaviour for free. The three verdicts above are what the system actually does.

## 1. Per contract

```
<Name>/
├── <Name>.contract.json   the specification. Governed by ../schema/component.schema.json
└── CHANGELOG.md           what changed, and whether it was breaking
```

The changelog is not bookkeeping. **The contract is the versioned artifact** — components are
generated output and are not versioned at all — so the changelog is the only record of what a
consumer's regenerated component will do differently. A contract change with no changelog entry is
an unannounced API change.

A spike emitter exists — `packages/react/src/emit/emit.mjs` — and compiles `Switch/` into working
React. It is a probe rather than the emitter, it is wired into no gate, and **nothing validates a
contract in this directory automatically**: `verify:contract` still enumerates components by looking
for a `<Name>.tsx` that this architecture no longer produces. Until that inverts, a contract here is
checked only when something reads it on purpose.

## 2. Prop naming — the canon

**Before naming a prop, read [`../prop-canon.json`](../prop-canon.json), then
`.ai/maps/prop-map.md` §1–2 for what has actually been measured.**

A component exposes a **subset** of an axis's canonical values — never a synonym, never an extra
value bolted on.

| Rule          |                                                                                                                                                         |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Props         | `camelCase`                                                                                                                                             |
| Values        | `kebab-case`                                                                                                                                            |
| Booleans      | a bare adjective or state: `disabled`, `loading`, `fullWidth`. Never `is*` / `has*` / `show*` — the prop already reads as a predicate at the call site. |
| Content props | named for the slot, not the content: `iconStart`, not `startIcon` or `leftIcon`                                                                         |

`prop-canon.json` is the data half of this canon; this section is its prose statement. Keep the two
in step.

**Why bother.** A synonym is only visible by comparing value sets _across_ components, which is
exactly what a per-component review cannot see. One person adds `emphasis="high"`, another adds
`hierarchy="primary"`, both reviews pass, and the library now has two names for one idea. The
generated map is the only place that shows up — and it flags rather than blocks, so it is on you to
look.

This canon is agnostic on purpose. **How a canonical name is spelled in a given framework is that
framework's business** and lives in its own binding table, not here.

## 3. Anatomy, and the unstyled surface

Every named node in `anatomy` is a **part**: a region a consumer can target, style and reason about.
Part names are kebab-case (`icon-start`), nest through `parts`, and each may declare which visual
channels it paints.

Because the library is unstyled, a contract names the channel and **leaves the source unbound**:

```json
"paints": {
  "border-block-end": null,
  "padding-inline": null
}
```

Read it as a patch bay. The contract says _this part has a socket for a block-end border and one for
inline padding_. It does not say what to plug in. Delete `paints` and there are no sockets — a
consumer has nothing to wire and has to reverse-engineer someone's stylesheet, which is the failure
this library exists to remove.

Two notations, two different facts, and conflating them loses the distinction:

| Notation              | Means                                                         |
| --------------------- | ------------------------------------------------------------- |
| `"channel": null`     | **unbound by design.** The consumer supplies this.            |
| channel simply absent | **not described yet.** Nobody has established what it paints. |

That is the repo's standing rule — a gap is a finding, not a blank to fill — applied to styling.

Recorded as [ADR 0003](../../../docs/ADR/0003-paints-name-the-channel-and-leave-the-source-unbound.md)
and mechanized: `$defs.tokenPolicy` permits `null`. A named policy stays legal, because a consumer's
own wiring needs to express one — but a contract this library ships does not name one, and **nothing
enforces that.** It is a convention here, not a gate.

### States: two required facts, and they are not the same fact

Every state declares **`kind`** — who tracks it — and **`control`** — who may set it. They are
orthogonal, and `disabled` is why: the platform tracks it, and only the consumer sets it.

**`kind`** is `intrinsic` (the platform already tracks it: `hover`, `disabled`, `focus-visible`) or
`authored` (the implementation has to track it: `loading`, `current`, `selected`). Prefer the
intrinsic form wherever the platform has one — a state reflected into an attribute the platform
already exposes forces generated code to track something it gets for free.

**`control`** is the field a framework binding compiles into a public surface, and getting it wrong
produces a component that works and is missing an API:

| Value      | Means                                                                         | Compiles to                          | Example                                 |
| ---------- | ----------------------------------------------------------------------------- | ------------------------------------ | --------------------------------------- |
| `consumer` | the consumer sets it; the user cannot change it                               | one input                            | `disabled`, `read-only`                 |
| `shared`   | the consumer may set it **and** the user may change it                        | that framework's two-way state idiom | `checked`, an accordion's `open`        |
| `internal` | nothing outside sets it — platform-observed, derived, or owned by an ancestor | no input at all                      | `hover`, an accordion **item**'s `open` |

**Never write a prop name in a contract.** `checked` + `defaultChecked` + `onCheckedChange` is
React's spelling of `control: "shared"`; Vue spells the same fact `modelValue` +
`update:modelValue`. Naming either here puts a framework in an agnostic file. Each framework holds
one rule per `control` value in its own `prop-bindings.json`, which is why adding a component adds no
mapping work. See
[ADR 0004](../../../docs/ADR/0004-a-state-declares-who-may-set-it-and-props-are-generated-from-that.md).

**A state may legitimately paint nothing.** `touched` and `dirty` on a form field exist to gate
_when another state may display_; they are real, tracked, and invisible. Say so in `visual` rather
than inventing a treatment. Whether these deserve a `kind` of their own is open — see
`docs/research/0001-contract-schema-smoke-test.md`.

## 4. Never invent a field to fill a blank

An empty field is an honest "not decided". A plausible wrong one passes every check in this repo and
misleads every reader after you.

This applies hardest to the fields nothing can check: `intent.purpose`, every `a11y` claim, and every
token policy. A gate can prove a contract is _legal_. Nothing can prove it is _true_.

## 5. What is deliberately not here

The old version of this document also covered how to write the React implementation — the five files,
`cva` variant rules, CSS-Modules class pairing, the build commands. All of it assumed a component was
written by hand and the contract annotated it afterwards.

That flow is being replaced. The React-specific rules that a generator must still honour moved to
`packages/react/src/emit/README.md`; the rest retires with the flow. `.claude/skills/ds-component`
describes the retired flow and carries a banner saying so.
