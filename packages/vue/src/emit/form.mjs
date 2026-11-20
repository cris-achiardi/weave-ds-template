// Form lifecycle for a NATIVELY EDITED control (TextField): the element is a real <input>, so the
// platform already supplies submission, `name`, `required`, `readonly`, disabled fieldsets and the
// `form` owner attribute. What it cannot supply is the half that lives in the component's model:
//
//   reset     The platform resets the DOM, not `defineModel`. Vue always re-patches `value`, so
//             the next render wrote the discarded edit straight back. The component listens for
//             its owner's `reset` and restores the answer captured at setup
//             (packages/wc/forms.md: "the answer captured on the first connection").
//   validity  An authored `invalid` was ARIA-only, so a field could show an error while its form
//             submitted. It now sets a custom validity error — but only one the component owns.
//
// Same semantics as packages/react/src/emit/form.mjs; see packages/wc/forms.md.

/** The default custom-validity message for authored `invalid`. Same string as WC. */
export const INVALID_MESSAGE = 'Invalid value.';

/** Vue imports the emitted block needs. */
export const FORM_IMPORTS = ['nextTick', 'onBeforeUnmount', 'onMounted', 'ref', 'watch'];

/**
 * @param {object} o
 * @param {string} o.v           the model's name (`value`)
 * @param {string} o.elType      the root element's DOM type
 * @param {boolean} o.commitEditing
 * @param {boolean} o.hasInvalid whether the contract declares an authored `invalid` state
 */
export function emitNativeFormLifecycle({ v, elType, commitEditing, hasInvalid }) {
  const s = [];
  s.push(`// ---- form lifecycle (contract.form). See packages/wc/forms.md.`);
  s.push(`const formControl = ref<${elType} | null>(null);`);
  s.push(`// The answer a reset restores: captured once, at setup, never re-captured from props.`);
  s.push(`const formAnswer = ${v}.value;`);
  s.push(`let formDocument: Document | undefined;`);
  s.push(`let formTimer: ReturnType<typeof setTimeout> | undefined;`);
  s.push(`// Matched against the CURRENT owner when it fires, so a \`form\` attribute, an owner`);
  s.push(`// change or a move needs no re-subscription.`);
  s.push(`function onFormReset(event: Event) {`);
  s.push(`  const control = formControl.value;`);
  s.push(`  if (!control || event.target !== control.form) return;`);
  s.push(
    `  // A TASK, not a microtask: a reset button dispatches from native code, so a microtask`,
  );
  s.push(`  // would run before later listeners could cancel and before the platform resets.`);
  s.push(`  clearTimeout(formTimer);`);
  s.push(`  formTimer = setTimeout(() => {`);
  s.push(`    if (event.defaultPrevented) return;`);
  s.push(`    // The model hears only a real difference, and no DOM event is dispatched: this is`);
  s.push(`    // lifecycle synchronisation, not a user edit.`);
  s.push(`    if (${v}.value !== formAnswer) ${v}.value = formAnswer;`);
  if (commitEditing) s.push(`    editingDraft.value = formAnswer;`);
  s.push(
    `    // The platform has already rewritten the element; make it show what the model holds,`,
  );
  s.push(`    // including when nothing changed and so nothing re-renders.`);
  s.push(
    `    void nextTick(() => { control.value = ${commitEditing ? 'editingDraft.value' : `${v}.value`}; });`,
  );
  s.push(`  });`);
  s.push(`}`);
  s.push(`onMounted(() => {`);
  s.push(`  formDocument = formControl.value?.ownerDocument;`);
  s.push(`  formDocument?.addEventListener('reset', onFormReset, true);`);
  s.push(`});`);
  s.push(`onBeforeUnmount(() => {`);
  s.push(`  formDocument?.removeEventListener('reset', onFormReset, true);`);
  s.push(`  clearTimeout(formTimer);`);
  s.push(`});`);
  if (hasInvalid) s.push(...emitOwnedValidity('formControl'));
  s.push(``);
  return s;
}

/**
 * Custom validity has TWO writers, tracked by writer rather than inferred from the message text:
 * the consumer, through the element's own setCustomValidity() — intercepted on the instance — and
 * authored `invalid`. The effective error is the consumer's message if any, else the default one
 * while `invalid` holds (the same precedence as WC). Clearing `invalid` therefore never clears a
 * consumer error, even one with identical text, and never depends on validationMessage — which
 * reads '' while the element is barred from validation (read-only, disabled).
 */
export function emitOwnedValidity(local) {
  const msg = JSON.stringify(INVALID_MESSAGE);
  return [
    `// Custom validity has two writers, tracked by WRITER, not by message text: the consumer,`,
    `// through the element's own setCustomValidity(), and authored \`invalid\`. The consumer's`,
    `// message wins, as in WC; clearing \`invalid\` never clears it.`,
    `const formValidity = { consumer: '', invalid: false };`,
    `function formApplyValidity() {`,
    `  const element = ${local}.value;`,
    `  if (!element) return;`,
    `  const { consumer, invalid } = formValidity;`,
    `  HTMLInputElement.prototype.setCustomValidity.call(element, consumer || (invalid ? ${msg} : ''));`,
    `}`,
    `onMounted(() => {`,
    `  const element = ${local}.value;`,
    `  if (!element) return;`,
    `  element.setCustomValidity = (message: string) => {`,
    `    formValidity.consumer = String(message);`,
    `    formApplyValidity();`,
    `  };`,
    `});`,
    `onBeforeUnmount(() => {`,
    `  if (${local}.value) Reflect.deleteProperty(${local}.value, 'setCustomValidity');`,
    `});`,
    `watch(`,
    `  () => [props.invalid, ${local}.value] as const,`,
    `  ([invalid]) => {`,
    `    formValidity.invalid = Boolean(invalid);`,
    `    formApplyValidity();`,
    `  },`,
    `  { immediate: true, flush: 'post' },`,
    `);`,
  ];
}
