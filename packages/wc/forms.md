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
  Custom validity has two writers, tracked by writer rather than inferred from the message: the
  consumer, through **the element's own `setCustomValidity()` method** (intercepted on that
  element), and authored `invalid`. The consumer's message takes precedence, as on the WC host, and
  clearing `invalid` never clears it — even when its text is identical. Neither depends on
  `validationMessage`, which reads empty while the element is barred from validation (read-only,
  disabled), so leaving such a state cannot strand a stale error.
- An error already on the element when the component installs — set from a ref callback, or on an
  existing host Angular attaches to — is the consumer's. If the element is barred at that moment its
  text is unreadable; it is then kept exactly as it is, never rewritten or cleared, until the
  consumer writes again through the method.
- On unmount the interceptor is released only if it is still the element's method: a prior own
  override is restored, and an override the consumer assigned afterwards is left alone. The
  generated code is `ownValidity` from `packages/emit-web/validity.mjs`, identical in all three.
- React composes its own ref with the consumer's and keeps React 19's callback-ref contract: a
  returned cleanup is called instead of `ref(null)`; without one, `ref(null)` is called.

Known gaps, reported as non-conforming rather than omitted (ADR 0005):

- **Prototype calls are unsupported.** Consumer ownership covers the element's own method only.
  Calling the prototype directly — `HTMLInputElement.prototype.setCustomValidity.call(element, m)`
  — bypasses the interceptor, so that message is not recorded as the consumer's and the next
  `invalid` change overwrites it. The prototype is deliberately not patched: that would change
  every input on the page.

- **State restoration.** No framework lifecycle corresponds to `formStateRestoreCallback`. The
  browser may restore the native element's value on history navigation or autofill, and the
  framework model then overwrites or disagrees with it.
- **Commit-mode submission.** The native input submits what it shows. Submitting while a draft is
  uncommitted (implicit submission with Enter) contributes the draft, not the last committed
  answer as WC does.

**Checkbox, Switch, Slider and RadioGroup** render no native form control. Each contributes through
one **proxy**: a real `<input>` of the matching type, rendered as the root's last child, hidden from
people and assistive technology (`aria-hidden`, `tabindex="-1"`, clipped, no pointer events). It is
deliberately not `type="hidden"`, which is barred from constraint validation and would make
`required` decorative.

| Contract   | Proxy                       | Submitted                                                    |
| ---------- | --------------------------- | ------------------------------------------------------------ |
| Checkbox   | `checkbox`, consumer value  | the value only when `checked`; `mixed` and unchecked omit it |
| Switch     | `checkbox`, consumer value  | the value only when on                                       |
| Slider     | `range`, the declared range | the snapped number                                           |
| RadioGroup | one `text` input, the group | the selected identity, once — items contribute nothing       |

- The public API gains `name`, `required` and `form` (the owner id, passed down to the proxy), and
  Checkbox and Switch gain `value`, defaulting to `on` — the WC host's names and defaults. They are
  no longer forwarded to the root element. Angular clears them from the host as well, because it
  keeps a consumer's static attributes on the host as well as passing them to the inputs.
- The proxy is written imperatively from the model after every change and after a reset: the
  renderer does not see a native reset rewrite it. Reset, snapshot, model notification, task timing
  and listener cleanup are as for TextField above. `autocomplete="off"` keeps the browser from
  restoring a proxy value the model does not hold.
- Required is native: a required Checkbox needs `checked` (mixed is insufficient), a required
  RadioGroup needs a selection, and Slider is never missing. Read-only Switch and RadioGroup keep
  contributing but are barred from validation. The RadioGroup text proxy takes `readonly`. On a
  checkbox `readonly` has no effect, so a read-only Switch's proxy becomes a read-only
  `type="text"` — the same element, barred from validation (a consumer custom error included),
  its value submitted as-is — and drops its name while off, because a text input always submits.
  Not `type="hidden"`: a hidden input named `_charset_` submits the document encoding instead. Authored `invalid` (Checkbox) uses the same
  writer-tracked custom validity — the same `ownValidity` owner, bound to the proxy, with the same
  unsupported prototype path; consumers reach the proxy through `form.elements[name]`.
- **Effective disabled** is the consumer's `disabled` or a disabled ancestor `<fieldset>`. A
  fieldset fires no event, so the controls share ONE `MutationObserver` per document
  (`watchFormDisabled`, generated from `packages/emit-web/form-disabled.mjs`), watching `disabled`
  attributes and moves (child-list changes, so a control carried into or out of a disabled fieldset
  is re-evaluated). Subscriptions are counted: the observer disconnects, and its registry on the
  document is removed, when the last control unmounts. Each record is tested cheaply first — any record on a fieldset (its `disabled`, or its children,
  since which `<legend>` comes first decides which controls are exempt) re-asks every control
  inside it; an insertion elsewhere matters only if it holds an `<input>` — and only the controls it
  can affect re-ask their proxy, which the platform disables with the fieldset.
  Measured with 200 React Sliders and 1000 unrelated append/remove pairs in Chromium: about 0.8 ms
  over a 4.7 ms harness floor, against about 17 ms for one observer per control. Interaction guards, ARIA, tab order and a collection's members all read the
  effective value; the consumer's prop is never written.
- Interactive validation focuses the first invalid control; the proxy hands focus to the root (or
  to a collection's current tab stop).

Recorded deviations:

- **The proxy inside a `<button>` is not valid HTML.** Checkbox and Switch roots are `<button>`s, and
  the HTML content model forbids interactive content such as `<input>` inside one. The generated
  markup for those two components therefore does **not** validate. Browsers build and submit it, and
  the proxy is inert and hidden, but this is an accepted deviation, not a claim of validity, and
  `formConformance` reports it (`invalid-html-content-model`). The alternative was the proxy as the
  root's next sibling — valid HTML, but a fragment in React, a multi-root component in Vue, and
  imperative DOM insertion in Angular (which attaches to the root and cannot render a sibling), plus
  an extra sibling in every consumer's layout.
- **An unselected RadioGroup submits an empty string.** A native radio group submits nothing when no
  radio is checked. These backends follow the WC host instead, whose group answer is a string and
  serialises `''` — parity across the four backends was preferred over parity with native radios.
- **State restoration** is not implemented for the proxies either; it is reported, not omitted.
- **Cross-document adoption is unsupported** (all five components, React, Vue and Angular). A
  control is bound to the document it mounted in: TextField's reset listener and, for the custom
  controls, the shared fieldset observer and reset listener. Moving an **already-mounted** control
  into another document — `adoptNode`/append into a same-origin iframe, a Vue `<Teleport>` or a
  React/Angular portal whose target is in another document — keeps those bindings on the original
  document, so a reset or a disabled fieldset in the new one is not observed (`aria-disabled` stays
  absent). It is not migrated, deliberately, and `formConformance` reports it
  (`cross-document-adoption`). A control MOUNTED in another document binds to that document and
  works.
