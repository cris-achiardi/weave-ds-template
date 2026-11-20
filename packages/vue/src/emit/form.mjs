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

import { ownValidityFunction } from '@ds/emit-web';

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
 * Setup statements binding the shared validity owner (packages/emit-web/validity.mjs) to the
 * element held by `local`. Installed at mount — before the first `invalid` sync, so a message
 * already on the element is recorded as the consumer's — and released before unmount.
 */
export function emitOwnedValidity(local) {
  return [
    ...ownValidityFunction(0),
    `let formValidity: ReturnType<typeof ownValidity> | undefined;`,
    `onMounted(() => {`,
    `  if (!${local}.value) return;`,
    `  formValidity = ownValidity(${local}.value);`,
    `  formValidity.setInvalid(Boolean(props.invalid));`,
    `});`,
    `onBeforeUnmount(() => formValidity?.release());`,
    `watch(`,
    `  () => props.invalid,`,
    `  (invalid) => formValidity?.setInvalid(Boolean(invalid)),`,
    `);`,
  ];
}
// ---------------------------------------------------------------------------------------
// Custom controls (#37): Checkbox, Switch, Slider, RadioGroup render no native form control, so
// they contribute through a PROXY: one real, validatable <input> of the matching type, rendered as
// the root's last child and hidden from people and assistive technology. Same design as
// packages/react/src/emit/form.mjs, including its recorded deviation: inside a <button> root the
// generated markup is NOT valid HTML (packages/wc/forms.md).
// ---------------------------------------------------------------------------------------

/** Vue imports the custom-control block needs. */
export const CUSTOM_FORM_IMPORTS = ['computed', 'onBeforeUnmount', 'onMounted', 'ref', 'watch'];

function proxyTypeFor(form) {
  if (form.encoding === 'checked') return 'checkbox';
  if (form.encoding === 'number') return 'range';
  return 'text';
}

function writeProxy(form, model) {
  if (form.encoding === 'checked')
    return `proxy.checked = ${model}.value === ${JSON.stringify(form.checkedValue)};`;
  if (form.encoding === 'number') return `proxy.value = String(snap(${model}.value, RANGE));`;
  return `proxy.value = ${model}.value;`;
}

/**
 * The effective-disabled declaration. Emitted right after the props, before anything reads it:
 * the consumer's prop, or a disabled <fieldset> around the control. The prop is never written.
 */
export function emitEffectiveDisabled() {
  return [
    `// Effective disabled: the consumer's prop, or a disabled <fieldset> around the control.`,
    `// Everything below reads this one; the prop itself is never written.`,
    `const formDisabled = ref(false);`,
    `const effectiveDisabled = computed(() => Boolean(props.disabled) || formDisabled.value);`,
    ``,
  ];
}

