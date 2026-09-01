# Prop map proposals

One document per component that **does not exist yet**. It maps a design's variants onto the
canonical vocabulary in [`../prop-map.md`](../prop-map.md) §1 _before_ anything is built.

This is where the interesting argument happens. By the time there is TSX, the API is a fact and
changing it costs something; here it costs nothing.

**This directory ships empty.** You fill it — one proposal per component, written by whoever is
about to argue for that API. There is no skill that generates them: the translation below is a
judgement call, and a mechanized guess at it is the exact defect this document exists to prevent.

## Why the translation is not mechanical

A Figma variant property and a component prop look alike and are not the same thing. Most files
encode four unrelated kinds of thing in one variant axis, and only one of them is a prop:

| In Figma                 | Really is                     | Belongs in                                     |
| ------------------------ | ----------------------------- | ---------------------------------------------- |
| `Hover`, `Pressed`       | **Runtime interaction state** | `:hover` / `:active` — _never_ a prop          |
| `Selected`, `Current`    | **Author-declared state**     | a boolean prop + `data-ds-state`               |
| `Icon=Mic`, `Label=Save` | **Content**                   | children or a slot prop — not a variant at all |
| `Size=Large`             | **An actual prop**            | the `size` axis                                |

**Getting this wrong produces a `state="hover"` prop**, which forces JavaScript to track the
pointer to do something the browser already does. It is the single most common defect in a
design-system API derived from a Figma file, and naming it is most of this document's value.

## Shape

```markdown
# Prop map proposal — <component>

- **Status:** Proposal. Nothing is built.
- **Source:** [<frame name>](<figma url>) (node `123:456`)
- **Read alongside:** [`../prop-map.md`](../prop-map.md) §1, `packages/contracts/components/README.md` §2
- **Measured from the file**, not read off a screenshot — every value below came from the nodes.

## 1. What the design actually contains

## 2. What is a prop, and what is not

## 3. Proposed surface

### 3.1 Props <- table: prop · kind · values · default · notes

### 3.2 Composition <- children, slots, parts, states

## 4. How this maps back to the Figma variants

## 5. Deliberately not exposed <- and why. This section is not optional.
```

## The rules that keep a proposal honest

- **Measure, do not eyeball.** Read the nodes. A screenshot cannot tell you a padding value, and a
  proposal built on guessed numbers is worse than none because it looks specific.
- **Reuse an axis or argue for a new one.** If the design's values fit `size` or `hierarchy`, use
  that name and those values. If they genuinely do not, say what the new axis is _for_ — a new axis
  is a change to the canon, and it goes in `prop-map.config.json` with the reason.
- **§5 is not optional.** What you chose _not_ to expose, and why, is the part that stops the next
  person re-adding it. "The design has four audience colours; those are a theme applied to a
  subtree, not a prop on this component" is the sentence that saves an argument later.
- **Name the things that do not fit.** A proposal that maps every variant cleanly onto the canon
  has probably been forced. Real design files have leftovers; write them down rather than
  flattening them.
