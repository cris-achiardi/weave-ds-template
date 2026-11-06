# Typography

- **Status:** Draft
- **Owns:** how text is set to be easy to read and scan — scale, weight, typeface, case, line length, line height, alignment, tracking and pairing
- **Contracts:** [`Field`](../../packages/contracts/components/Field/Field.contract.json) · [`TextField`](../../packages/contracts/components/TextField/TextField.contract.json) · [`Button`](../../packages/contracts/components/Button/Button.contract.json)

## Intent

Most of an interface is text. A person should be able to read a paragraph without effort, tell a
heading from body text at a glance, and find the label for any control without searching. Legibility
comes from the typeface; readability comes from how it is set, and this record is mostly about the
second.

## Principles

- **DR1 — Sizes come from one scale, and few are used.** Font sizes MUST come from a type scale
  built on one ratio — about 1.2 for dense interfaces, 1.33 or more for editorial work. A single
  screen SHOULD use no more than three or four sizes.
- **DR2 — Two or three weights.** Regular for reading, medium or semibold for labels and headings,
  bold only where something must stand out. Bold MUST NOT be used on long passages. Weights below
  regular MUST NOT be used under about 16px. Where a weight changes with state, space for the
  heavier weight MUST be reserved so the layout does not shift.
- **DR3 — The typeface fits the role.** Sans serif for interface text, monospace for code, data and
  aligned columns. Display and script faces MUST only be used for short, large text. Text under
  about 14px SHOULD be set in a face with a generous x-height and distinct I, l and 1.
- **DR4 — One case per role, sentence case by default.** Each text role MUST use one case style
  everywhere. Sentence case is the default for interface text. All caps MUST be kept to short labels
  of a few words, with tracking opened slightly.
- **DR5 — Line length 45 to 75 characters.** Body text containers MUST set a maximum width so lines
  stay within about 45 to 75 characters, rather than stretching across a wide screen.
- **DR6 — Line height fits the size.** Body text SHOULD sit around 1.4 to 1.6; large headings
  around 1.1 to 1.2. Longer lines need a little more.
- **DR7 — Left-aligned, one edge.** Body text MUST be left-aligned in left-to-right languages.
  Centred text is kept to short lines; justified text is not used on the web. Elements that almost
  share an edge MUST be made to share it.
- **DR8 — Tracking is for headings and caps only.** Large headings MAY be tightened slightly and
  small uppercase labels loosened. Lowercase body text MUST NOT be letter-spaced. Hand kerning is
  worth it on a few prominent words, not on body copy.
- **DR9 — One or two families.** A design SHOULD use at most two families, and often one is enough:
  weight, case and tracking within one family go a long way. A pair MUST differ clearly in
  personality while sharing proportions; two near-identical faces read as a mistake.

## Checks

| Principle | Check                                                                                                                                                                     |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DR1       | List every font size in use and the ratio between consecutive sizes. Flag more than three or four sizes on one screen, or ratios that jump around.                        |
| DR2       | List weights in use and where. Flag more than three, bold on long passages, and weights under 400 below about 16px.                                                       |
| DR3       | Identify each typeface and its classification. Confirm display and script faces appear only in short, large text. For text under about 14px, confirm a generous x-height. |
| DR4       | List the case style for each text role. Flag all caps longer than a few words, and roles that mix case styles.                                                            |
| DR5       | Count characters per line in body text at the widest and narrowest supported widths. Flag lines under about 45 or over about 75.                                          |
| DR6       | Divide line height by font size for each text style. Flag body text under about 1.4 or over about 1.7, and large headings over about 1.3.                                 |
| DR7       | Collect the left edges in each column. Flag edges off by a few pixels, and centred text longer than about three lines.                                                    |
| DR8       | List letter-spacing by text style. Flag positive tracking on lowercase body text, and zero or negative tracking on small all-caps labels.                                 |
| DR9       | Count families. Flag more than two, and pairs close enough in style to look like a mistake.                                                                               |

## In this system

| Principle                    | Carried by                                                                                                                                                                                                                         |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DR4                          | [`Field`](../../packages/contracts/components/Field/Field.contract.json) — owns the label, help text and error message as roles; one Field means one consistent set of text roles around every control                             |
| DR1                          | [`TextField`](../../packages/contracts/components/TextField/TextField.contract.json) and [`Button`](../../packages/contracts/components/Button/Button.contract.json) — the `size` axis; each size must land on a step of the scale |
| DR1, DR2, DR3, DR6, DR8, DR9 | Nothing yet. The scale, weights, families and line heights are the `typography.json` token group, which is not authored — see [`packages/tokens/tokens/README.md`](../../packages/tokens/tokens/README.md)                         |
| DR5, DR7                     | Nothing mechanical. Composition review                                                                                                                                                                                             |

## Don't

- Set a font size that is not on the scale.
- Use bold for emphasis everywhere.
- Set paragraphs in all caps, or letter-space body text.
- Let body text run the full width of a wide screen.
- Centre or justify paragraphs.
- Shrink text to make it fit.
- Pair two typefaces that look almost the same.

## Open questions

- **OQ1 — The type scale and families are not decided.** DR1, DR2 and DR9 need them. The Figma
  component pages currently set text in Inter as a stand-in, with no text style, so the real family
  is still open.
- **OQ2 — Which size each job gets.** A page title, section title, body, helper text and caption
  each need one style. No contract carries that mapping, because no text component exists here yet.
  Whether the system ships a text or heading contract, or leaves this to tokens, is undecided.
- **OQ3 — Weight as a state signal.** DR2 allows a weight change on state if space is reserved. No
  contract here uses one today; if Tabs or another component does, it should say so in its contract.

## Boundary

This record defines how text is set. It does not define the type tokens' values, what is emphasised
on a screen ([`visual-hierarchy`](./visual-hierarchy.md)), or interface copy.
