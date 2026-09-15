# Form participation

A contract's `form` block declares the shared answer source and its encoding. The WC emitter
uses [form-associated custom elements](https://html.spec.whatwg.org/multipage/custom-elements.html#custom-elements-face-example)
and ElementInternals. Ordinary Button remains an action, and RadioItem contributes through RadioGroup.

| Contract   | Source    | Submitted answer                                            |
| ---------- | --------- | ----------------------------------------------------------- |
| TextField  | value     | text, including the empty string                            |
| Slider     | value     | finite number snapped to the declared range                 |
| RadioGroup | selection | one selected identity                                       |
| Checkbox   | checked   | consumer value only when checked; mixed contributes nothing |
| Switch     | checked   | consumer value only when true                               |

Consumers set `name` and `required` on the host. Checkbox and Switch also expose `value`, defaulting
to `on`. Empty names and disabled controls contribute nothing. The native `form` attribute can
associate a host outside the form. The internal input does not contribute a duplicate answer.

`form`, `validity`, `validationMessage`, `willValidate`, `checkValidity()`, `reportValidity()` and
`setCustomValidity(message)` expose the platform validation API. Required empty answers fail
validation; a required Checkbox must be checked (mixed is insufficient). An authored `invalid`
state also creates a custom validity error. Custom messages can be localized by the consumer.
Read-only controls continue contributing but are barred from constraint validation, matching HTML.
These are text inputs, not email/password/pattern validators; those constraints are not declared.

Reset restores the answer captured on the first connection, including property assignments before
insertion. Later value attributes reflect current state; they do not redefine that snapshot.
Reconnection retains the snapshot. Reset and restoration do not emit user-change events.
`formStateRestoreCallback` accepts serialized state, rejects malformed enum/number input, and
restores state even for an unchecked control whose submission value is null. The browser tests
exercise the callback directly; browser-specific history/autofill scheduling is not asserted.

Disabled fieldsets suppress contributions and interaction without modifying the consumer's
explicit `disabled` property. Collections propagate effective disabled state to their members.
Commit-mode text keeps its draft local until blur; submitting while editing contributes the last
committed answer. Reset discards even an uncommitted draft.

Form association does not solve the separate accessible naming gaps in ADR 0005. Supply a literal
`aria-label` for an inner semantic control when its contract does not already name it.

The other backends are reported separately: native TextField has partial platform form behavior;
custom Checkbox, Switch, Slider and RadioGroup still lack emitted form contributions. They are
explicitly non-conforming for this new contract claim, not silently certified by WC's tests.
