// Form lifecycle for a NATIVELY EDITED control (TextField): Angular attaches to the consumer's own
// <input>, so the platform already supplies submission, `name`, `required`, `readonly`, disabled
// fieldsets and the `form` owner attribute. What it cannot supply is the half that lives in the
// component's model:
//
//   reset     The platform resets the DOM, not `model()`. The `[value]` host binding only writes
//             when the signal changes, so after a reset the element and the model disagreed until
//             the next edit. The component listens for its owner's `reset` and restores the answer
//             captured at first render (packages/wc/forms.md: "captured on the first connection").
//   validity  An authored `invalid` was ARIA-only, so a field could show an error while its form
//             submitted. It now sets a custom validity error — but only one the component owns.
//
// Same semantics as packages/react/src/emit/form.mjs; see packages/wc/forms.md.

/** The default custom-validity message for authored `invalid`. Same string as WC. */
export const INVALID_MESSAGE = 'Invalid value.';

/** Angular imports the emitted block needs. */
export const FORM_IMPORTS = ['DestroyRef', 'ElementRef', 'afterNextRender', 'effect', 'inject'];

/** The class field. Named apart from `host`, which other primitives declare with other types. */
export function emitNativeFormField(elType) {
  return [`  private readonly formHost = inject<ElementRef<${elType}>>(ElementRef);`];
}

/**
 * Constructor statements.
 * @param {object} o
 * @param {string} o.v           the model's name (`value`)
 * @param {boolean} o.commitEditing
 * @param {boolean} o.hasInvalid whether the contract declares an authored `invalid` state
 */
export function emitNativeFormLifecycle({ v, commitEditing, hasInvalid }) {
  const c = [];
  c.push(`    // ---- form lifecycle (contract.form). See packages/wc/forms.md.`);
  c.push(`    const control = this.formHost.nativeElement;`);
  c.push(
    `    // The answer a reset restores: captured once, at first render — after the consumer's`,
  );
  c.push(`    // bindings have arrived — and never re-captured.`);
  c.push(`    let formAnswer: string | undefined;`);
  c.push(`    let formTimer: ReturnType<typeof setTimeout> | undefined;`);
  c.push(
    `    // Matched against the CURRENT owner when it fires, so a \`form\` attribute, an owner`,
  );
  c.push(`    // change or a move needs no re-subscription.`);
  c.push(`    const onFormReset = (event: Event) => {`);
  c.push(`      if (formAnswer === undefined || event.target !== control.form) return;`);
  c.push(`      const answer = formAnswer;`);
  c.push(`      // A TASK, not a microtask: a reset button dispatches from native code, so a`);
  c.push(`      // microtask would run before later listeners could cancel and before the reset.`);
  c.push(`      clearTimeout(formTimer);`);
  c.push(`      formTimer = setTimeout(() => {`);
  c.push(`        if (event.defaultPrevented) return;`);
  c.push(`        // The model hears only a real difference, and no DOM event is dispatched: this`);
  c.push(`        // is lifecycle synchronisation, not a user edit.`);
  c.push(`        if (this.${v}() !== answer) this.${v}.set(answer);`);
  if (commitEditing) c.push(`        this.editingDraft.set(answer);`);
  c.push(`        // The binding writes only on change; the platform has already rewritten the`);
  c.push(`        // element, so make it show what the model holds.`);
  c.push(`        control.value = ${commitEditing ? 'this.editingDraft()' : `this.${v}()`};`);
  c.push(`      });`);
  c.push(`    };`);
  c.push(`    afterNextRender(() => {`);
  c.push(`      formAnswer = this.${v}();`);
  c.push(`      control.ownerDocument.addEventListener('reset', onFormReset, true);`);
  c.push(`    });`);
  c.push(`    inject(DestroyRef).onDestroy(() => {`);
  c.push(`      control.ownerDocument.removeEventListener('reset', onFormReset, true);`);
  c.push(`      clearTimeout(formTimer);`);
  c.push(`    });`);
  if (hasInvalid) c.push(...emitOwnedValidity('control'));
  return c;
}

/**
 * Custom validity has TWO writers, tracked by writer rather than inferred from the message text:
 * the consumer, through the element's own setCustomValidity() — intercepted on the instance — and
 * authored `invalid`. The effective error is the consumer's message if any, else the default one
 * while `invalid` holds (the same precedence as WC). Clearing `invalid` therefore never clears a
 * consumer error, even one with identical text, and never depends on validationMessage — which
 * reads '' while the element is barred from validation (read-only, disabled).
 *
 * Constructor statements; `element` names a local holding the HTMLInputElement.
 */
export function emitOwnedValidity(element) {
  const msg = JSON.stringify(INVALID_MESSAGE);
  return [
    `    // Custom validity has two writers, tracked by WRITER, not by message text: the consumer,`,
    `    // through the element's own setCustomValidity(), and authored \`invalid\`. The consumer's`,
    `    // message wins, as in WC; clearing \`invalid\` never clears it.`,
    `    const formValidity = { consumer: '', invalid: false };`,
    `    const formApplyValidity = () => {`,
    `      const { consumer, invalid } = formValidity;`,
    `      HTMLInputElement.prototype.setCustomValidity.call(${element}, consumer || (invalid ? ${msg} : ''));`,
    `    };`,
    `    ${element}.setCustomValidity = (message: string) => {`,
    `      formValidity.consumer = String(message);`,
    `      formApplyValidity();`,
    `    };`,
    `    inject(DestroyRef).onDestroy(() => Reflect.deleteProperty(${element}, 'setCustomValidity'));`,
    `    effect(() => {`,
    `      formValidity.invalid = this.invalid();`,
    `      formApplyValidity();`,
    `    });`,
  ];
}
