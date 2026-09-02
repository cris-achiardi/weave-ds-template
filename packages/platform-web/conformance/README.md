# `conformance/`

Framework-neutral test definitions for the **web platform mapping**, as data.

The sibling of [`@ds/contracts/conformance`](../../contracts/conformance/README.md), and the same
arrangement: the cases are data, each backend drives them against its own resolver, and a second
backend is credible only when it passes the same file.

## Why this exists, and the asymmetry it closes

A third-party emitter's **keyboard** has been provable since `linear-navigation.json` landed. Its
**markup** was not provable at all. Nothing anywhere said "a `checked` state on `role="switch"` must
produce `aria-checked`, and `false` must be rendered rather than dropped" — that knowledge lived
only inside one React emitter, where it had been got wrong five separate times.

So a backend could pass every behaviour case and still ship a radio with no `aria-checked`.

## Every case here is a defect this repository actually shipped

Not invented, and not derived from a specification we hoped applied. The five that drove the file:

| Shipped                                                       | Case                                            |
| ------------------------------------------------------------- | ----------------------------------------------- |
| A radio with no `aria-checked`                                | `radio-must-carry-aria-checked`                 |
| A tab with no `aria-selected`                                 | `tab-must-carry-aria-selected`                  |
| A tooltip with a bogus `aria-expanded` on a roleless wrapper  | `roleless-element-must-not-carry-aria-expanded` |
| `aria-selected` on `role="tabpanel"`, which is invalid markup | `tabpanel-must-not-carry-aria-selected`         |
| `aria-expanded` on `role="dialog"`, likewise                  | `dialog-must-not-carry-aria-expanded`           |

None of the five produced a build error, a type error or a lint warning. Four of them rendered
perfectly.

## How WAI-ARIA marks things, and why `aria` is five-valued

Same discipline as the behaviour cases: record what the specification did, and mark our own
decisions as ours.

| `aria`           | Means                                                                           |
| ---------------- | ------------------------------------------------------------------------------- |
| `"supported"`    | WAI-ARIA lists this attribute for this role.                                    |
| `"prohibited"`   | It does not. Emitting it is invalid markup.                                     |
| `"no-role"`      | There is no role for the attribute to attach to.                                |
| `"unrestricted"` | **OURS.** This profile places no role restriction where the specification does. |
| `"not-aria"`     | The platform has a better channel — a native attribute, or nothing at all.      |

`unrestricted` is the value that keeps this honest, and it is the direct equivalent of
`not-addressed` in the behaviour cases.

## Case shape

```json
{
  "id": "tabpanel-must-not-carry-aria-selected",
  "patterns": ["tabs"],
  "given": { "state": "selected", "element": "div", "role": "tabpanel" },
  "expect": { "channel": "data", "attribute": null },
  "aria": "prohibited",
  "_bug": "A panel reflects the same `selected` state its tab does; aria-selected is defined for a tab and is not in tabpanel's supported set."
}
```

`channel` is one of `native`, `aria`, `data` or `none`. `_bug` marks a case derived from a real
defect; `_note` marks one derived from reasoning.

## Scope

**The root-element decision only.** The member-reflection path in the React emitter deliberately does
not apply the role-bearing gate these cases assume, and that divergence is documented in
[`../README.md`](../README.md). It is not asserted here, because asserting it would freeze an
inconsistency as a requirement.

## Files

| File                | Covers                                                 |
| ------------------- | ------------------------------------------------------ |
| `aria-mapping.json` | which channel a contract state reaches the DOM through |

Driven by `aria-mapping.test.mjs` in the package root, against `resolve.mjs`.