/** Script statements: proxy sync, fieldset observation, reset, owned validity, focus hand-off. */
export function emitCustomFormLifecycle({ form, model, hasInvalid }) {
  const s = [];
  s.push(`// ---- form contribution (contract.form). See packages/wc/forms.md.`);
  s.push(
    `// The form proxy: in the form, out of sight, out of the pointer's and the tab order's reach.`,
  );
  s.push(`const FORM_PROXY_STYLE = {`);
  s.push(`  position: 'absolute',`);
  s.push(`  width: '1px',`);
  s.push(`  height: '1px',`);
  s.push(`  margin: '0',`);
  s.push(`  padding: '0',`);
  s.push(`  border: '0',`);
  s.push(`  opacity: '0',`);
  s.push(`  overflow: 'hidden',`);
  s.push(`  clipPath: 'inset(50%)',`);
  s.push(`  pointerEvents: 'none',`);
  s.push(`} as const;`);
  s.push(`const formProxy = ref<HTMLInputElement | null>(null);`);
  s.push(`// The answer a reset restores: captured once, at setup, never re-captured from props.`);
  s.push(`const formAnswer = ${model}.value;`);
  s.push(`// Driven imperatively: a native reset rewrites the proxy behind the renderer's back.`);
  s.push(`function formWrite() {`);
  s.push(`  const proxy = formProxy.value;`);
  s.push(`  if (!proxy) return;`);
  s.push(`  ${writeProxy(form, model)}`);
  s.push(`}`);
  s.push(`watch(${model}, formWrite, { flush: 'post' });`);
  s.push(`let formDocument: Document | undefined;`);
  s.push(`let formObserver: MutationObserver | undefined;`);
  s.push(`let formTimer: ReturnType<typeof setTimeout> | undefined;`);
  s.push(
    `// Matched against the CURRENT owner when it fires, so a \`form\` prop, an owner change or a`,
  );
  s.push(`// move needs no re-subscription.`);
  s.push(`function onFormReset(event: Event) {`);
  s.push(`  const proxy = formProxy.value;`);
  s.push(`  if (!proxy || event.target !== proxy.form) return;`);
  s.push(
    `  // A TASK, not a microtask: a reset button dispatches from native code, so a microtask`,
  );
  s.push(`  // would run before later listeners could cancel and before the platform resets.`);
  s.push(`  clearTimeout(formTimer);`);
  s.push(`  formTimer = setTimeout(() => {`);
  s.push(`    if (event.defaultPrevented) return;`);
  s.push(`    // The model hears only a real difference, and no DOM event is dispatched: this is`);
  s.push(`    // lifecycle synchronisation, not a user edit.`);
  s.push(`    if (${model}.value !== formAnswer) ${model}.value = formAnswer;`);
  s.push(`    // The platform has rewritten the proxy; put back what the model holds now.`);
  s.push(`    formWrite();`);
  s.push(`  });`);
  s.push(`}`);
  s.push(`onMounted(() => {`);
  s.push(`  const proxy = formProxy.value;`);
  s.push(`  if (!proxy) return;`);
  s.push(`  formWrite();`);
  s.push(`  formDocument = proxy.ownerDocument;`);
  s.push(
    `  // A disabled <fieldset> fires no event. Watch \`disabled\` attributes and ask the proxy,`,
  );
  s.push(`  // which the platform disables along with every other control inside it.`);
  s.push(`  const syncDisabled = () => {`);
  s.push(`    formDisabled.value = proxy.matches(':disabled') && !proxy.disabled;`);
  s.push(`  };`);
  s.push(`  syncDisabled();`);
  s.push(`  formObserver = new MutationObserver(syncDisabled);`);
  s.push(`  formObserver.observe(formDocument.documentElement, {`);
  s.push(`    attributes: true,`);
  s.push(`    attributeFilter: ['disabled'],`);
  s.push(`    subtree: true,`);
  s.push(`  });`);
  s.push(`  formDocument.addEventListener('reset', onFormReset, true);`);
  s.push(`});`);
  s.push(`onBeforeUnmount(() => {`);
  s.push(`  formObserver?.disconnect();`);
  s.push(`  formDocument?.removeEventListener('reset', onFormReset, true);`);
  s.push(`  clearTimeout(formTimer);`);
  s.push(`});`);
  s.push(`function onFormProxyFocus(event: FocusEvent) {`);
  s.push(`  const root = (event.currentTarget as HTMLElement).parentElement;`);
  s.push(`  (root?.querySelector<HTMLElement>('[tabindex="0"]') ?? root)?.focus();`);
  s.push(`}`);
  if (hasInvalid) s.push(...emitOwnedValidity('formProxy'));
  s.push(``);
  return s;
}

/** The proxy element, as template lines at the given indent. */
export function emitFormProxy({ form, range, hasReadOnly, indent }) {
  const pad = ' '.repeat(indent);
  const type = proxyTypeFor(form);
  const a = [];
  a.push(`ref="formProxy"`);
  a.push(`type="${type}"`);
  a.push(`:name="name || undefined"`);
  a.push(`:form="form || undefined"`);
  // A read-only answer still submits but is barred from validation, as in HTML. `readonly` does not
  // apply to checkbox or range, so `required` is withdrawn instead.
  a.push(`:required="${hasReadOnly ? 'required && !readOnly' : 'required'}"`);
  if (hasReadOnly && type === 'text') a.push(`:readonly="readOnly"`);
  a.push(`:disabled="disabled"`);
  if (form.encoding === 'checked') a.push(`:value="value"`);
  if (type === 'range' && range) {
    a.push(`min="${range.min}"`);
    a.push(`max="${range.max}"`);
    a.push(`step="${range.step}"`);
  }
  a.push(`aria-hidden="true"`);
  a.push(`tabindex="-1"`);
  a.push(`autocomplete="off"`);
  a.push(`:style="FORM_PROXY_STYLE"`);
  a.push(`@focus="onFormProxyFocus"`);
  return [`${pad}<input`, ...a.map((x) => `${pad}  ${x}`), `${pad}/>`];
}
