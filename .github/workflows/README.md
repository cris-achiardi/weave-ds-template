# `.github/workflows/`

Continuous integration. The place a gate becomes enforcement rather than a suggestion.

The scripts themselves live in [`scripts/`](../../scripts/README.md) and
[`packages/react/scripts/`](../../packages/react/scripts/README.md); this directory only decides
**when they run and on what**.

## What is here

| Workflow                     | Jobs                | What it protects                                                        |
| ---------------------------- | ------------------- | ----------------------------------------------------------------------- |
| [`verify.yml`](./verify.yml) | `verify`, `init-ds` | Every gate on every push and PR, plus the branding codemod's own health |

### `verify`

Runs the same **set** of gates as `pnpm verify`, one step per gate, each with a comment stating what
that gate catches that nothing else would. Then two **reports** — contract coverage and the
token-policy paint report — which print and never fail.

Steps are separate rather than one `pnpm verify` call on purpose: a failure names itself in the
GitHub UI without anyone reading a log.

**The same set, not the same order** — and the difference matters. This job builds tokens early;
`pnpm verify` builds late. So a gate that accidentally depends on build output passes here and fails
there. That is not hypothetical: `verify:docs` shipped requiring generated token files to exist,
this job went green, and the `init-ds` job below caught it by running the real `pnpm verify` on a
clean checkout. **A gate must not depend on anything produced later in its own chain.**

### `init-ds`

A matrix that runs `pnpm init-ds <name>` on a clean checkout, then asserts the **renamed** repo is
still green and that no stragglers of the old prefix survive.

The branding codemod rewrites the package scope, the CSS custom-property prefix and the
data-attribute prefix together. It runs once per project, which means in normal use it is never
exercised again — exactly the shape of thing that rots silently. This job is the only reason it
stays correct.

## Why gates live here and not only in `pnpm verify`

**A contract whose breach produces no build error has to be gated in CI, or it is enforced on
whichever machine happens to run `verify`.**

That is the rule this directory exists to satisfy, and it is why the two lists must stay in step: a
gate added to `package.json` and not to `verify.yml` is a gate that protects the author and nobody
else. When you add one, add it in both places, with a comment here saying what it catches.

## What is deliberately absent

No deploy, no release, no publish workflow. The template ships no components, so there is nothing to
release yet — and an unused publish pipeline is a thing that breaks quietly and is discovered on the
day it is first needed.
