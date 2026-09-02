# `conformance/`

Framework-neutral test definitions for the behaviour vocabulary, as **data**.

One file per primitive. Each holds the cases a backend must satisfy to claim it implements that
primitive, transcribed from the W3C ARIA APG rather than written from our React.

## Why this is data and not tests

A primitive implemented in `packages/react/src/behavior/` is evidence about React and nothing else.
**A second framework is credible only when it passes the same file** — so the expectations cannot
live inside any one backend's test suite. Each backend ships a thin adapter that drives these cases
against its own emitted output in a real DOM.

Without this, "agnostic" is an assertion rather than a claim anyone has checked.

## Why it is written before the schema block

The order is deliberate and it is the method: transcribe the specification, then design the smallest
schema block that can express it, then implement. Designing the block first means designing it around
what seemed reasonable rather than around what the pattern actually requires — and on this branch
that has already gone wrong once, when a `skipDisabled` boolean was planned before anyone read what
the APG says about disabled items.

## How the APG marks conformance, and why `apg` is three-valued

**The word "required" appears zero times** on the radio and tabs pattern pages. The APG marks only
the _optional_ items, with a parenthetical after the key name, and states everything else in
unconditional prose. So each case records which of three things the APG actually did:

| `apg`             | Means                                                                                                       |
| ----------------- | ----------------------------------------------------------------------------------------------------------- |
| `"unmarked"`      | Stated unconditionally, with no marker. **Not** the APG saying "required" — it is the APG's default voice.  |
| `"optional"`      | The APG wrote `(optional)` or `(Optional)` after the key name. Explicit.                                    |
| `"conditional"`   | Guarded by an "If…" clause — `Space or Enter` in tabs, `Shift + F10` where a popup exists.                  |
| `"not-addressed"` | The APG says nothing. **Our decision, recorded as ours** — never inferred and never presented as the APG's. |

That last value is the one that keeps this honest. Several things a working component needs are
simply not in the specification: `Enter` for a non-toolbar radio group, `Home`/`End` for radio, and
what a tab list should do when nothing is selected. Where we choose, the case says so.

## Case shape

```json
{
  "id": "wrap-forward-from-last",
  "patterns": ["radio", "tabs"],
  "given": { "orientation": "inline", "items": ["a", "b", "c"], "focused": "c" },
  "press": "ArrowRight",
  "expect": { "focused": "a" },
  "apg": "unmarked",
  "quote": "If focus is on the last button, focus moves to the first button."
}
```

`quote` carries the APG's own wording wherever the exact phrasing matters. A case with no `quote`
and `apg: "not-addressed"` is ours.

`expect` may also assert that **nothing** happened — `{ "handled": false }` — which is how the one
negative requirement in either pattern is expressed: a horizontal tab list must not consume
`ArrowDown`, so the browser can still scroll.

## Files

| File                     | Primitive                                        | Patterns transcribed |
| ------------------------ | ------------------------------------------------ | -------------------- |
| `linear-navigation.json` | moving focus between the members of a collection | radio group, tabs    |

Nothing consumes these yet. The React adapter lands with the primitive; the file is the standing
definition either way.
