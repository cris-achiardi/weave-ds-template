// GENERATED from TextField.contract.json + TextField.wc.json. Do not edit by hand.
// Regenerate: node packages/wc/src/emit/emit.mjs TextField --out <dir>
//
// Collects a single line of text from a person. It is the control itself, where Field is the plumbing around a control — the two compose, and neither does the other's job.

// THE ONE BUNDLER-SPECIFIC TOKEN IN THIS FILE. `?inline` asks Vite for the stylesheet as
// a string so it can be adopted into the shadow root rather than injected into the page —
// which is what a plain CSS import would do, and would put these rules where they can
// never match. The standard replacement is a CSS module script
// (`import sheet from './x.css' with { type: 'css' }`); it is not portable enough yet.
import structureCss from './TextField.structure.css?inline';
import themeCss from './TextField.theme.css?inline';

const SHEET = new CSSStyleSheet();
SHEET.replaceSync(structureCss + '\n' + themeCss);

// Built ONCE at module scope and cloned per instance. This is the whole render model:
// clone, then mutate attributes. It is enough because a contract's anatomy is STATIC —
// every part always exists, and `visibleWhen` hides rather than removes.
const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
    <input part="root" />
`;

export class DsTextField extends HTMLElement {
  static readonly tagName = 'ds-text-field';
  static readonly observedAttributes = ['disabled', 'read-only', 'invalid', 'size', 'value'];

  readonly #root: HTMLElement;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open', delegatesFocus: true });
    shadow.adoptedStyleSheets = [SHEET];
    shadow.append(TEMPLATE.content.cloneNode(true));
    this.#root = shadow.querySelector('[part="root"]')!;

    // NO HANDLER COMPOSITION. `addEventListener` is additive by definition, so a
    // consumer's listener on this element and the ones below both run — the problem
    // React and Vue each solve with a hand-written chain does not exist here.
    this.#root.addEventListener('input', (event) => this.#handleInput(event));
  }

  connectedCallback(): void {
    this.#update();
  }

  attributeChangedCallback(): void {
    // Cheap on purpose: every change re-writes every derived attribute. There is no
    // diffing here and none is wanted — the work is a handful of setAttribute calls.
    this.#update();
  }

  /** The platform's own disabled state. Removed from the focus order and cannot be typed into. */
  get disabled(): boolean {
    return this.hasAttribute('disabled');
  }
  set disabled(value: boolean) {
    this.toggleAttribute('disabled', Boolean(value));
  }

  /** The text can be read and selected but not changed. Distinct from disabled, which removes it from the focus order. */
  get readOnly(): boolean {
    return this.hasAttribute('read-only');
  }
  set readOnly(value: boolean) {
    this.toggleAttribute('read-only', Boolean(value));
  }

  /** Set from outside — usually by a surrounding Field. This component does not decide it. */
  get invalid(): boolean {
    return this.hasAttribute('invalid');
  }
  set invalid(value: boolean) {
    this.toggleAttribute('invalid', Boolean(value));
  }

  /** A contiguous subset of the canon's ladder. */
  get size(): 's' | 'm' | 'l' {
    return (this.getAttribute('size') ?? 'm') as 's' | 'm' | 'l';
  }
  set size(value: 's' | 'm' | 'l') {
    this.setAttribute('size', value);
  }

  /** The text itself. Free-form: not a boolean, and not one of a fixed set — which is what makes this the first state in the library that `values` cannot describe. */
  get value(): string {
    return this.getAttribute('value') ?? '';
  }
  set value(value: string) {
    this.setAttribute('value', value);
  }

  #handleInput(event: Event): void {
    this.value = (event.target as HTMLInputElement).value;
    this.#emit('value-change', this.value);
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

  #update(): void {
    const root = this.#root;
    root.toggleAttribute('disabled', this.disabled);
    root.toggleAttribute('aria-readonly', Boolean(this.readOnly));
    root.toggleAttribute('aria-invalid', Boolean(this.invalid));
    (root as HTMLInputElement).value = this.value;
    root.toggleAttribute('readonly', this.readOnly);
  }
}

if (!customElements.get(DsTextField.tagName)) {
  customElements.define(DsTextField.tagName, DsTextField);
}

declare global {
  interface HTMLElementTagNameMap {
    'ds-text-field': DsTextField;
  }
}
