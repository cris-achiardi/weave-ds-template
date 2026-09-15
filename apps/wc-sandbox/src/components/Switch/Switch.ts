// GENERATED from Switch.contract.json + Switch.wc.json. Do not edit by hand.
// Regenerate: node packages/wc/src/emit/emit.mjs Switch --out <dir>
//
// A binary on/off control that takes effect immediately, for a setting whose two states both make sense on their own — not a value collected and submitted later.

// THE ONE BUNDLER-SPECIFIC TOKEN IN THIS FILE. `?inline` asks Vite for the stylesheet as
// a string so it can be adopted into the shadow root rather than injected into the page —
// which is what a plain CSS import would do, and would put these rules where they can
// never match. The standard replacement is a CSS module script
// (`import sheet from './x.css' with { type: 'css' }`); it is not portable enough yet.
import structureCss from './Switch.structure.css?inline';
import themeCss from './Switch.theme.css?inline';

const SHEET = new CSSStyleSheet();
SHEET.replaceSync(structureCss + '\n' + themeCss);

// Built ONCE at module scope and cloned per instance. This is the whole render model:
// clone, then mutate attributes. It is enough because a contract's anatomy is STATIC —
// every part always exists, and `visibleWhen` hides rather than removes.
const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
    <button part="root" type="button" role="switch">
      <div part="thumb"></div>
    </button>
