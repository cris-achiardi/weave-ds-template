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

import { ownValidityFunction } from '@ds/emit-web';

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
 * Constructor statements binding the shared validity owner (packages/emit-web/validity.mjs) to
 * `element`, a local holding the host input. Installed in the constructor — before the first
 * `invalid` sync, so a message already on an existing host is recorded as the consumer's — and
 * released on destroy.
 */
export function emitOwnedValidity(element) {
  return [
    ...ownValidityFunction(4),
    `    const formValidity = ownValidity(${element});`,
    `    inject(DestroyRef).onDestroy(() => formValidity.release());`,
    `    effect(() => formValidity.setInvalid(this.invalid()));`,
  ];
}
// ---------------------------------------------------------------------------------------
// Custom controls (#37): Checkbox, Switch, Slider, RadioGroup render no native form control, so
// they contribute through a PROXY: one real, validatable <input> of the matching type, rendered as
// the last node of the component's template and hidden from people and assistive technology. Same
// design as packages/react/src/emit/form.mjs, including its recorded deviation: inside a <button>
// host the generated markup is NOT valid HTML (packages/wc/forms.md). A sibling of the host was the
// rejected alternative — Angular attaches to the host and cannot render one declaratively.
// ---------------------------------------------------------------------------------------

/** Angular imports the custom-control block needs. */
export const CUSTOM_FORM_IMPORTS = [
  'DestroyRef',
  'ElementRef',
  'afterNextRender',
  'computed',
  'effect',
  'inject',
  'signal',
  'viewChild',
];

function proxyTypeFor(form) {
  if (form.encoding === 'checked') return 'checkbox';
  if (form.encoding === 'number') return 'range';
  return 'text';
}

function writeProxy(form, model) {
  if (form.encoding === 'checked')
    return `proxy.checked = this.${model}() === ${JSON.stringify(form.checkedValue)};`;
  if (form.encoding === 'number') return `proxy.value = String(snap(this.${model}(), RANGE));`;
  return `proxy.value = this.${model}();`;
}

/** Class fields. `effectiveDisabled` is what every guard and host binding reads. */
export function emitCustomFormFields() {
  return [
    `  // Effective disabled: the consumer's input, or a disabled <fieldset> around the control.`,
    `  // Everything reads this one; the input itself is never written.`,
    `  private readonly formDisabled = signal(false);`,
    `  protected readonly effectiveDisabled = computed(() => this.disabled() || this.formDisabled());`,
    `  private readonly formProxy = viewChild<ElementRef<HTMLInputElement>>('formProxy');`,
    `  // The form proxy: in the form, out of sight, out of the pointer's and the tab order's reach.`,
    `  protected readonly formProxyStyle = {`,
    `    position: 'absolute',`,
    `    width: '1px',`,
    `    height: '1px',`,
    `    margin: '0',`,
    `    padding: '0',`,
    `    border: '0',`,
    `    opacity: '0',`,
    `    overflow: 'hidden',`,
    `    'clip-path': 'inset(50%)',`,
    `    'pointer-events': 'none',`,
    `  };`,
    `  protected onFormProxyFocus(event: FocusEvent): void {`,
    `    const root = (event.currentTarget as HTMLElement).parentElement;`,
    `    (root?.querySelector<HTMLElement>('[tabindex="0"]') ?? root)?.focus();`,
    `  }`,
  ];
}

