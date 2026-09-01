# `schema/`

The schemas that govern what a component **is**.

| File                                               | Governs                                                                        | Agnostic? |
| -------------------------------------------------- | ------------------------------------------------------------------------------ | --------- |
| [`component.schema.json`](./component.schema.json) | What the component is: purpose, behaviour, states, axes, anatomy, token policy | **yes**   |

`react-binding.schema.json` used to sit beside this one. It moved to
`packages/react/bindings/binding.schema.json`, because a schema with `"framework": {"const": "react"}`
in it is a React artifact and this package may not hold one.

`behavior.schema.json` — the interaction vocabulary — is planned and does not exist. See the parent
README's "Not built yet".

## Where a field goes

> **If it would still be true in React Native, it belongs in the contract.**

| Fact                         | Where                 | Why                                                                  |
| ---------------------------- | --------------------- | -------------------------------------------------------------------- |
| "this means _button_"        | contract              | `<button>` and `Pressable` are the same meaning                      |
| "this renders `<button>`"    | binding               | there is no `<button>` in React Native                               |
| "it has a `label` region"    | contract              | every platform has one                                               |
| "the ref lands on `root`"    | binding               | refs are a React idea                                                |
| "hover must dim it"          | contract              | every platform has _some_ pressed/hover treatment                    |
| "background is a fill token" | **neither, any more** | the library is unstyled; the channel is named, the source is unbound |

A binding that grows past a handful of fields is usually a sign something agnostic leaked into it.

## Why the contract specifies rather than merely describes

Worth reading, because the reasoning is sound and its conclusion is about to invert.

The earliest version of this schema held only what code could not state, and forbade restating
anything derivable — because two copies of one fact drift. That rule bought safety and cost
buildability: a file that deliberately omits the axes and their values cannot be the thing you build
_from_, only a thing that annotates something already built.

So the rule became:

> **The contract may specify anything. Anything it specifies that the implementation also expresses
> must be asserted equal by a gate.**

Duplication is not dangerous because it is duplication. It is dangerous when nothing checks it.

### What that costs, and it is not small

**The safety rests entirely on the gate.** The original rule was self-enforcing: a contract
forbidden from restating derivable facts could not drift from the code, because it never claimed
anything the code claimed.

That is no longer true. If the parity checks are skipped, disabled or removed, the contract degrades
into precisely the stale second opinion the original rule existed to prevent — and **it will look
authoritative while doing it.** A file that specifies the axes is more useful than one that does not,
and more dangerous when unchecked.

### Why this is now unfinished business

Both versions above assume the same direction of travel: **hand-written code is primary, and the
contract is checked against it.** `verify:contract` compares the contract's declared axes with the
`cva` axes it reads out of the TSX.

This library inverts that. The contract is primary and the code is emitted from it. Under inversion:

- **The contract must state the rules a component is compiled from** — but not its props. A prop name
  is a framework's spelling, so the contract states that a state is `shared` and each binding
  compiles that into `checked`/`defaultChecked`/`onCheckedChange`, or into `modelValue` +
  `update:modelValue`, or into an attribute and an event. See `states.*.control` and
  [ADR 0004](../../../docs/ADR/0004-a-state-declares-who-may-set-it-and-props-are-generated-from-that.md).
- **The existing parity check becomes circular.** It compares a contract's declared axes against the
  `cva` axes read out of a TSX; once that TSX is emitted from the contract, the comparison checks
  generated output against its own input and proves nothing. It has to become a **regeneration
  check**: re-emit, compare, fail on a difference. The pattern already exists here —
  `prop-map:check` works exactly that way.

The first half is done: `control` landed with ADR 0004, and `$id` is now
`component-contract-3.json`. The second is not. `verify:contract` still runs the parity comparison
against a `packages/react/src/components/` directory that no longer exists, which is harmless only
because there are zero components for it to compare — and stops being harmless the day an emitter
produces one.

## Reading a schema

Both files are JSON Schema draft 2020-12 with `additionalProperties: false` at every level, so an
unrecognised key is an error rather than a silent no-op. `pnpm verify:contract` compiles them on
every run; that compile is the one check that can fail with zero components in the repo, which makes
it the cheapest proof the wiring is intact.
