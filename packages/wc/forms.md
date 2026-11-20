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

## React, Vue and Angular

These backends have no form-associated custom elements, so the record above is met differently and
reported per component by `formConformance` (`scripts/relationship-conformance.mjs`).

**TextField** renders the native `<input>`. The platform supplies submission, `name`, `required`,
`readonly`, disabled fieldsets and the `form` owner attribute; the generated code adds the half that
lives in the framework model:

- Reset restores the answer captured when the component first mounted (React, Vue) or first
  rendered (Angular, after its bindings arrive). It is never re-captured from later props; a
  remount is a new instance with a new snapshot. The component listens for `reset` on its document
  and matches the event against its _current_ form owner, so `form="id"`, owner changes and moves
  need no re-subscription; the listener is removed on unmount.
- The sync runs one task after the event, so a cancelled reset (`preventDefault()`) changes nothing
  and the platform's own reset of the element has already happened.
- An uncontrolled field resets its internal state. A controlled or two-way model (React
  `value`/`onValueChange`, Vue `v-model:value`, Angular `[(value)]`) is notified through its normal
  channel only when it differs from the snapshot. No DOM `input`/`change` event is dispatched: reset
  is lifecycle synchronisation, not a user edit. Commit mode discards the uncommitted draft.
- Authored `invalid` sets a custom validity error, `Invalid value.`, so the form refuses to submit.
  The component owns only that error: a message the consumer set with the element's own
  `setCustomValidity()` is neither replaced while `invalid` is true nor cleared when it turns false.

Known gaps, reported as non-conforming rather than omitted (ADR 0005):

- **State restoration.** No framework lifecycle corresponds to `formStateRestoreCallback`. The
  browser may restore the native element's value on history navigation or autofill, and the
  framework model then overwrites or disagrees with it.
- **Commit-mode submission.** The native input submits what it shows. Submitting while a draft is
  uncommitted (implicit submission with Enter) contributes the draft, not the last committed
  answer as WC does.

Custom Checkbox, Switch, Slider and RadioGroup still lack emitted form contributions in these
backends. They are explicitly non-conforming for this contract claim, not certified by WC's tests.
