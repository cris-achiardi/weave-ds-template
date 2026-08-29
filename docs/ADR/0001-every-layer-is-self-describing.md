# ADR 0001 — Every layer is self-describing, and context is pulled rather than pushed

- **Status:** Accepted
- **Date:** 2026-08-28
- **Deciders:** cris
- **Tags:** governance, documentation, ai-consumption, determinism

## Context

This repository is read by two kinds of consumer with the same constraint. A person arriving at a
design system cannot hold all of it at once. An agent literally cannot: context is finite, and a
system that requires the whole repository in working memory before it can answer one question about
one component does not scale past its first few files.

There are two conventional answers and both fail here.

**Restate the fact wherever it is needed.** Then one fact lives in many places, and the copies
drift. A drifting signal is worse than no signal, because it is consulted with confidence — the
version someone reads is the version they act on, and nothing tells them it is stale.

**Write one comprehensive document.** Then nobody finishes it, agents burn their context window
loading governance to answer a question about a CSS module, and the document rots as a unit because
no single change ever justifies re-reading all of it.

The third answer is to **point**. Each fact lives in exactly one place; everything else references
it. That is only survivable if a reader can find the right place without already knowing the
repository — which is what makes "every layer describes itself and indexes its contents" a
structural requirement rather than a documentation preference.

The repository already works this way, measured on 2026-08-28: 25 directories, 14 carrying an entry
doc, and every skill routing through a "read these when you're in their territory" table rather
than front-loading its references. **Nothing enforces any of it.**

The cost of that showed up twice in a single session. A schema moved from `packages/react/` to
`contracts/` and three documents kept pointing at the old path — including an ADR's own Contract
table, the mechanism whose entire job is to point at a decision's realizing files. Separately, a
deleted skill left seventeen references behind, four of them instructions telling a reader to run
it. In both cases every gate stayed green, because **a pointer that resolves to nothing produces no
error anywhere.**

That is this architecture's characteristic defect. Choosing to point instead of restate trades
drift for dangling, and only one of those two failures is currently detectable.

## Decision

**Every layer of this repository describes itself, indexes its own contents, and links rather than
restates. Context is pulled on demand, never front-loaded. Pointers are mechanically verified.**

1. **A layer that holds a decision or a convention carries an entry doc** — `README.md`, or
   `CLAUDE.md` where the audience is an agent. Pass-through directories that hold only
   subdirectories do not need one; the reader lands on the child.
2. **An entry doc does three things:** says what the layer is for, says how it relates to its
   neighbours, and indexes what is inside it. An index that lists files without saying when to read
   them is a directory listing, and the reader already had one.
3. **Each fact lives in exactly one place.** Every other mention links to it. Where a document
   deliberately restates for the sake of explanation — `docs/documentation/` does this on purpose —
   it must say which document wins when the two disagree.
4. **Depth is loaded on demand.** An entry doc routes with a "when → read" table. No document
   requires reading its own references to be useful, and no skill front-loads context it might not
   need.
5. **Every pointer is verified mechanically.** A relative link, a `pnpm` command named in prose, or
   a repo path in backticks must resolve. `pnpm verify:docs` fails the build when one does not.
6. **A derived index is generated, never typed.** Where an index can be computed from what it
   indexes, it is — so it cannot drift. The ADR index is generated from the records themselves.
7. **Artifacts are classified by how drift is caught, and the classification is stated where the
   artifact lives.** Three kinds, and confusing them is how a hand-maintained file comes to be
   trusted like a generated one:

   | Kind          | Drift is caught by                  | Examples                                             |
   | ------------- | ----------------------------------- | ---------------------------------------------------- |
   | **Generated** | impossible — it is read from source | `.ai/maps/prop-map.md`, the contract's derived half  |
   | **Validated** | a gate                              | links and paths, the ADR index, `.figma/maps/*.json` |
   | **Reviewed**  | a person, and nothing else          | accessibility claims, token policy, purpose          |

**The corollary that binds future work:** before adding a document, establish that no existing layer
should own the fact instead. A new file is a new thing to keep in step; the default is to extend the
entry doc that already governs that territory.

## Contract

| Concern                               | Where                                                                       |
| ------------------------------------- | --------------------------------------------------------------------------- |
| The rule, stated for agents at entry  | `CLAUDE.md` — "First rule: modular context, loaded on demand"               |
| Pointer enforcement                   | `scripts/verify-docs.mjs` (`pnpm verify:docs`, in `pnpm verify` **and** CI) |
| Entry-doc coverage enforcement        | the same script — every directory holding content must be covered           |
| ADR index generation                  | `scripts/adr-index.mjs` (`pnpm adr-index`)                                  |
| ADR index enforcement                 | the same script with `--check` (`pnpm adr-index:check`, in `verify` and CI) |
| The generated region                  | `docs/ADR/README.md`, between `adr-index:start` and `adr-index:end`         |
| Worked example of a layer's entry doc | `.figma/README.md` — purpose, relationships, and an index of its own files  |

## Consequences

**Positive**

- A reader — human or agent — can start anywhere and reach the right depth without loading the
  repository. That is the property that makes the system usable at all as it grows.
- One fact, one place. The rule that prevents drift stops being an aspiration the moment pointers
  are checked, because the cheap way to restate is now the way that breaks the build.
- Entry docs are where a layer's conventions become reviewable. A convention nobody wrote down is
  enforced by whoever happens to be typing.
- The generated ADR index cannot claim a status the record does not have, since it reads the status
  out of the record.

**Negative / trade-offs**

- **More files, and more indirection.** Answering a question can mean following two or three
  pointers. That is a real cost paid on every read, in exchange for not paying the drift cost on
  every write.
- **Entry-doc coverage is now a gate, which means adding a directory costs a document.** It began as
  a report naming four uncovered directories — `scripts/`, `packages/react/scripts/`, its
  `extract/`, and `.github/workflows/`. Those were documented, the report went empty, and only then
  was it promoted; that order is the point, because a gate that fails on everything on day one gets
  switched off. The standing cost is that a new folder of anything now reddens CI until someone
  either writes its entry doc or names it in the one above.
- **`verify:docs` checks that a pointer resolves, not that it points somewhere useful.** A link to
  the wrong existing file passes. The failure it cannot catch is a reference that is confidently
  aimed at the wrong place.
- **The rule is easy to satisfy shallowly.** A README that exists and says nothing passes every
  check here. Nothing distinguishes an index that routes from one that lists.
- **It will go quietly wrong in one specific way:** someone restates a fact instead of linking to
  it, both copies are correct on the day, and no gate objects because nothing is broken. Drift then
  starts silently. Only review catches that.

## Alternatives considered

**Ship entry-doc coverage as a gate immediately.** Rejected at first, then done properly. Gating it
on day one would have failed on four directories nobody had documented, and the first response to a
red gate you disagree with is to disable it. So it shipped as a report, the four were documented,
the report went empty, and the gate was switched on against a clean baseline. The sequence is the
reusable part: **report → clear the baseline → gate.**

**Byte-equality on the ADR index, matching `prop-map:check`.** Rejected because this index is a
region inside a hand-written README that Prettier also formats, and Prettier owns table alignment —
byte-equality would fail on column padding rather than on content. The check compares parsed rows
instead, which catches every failure that matters. `prop-map` can assert bytes because it owns its
whole file; this does not.

**Generate every index, not just the ADR one.** Tempting and mostly wrong. Most entry docs index by
_when you would need this_, which is editorial and cannot be derived from a directory listing. The
ADR index is the exception precisely because its three columns are all mechanically derivable.
