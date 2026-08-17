# `.ai/maps/`

Three artifacts with three different authorities. Confusing them is how a glossary stops being
trusted, so the distinction is worth holding:

| File                                        | Who writes it                   | What it is                                                                                                                                                                                                              |
| ------------------------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `prop-map.json` / `prop-map.md`             | **generated** — `pnpm prop-map` | The **measured** surface: every prop in the library, its values, which components use it, and every divergence from the canon. Never edit; the edit is discarded on the next run and `pnpm prop-map:check` fails in CI. |
| `proposals/*.md`                            | **hand-written**                | One per component that does **not exist yet**. Maps a design's variants onto the canonical vocabulary _before_ anything is built.                                                                                       |
| `../../packages/react/prop-map.config.json` | **hand-written**                | The **canon**: the axes, their values, the anti-synonym glossary, and the disposition of each known divergence. This is what the generated map measures against.                                                        |

## Why the generated map exists at all

It is **descriptive, not prescriptive.** It resolves nothing and changes no component. It flags.

That sounds weak until you notice what it catches: a synonym is only visible by comparing value
sets _across_ components, which is precisely the thing a per-component review cannot see. One
person adds `emphasis="high"`, another adds `hierarchy="primary"`, both reviews pass, and the
library now has two names for one idea. The map is the only place that shows up.

It is gated by `pnpm prop-map:check` in CI because nothing about an off-canon prop breaks a build.
A rule that produces no failure is a suggestion, and suggestions do not survive a codebase with
more than one author.

## On day one it is empty, and still useful

With no components, the map renders the axis registry and the value glossary and says so:

> **State: canon-only.** No components exist yet. §1 and §2 are the _declared_ canon — the
> vocabulary a design proposal must be written in.

That is what `proposals/` are written against. It is the reason the first component's API can be
argued about in a shared vocabulary before a line of TSX exists — which is the whole point of
doing the exploration before the build.

## Dispositions

A divergence with no entry in `prop-map.config.json → dispositions` reports as **`unreviewed`**.
That is deliberate: a new divergence cannot land silently, it lands _visibly and unlabelled_.

`fix` · `review` · `accepted` · `legacy` — with a reason, always. And the generator **fails** on a
disposition naming a component or prop that no longer exists, so the list cannot quietly rot into
a set of excuses for problems that were solved years ago.
