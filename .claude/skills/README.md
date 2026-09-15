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
                                                     (build step)
                                                             │
                                                             ▼
                                                packages/contracts/components/
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

| Skill                                         | What it does                                                                                                                                            | Writes to                            |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| [`ds-decide`](./ds-decide/)                   | Turns a research report's open questions into Architecture Decision Records. Writes records, never code.                                                | `docs/ADR/`                          |
| [`ds-component`](./ds-component/)             | **SUPERSEDED — do not use.** Describes the retired hand-authoring flow. No replacement exists yet; the library is moving to contract-driven generation. | —                                    |
| [`ds-figma-component`](./ds-figma-component/) | Generates contract anatomy and axes as a Figma set; paint stays unbound unless a consumer mapping is supplied.                                          | Figma, `.figma/maps/components.json` |
| [`ds-figma-document`](./ds-figma-document/)   | Lays out the **page around** a component set — title, description, labelled cell grid, extension tables. Works on sets this repo never generated.       | Figma, `.figma/maps/components.json` |
| [`ds-figma-explain`](./ds-figma-explain/)     | Builds **explanatory** boards — node graphs, spec tables, annotated anatomy, flows. For things meant to be read, not instantiated.                      | Figma                                |

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

## Readiness

`ds-component` requires a governing decision, a component, and a selected backend/output directory.
`ds-figma-component` can prepare a contract plan without a token set or Figma bridge; publishing
requires an authorized target and an available write bridge. The default output is unstyled.

`ds-figma-document` explains existing sets. `ds-figma-explain` creates explanatory boards.
Their file observations must be checked against the current target before writes.
