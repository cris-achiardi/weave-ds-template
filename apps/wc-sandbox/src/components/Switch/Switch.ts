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

export class DsSwitch extends HTMLElement {
  static readonly tagName = 'ds-switch';
  static readonly observedAttributes = ['disabled', 'read-only', 'checked'];

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
    this.#root.addEventListener('click', (event) => this.#activate(event as MouseEvent));
  }

  connectedCallback(): void {
    this.#update();
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

  /** The switch is on. Tracked by the implementation and reflected to assistive technology. */
  get checked(): boolean {
    return this.hasAttribute('checked');
  }
  set checked(value: boolean) {
    this.toggleAttribute('checked', Boolean(value));
  }

  #activate(event?: { defaultPrevented: boolean }): void {
    // Guards, because this runs on a CLICK and the platform guards there too.
    if (event?.defaultPrevented) return;
    if (this.disabled || this.readOnly) return;
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

  #update(): void {
    const root = this.#root;
    root.setAttribute('aria-checked', String(this.checked));
    root.toggleAttribute('disabled', this.disabled);
    root.toggleAttribute('aria-readonly', Boolean(this.readOnly));
  }
}

if (!customElements.get(DsSwitch.tagName)) {
  customElements.define(DsSwitch.tagName, DsSwitch);
}

declare global {
  interface HTMLElementTagNameMap {
    'ds-switch': DsSwitch;
  }
}
