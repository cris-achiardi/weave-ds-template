# Skills

Agent skills for this design system. Each one is a **module** in the sense the root
[`CLAUDE.md`](../../CLAUDE.md) means it: loaded when a task is in its territory, not read up front.

A skill is not documentation. It is the procedure plus the traps — what to read, in what order, what
the tooling will let you do wrong, and what to write down when you are finished.

## The arc

The repo's governing sequence is **explore → report → decide (ADR) → build**. The first two steps
have **no skill**; the last two do, with a gate behind the build. The Figma-writing skills close the
loop back to the design source:

```
   Figma  ──by hand──▶  docs/research/  ──ds-decide──▶  docs/ADR/
                                                             │
                                                        ds-component
                                                             │
                                                             ▼
                                                  packages/react/src/components/
                                                             │
                                                   ds-figma-component
                                                             │
                                                             ▼
   Figma  ◀──ds-figma-document──  component set  ◀────────────┘

   ds-figma-explain  ──▶  Figma   (explanatory boards; joins at any point)
```

**Exploring and writing up are deliberately unmechanized.** Reading the design source is something a
person does when they need reference — a skill that swept the file on demand would imply an
authority the canvas does not have. What Figma is, and the call sequences for reading it, live in
[`../../.figma/README.md`](../../.figma/README.md).

That leaves the rule intact, though: **nothing downstream may skip the evidence and guess.**
`ds-decide` refuses to invent a Context section, and `ds-component` refuses to start without a
governing decision.

## Index

| Skill                                         | What it does                                                                                                                                      | Writes to                            |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| [`ds-decide`](./ds-decide/)                   | Turns a research report's open questions into Architecture Decision Records. Writes records, never code.                                          | `docs/ADR/`                          |
| [`ds-component`](./ds-component/)             | Builds a React component from an accepted decision — the five files, its agnostic contract and React binding, the barrel entry, and every gate.   | `packages/react/src/components/`     |
| [`ds-figma-component`](./ds-figma-component/) | Generates a Figma **component set** from a component's source, bound to the file's variables and text styles.                                     | Figma, `.figma/maps/components.json` |
| [`ds-figma-document`](./ds-figma-document/)   | Lays out the **page around** a component set — title, description, labelled cell grid, extension tables. Works on sets this repo never generated. | Figma, `.figma/maps/components.json` |
| [`ds-figma-explain`](./ds-figma-explain/)     | Builds **explanatory** boards — node graphs, spec tables, annotated anatomy, flows. For things meant to be read, not instantiated.                | Figma                                |

### Picking between the three Figma skills

| You want                                           | Skill                                  |
| -------------------------------------------------- | -------------------------------------- |
| A component set that does not exist yet            | `ds-figma-component`                   |
| The page around a set: description, labels, states | `ds-figma-document`                    |
| To show a state _without_ adding a variant axis    | `ds-figma-document` — extension tables |
| A board that explains how something works          | `ds-figma-explain`                     |
| To read the design source and write it down        | none — do it yourself, see `.figma/`   |

If the output is meant to be _used_ as a component, it is `ds-figma-component`. If it is meant to be
_read_, it is `ds-figma-explain`.

## Readiness — three of these cannot run yet

`ds-figma-component`, `ds-figma-document` and `ds-figma-explain` were ported on **2026-08-28** from a
mature design system into a repo that ships **no tokens and no components by design**. That gap is
recorded inside each skill rather than smoothed over, because a skill that assumes a token set it
cannot find will invent one.

| Skill                | State          | Blocked on                                                                                      |
| -------------------- | -------------- | ----------------------------------------------------------------------------------------------- |
| `ds-decide`          | ready          | a research report to decide from                                                                |
| `ds-component`       | ready          | an accepted ADR to build against                                                                |
| `ds-figma-explain`   | **usable now** | nothing — it needs a file and something true to explain                                         |
| `ds-figma-document`  | partial        | works on the 44 hand-built sets already in the file; the code-side description needs components |
| `ds-figma-component` | **blocked**    | a component to generate from, and a decided token set to bind to                                |

Three preconditions are unmet across them. Each is a decision, not a bug:

1. **No token set exists.** `identity.variableCollections` is empty and `packages/tokens/tokens/`
   holds no DTCG source. Bindings cannot be checked against a mapping that is not there.
2. **No components exist.** `packages/react/src/components/` is empty on purpose.
3. **The source file has one mode.** Every collection has a single mode, so the **mode-flip
   verification cannot run** — and it is the strongest check in both `ds-figma-component` and
   `ds-figma-document`. With one mode a bound value and a baked literal render identically. Read
   bindings back instead, and report that the check did not run rather than letting silence imply it
   passed.

A fourth used to sit at the top of this list: the manifest declared a read-only bridge while three
skills wrote to Figma. That is **settled** — `.figma/manifest.json` → `bridges` now records `read`
and `write` separately, and the write bridge is opt-in and unwired so nothing depends on it.

## Anatomy of a skill

```
<name>/
├── SKILL.md          frontmatter (name, description) + the procedure
├── references/       loaded on demand, one file per territory
├── assets/           code pasted into the target runtime (e.g. a plugin prelude)
└── scripts/          code run on this machine
```

`SKILL.md` frontmatter carries `name` and `description`. The description is the routing surface —
it is what decides whether the skill is reached for at all, so it names the phrasings a user actually
types, not a summary of the contents.

## Rules for writing one

These come from the root `CLAUDE.md` and apply to every skill here.

- **Progressive disclosure.** `SKILL.md` holds the procedure and routes to `references/`. Do not
  inline a reference; do not make the reader load all of them to start.
- **A gap is a finding, not a blank to fill.** Where a precondition is unmet, say so in the skill and
  say what it blocks. Never write a plausible placeholder that reads as decided.
- **Never hard-code a Figma file key.** Read it from `.figma/manifest.json` → `sources.*.key`. The
  same goes for the token, scope and data prefixes: `/ds.config.json` is the single source of truth,
  and `pnpm init-ds` rewrites every reference to it.
- **Date what you measured.** A snapshot without a date is indistinguishable from a claim about the
  present. `ds-figma-component/references/figma-file.md` is the worked example.
- **Say which checks did not run.** A skipped check and a passing check must never look the same in
  a report.