`;

export class Switch extends HTMLElement {
  static readonly tagName = 'ds-switch';
  static readonly formAssociated = true;
  static readonly observedAttributes = [
    'disabled',
    'read-only',
    'name',
    'required',
    'value',
    'checked',
    'aria-label',
  ];

  readonly #internals = this.attachInternals();
  #formDisabled = false;
  #customValidity = '';
  #initialFormValue: boolean | undefined;
  readonly #root: HTMLElement;
  readonly #pendingActivations = new Set<number>();

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open', delegatesFocus: true });
    shadow.adoptedStyleSheets = [SHEET];
    shadow.append(TEMPLATE.content.cloneNode(true));
    this.#root = shadow.querySelector('[part="root"]')!;

    // Listeners are additive, but internal listeners run before host bubbling listeners.
    // Queue click activation so the consumer can cancel it before state changes.
    this.#root.addEventListener('click', (event) => this.#queueActivation(event as MouseEvent));
  }

  connectedCallback(): void {
    this.#initialFormValue ??= this.checked;
    this.#update();
  }

  disconnectedCallback(): void {
    for (const timer of this.#pendingActivations) window.clearTimeout(timer);
    this.#pendingActivations.clear();
  }

  attributeChangedCallback(): void {
    // Cheap on purpose: every change re-writes every derived attribute. There is no
    // diffing here and none is wanted — the work is a handful of setAttribute calls.
    this.#update();
  }

  /** The platform's own disabled state. Removed from the focus order and cannot be toggled. */
  get disabled(): boolean {
    return this.hasAttribute('disabled');
  }
  set disabled(value: boolean) {
    this.toggleAttribute('disabled', Boolean(value));
  }

  /** Cannot be toggled, but remains focusable and readable. Distinct from disabled, which removes it from the focus order entirely. */
  get readOnly(): boolean {
    return this.hasAttribute('read-only');
  }
  set readOnly(value: boolean) {
    this.toggleAttribute('read-only', Boolean(value));
  }

  /** Name of the submitted answer. An empty name contributes nothing. */
  get name(): string {
    return this.getAttribute('name') ?? '';
  }
  set name(value: string) {
    this.setAttribute('name', value);
  }

  /** Whether an answer is required for form validation. */
  get required(): boolean {
    return this.hasAttribute('required');
  }
  set required(value: boolean) {
    this.toggleAttribute('required', Boolean(value));
  }

  /** Value submitted when checked. */
  get value(): string {
    return this.getAttribute('value') ?? 'on';
  }
  set value(value: string) {
    this.setAttribute('value', value);
  }

  /** The switch is on. Tracked by the implementation and reflected to assistive technology. */
  get checked(): boolean {
    return this.hasAttribute('checked');
  }
  set checked(value: boolean) {
    this.toggleAttribute('checked', Boolean(value));
  }

  #queueActivation(event: MouseEvent): void {
    if (!this.isConnected || event.defaultPrevented) return;
    if (this.disabled || this.#formDisabled || this.readOnly) return;
    // A task, not a microtask: trusted events can checkpoint between listeners.
    const timer = window.setTimeout(() => {
      this.#pendingActivations.delete(timer);
      if (!this.isConnected) return;
      this.#activate(event);
    }, 0);
    this.#pendingActivations.add(timer);
  }

  #activate(event: MouseEvent): void {
    // Recheck cancellation and availability after every host listener has run.
    if (event.defaultPrevented) return;
    if (this.disabled || this.#formDisabled || this.readOnly) return;
    this.checked = !this.checked;
    this.#emit('checked-change', this.checked);
  }

  /**
   * Announce a `shared` state changing.
   *
   * `composed: true` so it escapes this shadow root at all, and `bubbles: true` so a
   * listener on an ancestor hears it. Both are opt-in: an event that crossed the
   * boundary by default would leak every internal click to the page.
   */
  #emit(type: string, detail: unknown): void {
    this.dispatchEvent(new CustomEvent('ds-' + type, { detail, bubbles: true, composed: true }));
  }

  #updating = false;

  #update(): void {
    // Writing an attribute this element observes re-enters here. The collection no longer
    // announces unless something moved, which is the real fix; this is the cheap
    // guarantee that no future write can reintroduce the same shape.
    if (this.#updating) return;
    this.#updating = true;
    try {
      this.#write();
    } finally {
      this.#updating = false;
    }
  }

  #write(): void {
    const root = this.#root;
    // The semantic control is inside the shadow root; naming only the host misses it.
    const label = this.getAttribute('aria-label');
    if (label === null) root.removeAttribute('aria-label');
    else root.setAttribute('aria-label', label);
    root.setAttribute('aria-checked', String(this.checked));
    root.toggleAttribute('disabled', this.disabled || this.#formDisabled);
    if (this.readOnly) root.setAttribute('aria-readonly', 'true');
    else root.removeAttribute('aria-readonly');
    this.#syncForm();
  }

  get form(): HTMLFormElement | null {
    return this.#internals.form;
  }
  get validity(): ValidityState {
    return this.#internals.validity;
  }
  get validationMessage(): string {
    return this.#internals.validationMessage;
  }
  get willValidate(): boolean {
    return this.#internals.willValidate;
  }
  checkValidity(): boolean {
    return this.#internals.checkValidity();
  }
  reportValidity(): boolean {
    return this.#internals.reportValidity();
  }
  setCustomValidity(message: string): void {
    this.#customValidity = String(message);
    this.#update();
  }
  formDisabledCallback(disabled: boolean): void {
    this.#formDisabled = disabled;
    this.#update();
  }
  formResetCallback(): void {
    for (const timer of this.#pendingActivations) window.clearTimeout(timer);
    this.#pendingActivations.clear();

    if (this.#initialFormValue !== undefined) this.checked = this.#initialFormValue;

    this.#update();
  }
  formStateRestoreCallback(state: string | File | FormData | null): void {
    if (typeof state !== 'string') return;
    if (state !== 'true' && state !== 'false') return;
    for (const timer of this.#pendingActivations) window.clearTimeout(timer);
    this.#pendingActivations.clear();

    this.checked = state === 'true';

    this.#update();
  }
  #syncForm(): void {
    const answer = this.checked;
    const disabled = this.disabled || this.#formDisabled;
    this.#internals.setFormValue(
      disabled ? null : answer === true ? this.value : null,
      String(answer),
    );
    this.toggleAttribute('readonly', this.readOnly);
    const valueMissing = this.required && answer !== true;
    const customError = Boolean(this.#customValidity);
    const flags = { valueMissing, customError };
    const message =
      this.#customValidity ||
      (customError ? 'Invalid value.' : valueMissing ? 'Please provide an answer.' : '');
    this.#internals.setValidity(flags, message, this.#root);
    this.#root.setAttribute('aria-invalid', String(valueMissing || customError));
    this.#root.setAttribute('aria-required', String(this.required));
  }
}

if (!customElements.get(Switch.tagName)) {
  customElements.define(Switch.tagName, Switch);
}

declare global {
  interface HTMLElementTagNameMap {
    'ds-switch': Switch;
  }
}
