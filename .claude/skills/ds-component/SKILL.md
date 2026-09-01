---
name: ds-component
description: SUPERSEDED, DO NOT USE — describes the retired hand-authoring flow and writes to packages/react/src/components/, a directory that no longer exists. The library is now contract-driven and there is no replacement skill yet. Read packages/contracts/components/README.md instead. Retained only for its reasoning. Originally: build a React component from an accepted decision — the five files, its agnostic contract and React binding, the barrel entry, and every gate. Use when asked to "create the Button", "scaffold a component", "implement ADR NNNN", "add a component to the design system", or when given a component name plus a design intent. Requires a governing ADR or a prop-map proposal to work from.
---

> [!CAUTION]
>
> ## SUPERSEDED — do not follow this skill
>
> This skill builds five hand-written files into `packages/react/src/components/<Name>/` and adds a
> barrel entry. **That directory no longer exists and the barrel exports nothing.** Every path below
> is wrong, and the flow it describes — write the component by hand, then write a contract that
> annotates it — is the exact direction this library has reversed.
>
> The library is now contract-driven: the contract in `packages/contracts/components/<Name>/` is the
> source, and component source code is _generated_ from it into a consumer's own repository.
>
> **There is no replacement skill yet, because there is no emitter yet.** Do not improvise one from
> the instructions below — they will produce a component in a directory nothing scans, contracted by
> a gate that no longer measures what it claims to.
>
> - What a contract may contain: `packages/contracts/components/README.md`
> - What generated React must look like: `packages/react/src/emit/README.md`
> - Why the direction reversed: `packages/contracts/schema/README.md`
>
> Retained unedited below for its reasoning, which is still good — the refusal to start without a
> governing decision, the anatomy invariants, the rule against inventing a field. Only the mechanics
> are dead.

# ds-component

Build one component, correctly, against a decision that already exists.

## Refuse to start without a governing decision

Name the ADR or the proposal file you are working from. If neither exists, **stop and say so** —
the evidence has to be written down first, then `ds-decide` turns it into a record.

This is not ceremony. A component built without one bakes a dozen unrecorded decisions into code
where nobody will find them again: which axis this prop belongs to, what the token policy is, what
the thing is even called. Those get made either way; the only question is whether they get made
visibly.

## Read these when you are in their territory

| When                       | Read                                                                                                       |
| -------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Always, first**          | `packages/contracts/components/README.md` — the authoring contract                                         |
| **Before naming any prop** | `.ai/maps/prop-map.md` §1–2 — reuse an axis, do not coin a synonym                                         |
| Writing the contract       | `references/authoring-the-contract.md` + `contracts/*.schema.json` + `packages/contracts/schema/README.md` |
| The file shapes            | `references/component-anatomy.md`                                                                          |
| Choosing a `paints` policy | `references/token-policy.md`                                                                               |
| What the gate will check   | `packages/react/scripts/verify-contract.mjs` header                                                        |

## The five files

```
packages/react/src/components/<Name>/
├── <Name>.tsx             component: cva + clsx + forwardRef
├── <Name>.module.css      styles: tokens only, no raw values
├── <Name>.contract.json   agnostic — what it IS, on any framework
├── <Name>.react.json      the React binding — element, ref target, className target
└── index.ts               local barrel
```

Then **add it to `packages/react/src/index.ts`**, alphabetically. The gate fails if you do not: an
unexported component is invisible to every consumer, and nothing in the type system or the build
complains.

## The three invariants the entire toolchain rests on

**1. A named node carries `data-ds-part="x"` AND `className={styles.x}`, with the same name.**

```tsx
<span data-ds-part="icon-start" className={styles.iconStart}>
```

_Why:_ it is what makes `pnpm report:paints` possible at all. That check resolves
`data-ds-part` → CSS class → declarations → `var()` chain → declared token policy. Break the pairing
and the token policy silently becomes documentation instead of a check. It is also the stable,
unhashed handle a consumer targets, since CSS Modules hashes the class name out of reach.

(The attribute is kebab-case, the style key is camelCase. The tooling converts between them.)

**2. Every variant axis is a `cva` axis with an entry in `defaultVariants`.** Never a bare
destructuring default.

```tsx
const buttonVariants = cva(styles.root, {
  variants: { hierarchy: {...}, size: {...} },
  defaultVariants: { hierarchy: 'primary', size: 'm' },   // <- required
});
```

_Why:_ the `cva` object is the only machine-readable home for a variant default. It is not in the
type, so no type-level tool can see it. The reader parses it as syntax in under a millisecond, and
— unlike the type-checker path — that read does not change behaviour with the TypeScript version.

**3. No generic wrapper around a variant type.** A variant is a `cva` axis or a bare string-literal
union. Nothing else.

```tsx
size?: ResponsiveValue<Size>;   // WRONG — resolves to a bare name, value set lost
size?: 's' | 'm' | 'l';         // fine
```

_Why:_ measured. A project-local generic collapses to its name with no values, and every artifact
downstream — the contract answer, the prop map, the gate's value checks — silently gets thinner
without failing.

## Never invent a field to fill a blank

An empty field is an honest "not decided yet". A plausible wrong one **passes every gate in this
repo** and misleads every reader after you.

This applies hardest to the fields nothing can check: an ARIA role, a contrast claim, what a slot
accepts, a keyboard model. If you do not know, leave it out and say so in your summary. The
accessibility notes are the right place to record what the component _cannot_ enforce — "icon-only
usage needs an aria-label from the caller" is exactly the kind of fact that belongs there.

## Order of work

1. Read the governing ADR or proposal, and `prop-map.md` §1.
2. Write the five files. Start with `intent` in the contract — purpose, behaviour, what it is
   not for. Everything else is a consequence of it. Props come from the proposal; names come from
   the canon.
3. Add the barrel entry.
4. `pnpm contract <Name>` — **read it back.** Does the merged view say what you meant? This is the
   step people skip, and it is the one that catches a wrong contract before the gate does.
5. `pnpm verify:contract` — must pass.
6. `pnpm prop-map` — check the drift report. A new `unreviewed` divergence is a decision you made
   without noticing; either fix it or record a disposition with a reason.
7. `pnpm report:paints` — findings are not failures, but read them.
8. `pnpm typecheck && pnpm build`.

## When the design does not fit the canon

Say so rather than forcing it. A new axis is a change to `prop-map.config.json`, and it needs an
argument for what the axis is _for_ — not just a place to put a value. If the disagreement is
structural, that is an ADR, and it is `ds-decide`'s job.
