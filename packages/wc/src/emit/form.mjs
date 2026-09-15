/** Form lifecycle methods, emitted only for an explicit contract contribution. */
export function emitFormMethods(
  form,
  model,
  { range, hasInvalid, commitEditing, hasReadOnly, hasActivation },
) {
  const source = `this.${form.property}`;
  const checked = form.encoding === 'checked';
  const number = form.encoding === 'number';
  const serialized = checked
    ? `(answer === ${JSON.stringify(form.checkedValue)} ? this.value : null)`
    : 'String(answer)';
  const missing = checked
    ? `answer !== ${JSON.stringify(form.checkedValue)}`
    : number
      ? 'false'
      : "answer === ''";
  const normalize = number
    ? `snap(Number.isFinite(${source}) ? ${source} : ${range.min}, RANGE)`
    : source;
  const restore = number
    ? 'Number(state)'
    : model.kind === 'boolean'
      ? "state === 'true'"
      : `state as ${model.type}`;
  const restoreGuard = number
    ? 'if (!Number.isFinite(Number(state))) return;'
    : model.kind === 'enum'
      ? `if (![${model.type.split(' | ').join(', ')}].includes(state)) return;`
      : model.kind === 'boolean'
        ? "if (state !== 'true' && state !== 'false') return;"
        : '';
  const cancel = [
    hasActivation
      ? 'for (const timer of this.#pendingActivations) window.clearTimeout(timer); this.#pendingActivations.clear();'
      : '',
    form.source === 'selection' ? 'this.#interactionVersion++;' : '',
  ].join('\n');
  return `
  get form(): HTMLFormElement | null { return this.#internals.form; }
  get validity(): ValidityState { return this.#internals.validity; }
  get validationMessage(): string { return this.#internals.validationMessage; }
  get willValidate(): boolean { return this.#internals.willValidate; }
  checkValidity(): boolean { return this.#internals.checkValidity(); }
  reportValidity(): boolean { return this.#internals.reportValidity(); }
  setCustomValidity(message: string): void {
    this.#customValidity = String(message);
    this.#update();
  }
  formDisabledCallback(disabled: boolean): void {
    this.#formDisabled = disabled;
    this.#update();
    ${form.source === 'selection' ? 'this.#announce();' : ''}
  }
  formResetCallback(): void {
    ${cancel}
    if (this.#initialFormValue !== undefined) ${source} = this.#initialFormValue;
    ${commitEditing ? `this.#draftSource = undefined;` : ''}
    this.#update();
  }
  formStateRestoreCallback(state: string | File | FormData | null): void {
    if (typeof state !== 'string') return;
    ${restoreGuard}
    ${cancel}
    ${source} = ${restore};
    ${commitEditing ? 'this.#draftSource = undefined;' : ''}
    this.#update();
  }
  #syncForm(): void {
    const answer = ${normalize};
    const disabled = this.disabled || this.#formDisabled;
    this.#internals.setFormValue(disabled ? null : ${serialized}, String(answer));
    ${hasReadOnly ? "this.toggleAttribute('readonly', this.readOnly);" : ''}
    const valueMissing = this.required && (${missing});
    const customError = Boolean(this.#customValidity)${hasInvalid ? ' || this.invalid' : ''};
    const flags = { valueMissing, customError };
    const message = this.#customValidity || (customError ? 'Invalid value.' : valueMissing ? 'Please provide an answer.' : '');
    this.#internals.setValidity(flags, message, this.#root);
    this.#root.setAttribute('aria-invalid', String(valueMissing || customError));
    this.#root.setAttribute('aria-required', String(this.required));
  }
`;
}
