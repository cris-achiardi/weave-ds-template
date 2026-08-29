# ADR 0006 — Tabs is a compound of three parts, and selection is held at the root

- **Status:** Accepted
- **Date:** 2026-08-29
- **Deciders:** cris
- **Tags:** components, a11y
- **Related:** [ADR 0002 — Token source of truth is DTCG JSON](./0002-token-source-of-truth-is-dtcg-json-transcribed-per-figma-collection.md)

## Context

The design source draws one tab in five states — Active, Default, disabled, Hover, Focus —
measured node by node on the `tab and tabItem` section of the _Component API Examples_ page. Read
as an API, that list is misleading: **three of the five are states the browser already tracks**.
Hover is `:hover`, Focus is `:focus-visible`, and pressed is `:active`. Only `disabled` and the
selected state describe something the component has to be told.

Of the two that remain, selection is the one with a shape problem. If each item carried its own
`selected` prop, nothing would stop a caller rendering two selected tabs, or none. That is not a
theoretical failure — it is the ordinary result of two `useState` calls drifting apart, and no
type, gate or test in this repo would catch it.

The measured anatomy is small and unambiguous:

- **track** — a 1px bottom border on the container, `border/primary`.
- **indicator** — a 4px bottom border on the item, `brand/primary`, present in the DOM at all times
  and visible only when selected.
- **label** — 16px, and a hover wash behind it at 8px radius.

**There are no panels in the design.** The settings mock plainly switches content between
Recording, Video & Audio and Preferences, so panels exist in the product; they were simply never
drawn. This matters more than it looks: a tab list with no panels wired to it is not the ARIA tabs
pattern at all, it is a segmented control. `role="tab"` without a matching `role="tabpanel"` and an
`aria-controls` between them tells a screen reader user that something will open, and then nothing
identifiable does.

## Decision

1. **Three components ship together**: `Tabs` (the root, `role="tablist"`), `TabItem`
   (`role="tab"`) and `TabPanel` (`role="tabpanel"`). They are one API, not three independent
   components that happen to share a prefix.
2. **Selection is held on `Tabs`** — `value`, `defaultValue`, `onValueChange`. `TabItem` and
   `TabPanel` each take a `value` and read the current selection from context. **There is no
   `selected` prop**, so "two tabs selected at once" is unrepresentable rather than merely
   discouraged.
3. **`TabItem`'s whole public surface is `value`, `children` and `disabled`.** Hover, focus and
   pressed are pseudo-classes in the stylesheet and never props, per
   `packages/react/src/components/README.md` §3.
4. **`Tabs` owns the keyboard model.** Arrow keys move between items, Home and End jump to the
   ends, movement wraps, and disabled items are skipped. Focus is roving — exactly one item is
   tabbable — and **activation follows focus**, so arrowing to a tab selects it.
5. **A `TabItem` or `TabPanel` rendered outside a `Tabs` throws**, with a message naming the
   missing ancestor. There is no useful fallback: an item with no selection to compare against
   cannot decide what it is.
6. **`Tabs` accepts `TabPanel` children alongside `TabItem` children.** The panels are rendered
   outside the `role="tablist"` element, because a tablist may only contain tabs.

## Contract

| Concern                   | Where                                                            |
| ------------------------- | ---------------------------------------------------------------- |
| What each part is         | `packages/react/src/components/Tabs/Tabs.contract.json`          |
| Item behaviour and states | `packages/react/src/components/TabItem/TabItem.contract.json`    |
| Panel behaviour           | `packages/react/src/components/TabPanel/TabPanel.contract.json`  |
| Shared selection context  | `packages/react/src/components/Tabs/TabsContext.ts`              |
| Prop naming canon         | `packages/react/prop-map.config.json`                            |
| Enforcement               | `pnpm verify` (`verify:contract`, `prop-map:check`), gated in CI |

## Consequences

**Positive**

- The invalid states are unwritable. Two selected tabs, or none, cannot be expressed.
- Every state the browser owns stays with the browser, so the styling cannot disagree with reality
  and a touch device is not told about hover.
- The keyboard model lives in one component instead of being re-implemented per item.
- Panels arrive with the tabs rather than being retrofitted, which is when `aria-controls` normally
  gets skipped.

**Negative / trade-offs**

- **`TabItem` is meaningless on its own.** It cannot be lifted out and reused, and its contract is
  only true inside a `Tabs`. That coupling is the price of making the invalid state impossible.
- **Activation follows focus**, so arrowing across the tabs mounts each panel in turn. That is the
  right call for cheap settings panes and the wrong one for a panel that fetches. When an expensive
  panel appears, this decision has to be revisited rather than worked around in the panel.
- **The pressed label is heavier than the resting label** — `font/weight/medium` against
  `font/weight/regular` — so a tab's text gets fractionally wider while the mouse button is down,
  and the row shifts for the duration of the press. This was chosen deliberately after the reflow
  was raised; it is recorded here so the jitter is a known cost rather than a bug report later.
- **Items are equal-width**, reproducing a mock where three fixed 140px tabs exactly fill a 452px
  container. One long label therefore widens every tab, and a large number of tabs will crowd
  rather than scroll. No overflow behaviour is designed.
- **No `size` and no `orientation` axis.** Only a horizontal 52px-tall tab exists in the design, so
  neither is exposed. A vertical tab list is a new decision, not a prop away.
- The quiet failure to watch for: `Tabs` finds its items by inspecting `children`, so a `TabItem`
  wrapped in another element still renders, but drops out of the keyboard order without any error.

## Alternatives considered

**A `selected` prop on each item.** Rejected on the failure mode: it makes the broken state — two
selected, or none — as easy to write as the correct one, and nothing in this repo would catch it.
The prop also duplicates a fact the parent already holds, which is the same duplication ADR 0001
exists to prevent.

**Two components, no `TabPanel`.** Rejected because it is not the ARIA tabs pattern. Shipping
`role="tab"` with nothing to control announces an interaction that does not exist. If the product
genuinely needs a tab-shaped control with no panel — a filter strip, a view switcher — that is a
different component with `role="radiogroup"` or a nav, and it should be named as one rather than
borrowing these semantics.

**Manual activation** — arrow to move, Enter or Space to select. The WAI-ARIA practices recommend
it when a panel is expensive to reveal. Not chosen because every panel in this product is a
settings pane already in memory, and automatic activation is fewer keystrokes for the common case.
Recorded because the moment a panel starts fetching, this is the line to change.
