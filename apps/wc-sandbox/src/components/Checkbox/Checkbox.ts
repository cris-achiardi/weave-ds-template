// GENERATED from Checkbox.contract.json + Checkbox.wc.json. Do not edit by hand.
// Regenerate: node packages/wc/src/emit/emit.mjs Checkbox --out <dir>
//
// Records a yes/no answer that is collected rather than acted on immediately, and can additionally report that a set of answers below it is partly yes.

// THE ONE BUNDLER-SPECIFIC TOKEN IN THIS FILE. `?inline` asks Vite for the stylesheet as
// a string so it can be adopted into the shadow root rather than injected into the page —
// which is what a plain CSS import would do, and would put these rules where they can
// never match. The standard replacement is a CSS module script
// (`import sheet from './x.css' with { type: 'css' }`); it is not portable enough yet.
import structureCss from './Checkbox.structure.css?inline';
import themeCss from './Checkbox.theme.css?inline';

const SHEET = new CSSStyleSheet();
SHEET.replaceSync(structureCss + '\n' + themeCss);

// Built ONCE at module scope and cloned per instance. This is the whole render model:
// clone, then mutate attributes. It is enough because a contract's anatomy is STATIC —
// every part always exists, and `visibleWhen` hides rather than removes.
const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
    <button part="root" type="button" role="checkbox">
      <div part="box">
        <div part="tick"></div>
        <div part="dash"></div>
      </div>
      <div part="label">
        <slot name="label"></slot>
      </div>
      <slot></slot>
    </button>
`;

export class DsCheckbox extends HTMLElement {
  static readonly tagName = 'ds-checkbox';
  static readonly observedAttributes = ['disabled', 'invalid', 'checked'];

  readonly #root: HTMLElement;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open', delegatesFocus: true });
    shadow.adoptedStyleSheets = [SHEET];
    shadow.append(TEMPLATE.content.cloneNode(true));
    this.#root = shadow.querySelector('[part="root"]')!;

    this.#watchSlots(shadow);

    // NO HANDLER COMPOSITION. `addEventListener` is additive by definition, so a
    // consumer's listener on this element and the ones below both run — the problem
    // React and Vue each solve with a hand-written chain does not exist here.
    this.#root.addEventListener('click', (event) => this.#activate(event as MouseEvent));
  }

  /**
   * Reflect whether each named slot is filled.
   *
   * CSS cannot ask a <slot> whether anything was assigned to it, and a shadow root always
   * contains the element whether or not it is filled — so `:empty`, which is how the
   * light-DOM backends hide an unused icon box, never matches here.
   */
  #watchSlots(shadow: ShadowRoot): void {
    for (const slot of shadow.querySelectorAll<HTMLSlotElement>('slot[name]')) {
      const name = slot.getAttribute('name')!;
      const sync = () => this.toggleAttribute('has-' + name, slot.assignedNodes().length > 0);
      slot.addEventListener('slotchange', sync);
      sync();
    }
  }

  connectedCallback(): void {
    this.#update();
  }

  attributeChangedCallback(): void {
    // Cheap on purpose: every change re-writes every derived attribute. There is no
    // diffing here and none is wanted — the work is a handful of setAttribute calls.
    this.#update();
  }

  /** The platform's own disabled state. Removed from the focus order and cannot be answered. */
  get disabled(): boolean {
    return this.hasAttribute('disabled');
  }
  set disabled(value: boolean) {
    this.toggleAttribute('disabled', Boolean(value));
  }

  /** The answer failed validation — typically a required checkbox left unchecked. */
  get invalid(): boolean {
    return this.hasAttribute('invalid');
  }
  set invalid(value: boolean) {
    this.toggleAttribute('invalid', Boolean(value));
  }

  /** The answer. Three values, not two: `mixed` reports that a set of checkboxes below this one is partly checked, and is set by the implementation rather than chosen by a user. */
  get checked(): 'unchecked' | 'checked' | 'mixed' {
    return (this.getAttribute('checked') ?? 'unchecked') as 'unchecked' | 'checked' | 'mixed';
  }
  set checked(value: 'unchecked' | 'checked' | 'mixed') {
    this.setAttribute('checked', value);
  }

  #activate(event?: { defaultPrevented: boolean }): void {
    // Guards, because this runs on a CLICK and the platform guards there too.
    if (event?.defaultPrevented) return;
    if (this.disabled) return;
    this.checked = this.checked === 'checked' ? 'unchecked' : 'checked';
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
    root.setAttribute(
      'aria-checked',
      this.checked === 'unchecked'
        ? 'false'
        : this.checked === 'checked'
          ? 'true'
          : this.checked === 'mixed'
            ? 'mixed'
            : '',
    );
    root.toggleAttribute('disabled', this.disabled);
    root.toggleAttribute('aria-invalid', Boolean(this.invalid));
    this.#part('tick')?.toggleAttribute('hidden', !(this.checked === 'checked'));
    this.#part('dash')?.toggleAttribute('hidden', !(this.checked === 'mixed'));
  }

  #part(name: string): HTMLElement | null {
    return this.shadowRoot!.querySelector<HTMLElement>('[part="' + name + '"]');
  }
}

if (!customElements.get(DsCheckbox.tagName)) {
  customElements.define(DsCheckbox.tagName, DsCheckbox);
}

declare global {
  interface HTMLElementTagNameMap {
    'ds-checkbox': DsCheckbox;
  }
}