/** Constructor statements: proxy sync, fieldset observation, reset, owned validity. */
export function emitCustomFormLifecycle({ form, model, type, hasInvalid }) {
  const c = [];
  c.push(`    // ---- form contribution (contract.form). See packages/wc/forms.md.`);
  c.push(
    `    // Driven imperatively: a native reset rewrites the proxy behind the binding's back.`,
  );
  c.push(`    const formWrite = () => {`);
  c.push(`      const proxy = this.formProxy()?.nativeElement;`);
  c.push(`      if (!proxy) return;`);
  c.push(`      ${writeProxy(form, model)}`);
  c.push(`    };`);
  c.push(`    effect(formWrite);`);
  c.push(
    `    // The answer a reset restores: captured once, at first render — after the consumer's`,
  );
  c.push(`    // bindings have arrived — and never re-captured.`);
  c.push(`    let formAnswer: ${type} | undefined;`);
  c.push(`    let formAnswered = false;`);
  c.push(`    let formTimer: ReturnType<typeof setTimeout> | undefined;`);
  c.push(`    let formObserver: MutationObserver | undefined;`);
  c.push(`    let formDocument: Document | undefined;`);
  c.push(
    `    // Matched against the CURRENT owner when it fires, so a \`form\` input, an owner change`,
  );
  c.push(`    // or a move needs no re-subscription.`);
  c.push(`    const onFormReset = (event: Event) => {`);
  c.push(`      const proxy = this.formProxy()?.nativeElement;`);
  c.push(`      if (!proxy || !formAnswered || event.target !== proxy.form) return;`);
  c.push(`      const answer = formAnswer as ${type};`);
  c.push(`      // A TASK, not a microtask: a reset button dispatches from native code, so a`);
  c.push(`      // microtask would run before later listeners could cancel and before the reset.`);
  c.push(`      clearTimeout(formTimer);`);
  c.push(`      formTimer = setTimeout(() => {`);
  c.push(`        if (event.defaultPrevented) return;`);
  c.push(`        // The model hears only a real difference, and no DOM event is dispatched: this`);
  c.push(`        // is lifecycle synchronisation, not a user edit.`);
  c.push(`        if (this.${model}() !== answer) this.${model}.set(answer);`);
  c.push(`        // The platform has rewritten the proxy; put back what the model holds now.`);
  c.push(`        formWrite();`);
  c.push(`      });`);
  c.push(`    };`);
  c.push(`    afterNextRender(() => {`);
  c.push(`      const proxy = this.formProxy()?.nativeElement;`);
  c.push(`      if (!proxy) return;`);
  c.push(`      formAnswer = this.${model}();`);
  c.push(`      formAnswered = true;`);
  c.push(`      formWrite();`);
  c.push(`      formDocument = proxy.ownerDocument;`);
  c.push(
    `      // A disabled <fieldset> fires no event. Watch \`disabled\` attributes and ask the`,
  );
  c.push(`      // proxy, which the platform disables along with every other control inside it.`);
  c.push(
    `      const syncDisabled = () => this.formDisabled.set(proxy.matches(':disabled') && !proxy.disabled);`,
  );
  c.push(`      syncDisabled();`);
  c.push(`      formObserver = new MutationObserver(syncDisabled);`);
  c.push(`      formObserver.observe(formDocument.documentElement, {`);
  c.push(`        attributes: true,`);
  c.push(`        attributeFilter: ['disabled'],`);
  c.push(`        subtree: true,`);
  c.push(`      });`);
  c.push(`      formDocument.addEventListener('reset', onFormReset, true);`);
  c.push(`    });`);
  c.push(`    inject(DestroyRef).onDestroy(() => {`);
  c.push(`      formObserver?.disconnect();`);
  c.push(`      formDocument?.removeEventListener('reset', onFormReset, true);`);
  c.push(`      clearTimeout(formTimer);`);
  c.push(`    });`);
  if (hasInvalid) c.push(...emitOwnedProxyValidity());
  return c;
}

/** The proxy element, as template lines. */
export function emitFormProxy({ form, range, hasReadOnly }) {
  const type = proxyTypeFor(form);
  const a = [];
  a.push(`#formProxy`);
  a.push(`type="${type}"`);
  a.push(`[attr.name]="name() || null"`);
  a.push(`[attr.form]="form() || null"`);
  // A read-only answer still submits but is barred from validation, as in HTML. `readonly` does not
  // apply to checkbox or range, so `required` is withdrawn instead.
  a.push(`[required]="${hasReadOnly ? 'required() && !readOnly()' : 'required()'}"`);
  if (hasReadOnly && type === 'text') a.push(`[readOnly]="readOnly()"`);
  a.push(`[disabled]="disabled()"`);
  if (form.encoding === 'checked') a.push(`[value]="value()"`);
  if (type === 'range' && range) {
    a.push(`min="${range.min}"`);
    a.push(`max="${range.max}"`);
    a.push(`step="${range.step}"`);
  }
  a.push(`aria-hidden="true"`);
  a.push(`tabindex="-1"`);
  a.push(`autocomplete="off"`);
  a.push(`[style]="formProxyStyle"`);
  a.push(`(focus)="onFormProxyFocus($event)"`);
  return [`    <input`, ...a.map((x) => `      ${x}`), `    />`];
}

/**
 * `emitOwnedValidity` for a proxy, which a `viewChild` query yields only after the first render:
 * the shared owner (packages/emit-web/validity.mjs) is bound the first time the proxy is seen —
 * before its first `invalid` sync — and released on destroy.
 */
export function emitOwnedProxyValidity() {
  return [
    ...ownValidityFunction(4),
    `    let formValidity: ReturnType<typeof ownValidity> | undefined;`,
    `    effect(() => {`,
    `      const invalid = this.invalid();`,
    `      const proxy = this.formProxy()?.nativeElement;`,
    `      if (!proxy) return;`,
    `      formValidity ??= ownValidity(proxy);`,
    `      formValidity.setInvalid(invalid);`,
    `    });`,
    `    inject(DestroyRef).onDestroy(() => formValidity?.release());`,
  ];
}
