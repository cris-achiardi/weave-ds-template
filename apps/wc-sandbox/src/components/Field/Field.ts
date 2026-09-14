// GENERATED from Field.contract.json + Field.wc.json. Do not edit by hand.
// Regenerate: node packages/wc/src/emit/emit.mjs Field --out <dir>
//
// Wires a form control to its label, its help text and its error message, so the three are announced together and the control's validity has one place to live. It is the plumbing around an input, never the input.

// THE ONE BUNDLER-SPECIFIC TOKEN IN THIS FILE. `?inline` asks Vite for the stylesheet as
// a string so it can be adopted into the shadow root rather than injected into the page —
// which is what a plain CSS import would do, and would put these rules where they can
// never match. The standard replacement is a CSS module script
// (`import sheet from './x.css' with { type: 'css' }`); it is not portable enough yet.
import structureCss from './Field.structure.css?inline';
import themeCss from './Field.theme.css?inline';

const SHEET = new CSSStyleSheet();
SHEET.replaceSync(structureCss + '\n' + themeCss);

// Built ONCE at module scope and cloned per instance. This is the whole render model:
// clone, then mutate attributes. It is enough because a contract's anatomy is STATIC —
// every part always exists, and `visibleWhen` hides rather than removes.
const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
    <div part="root">
      <div part="label">
        <slot name="label"></slot>
      </div>
      <div part="control">
        <slot name="control"></slot>
      </div>
      <div part="description">
        <slot name="description"></slot>
      </div>
      <div part="error">
        <slot name="error"></slot>
      </div>
      <slot></slot>
    </div>
`;

// A counter, because the platform has no useId. It matters less here than anywhere:
// every id below is scoped to this element's own shadow root.
let nextId = 0;

export class Field extends HTMLElement {
  static readonly tagName = 'ds-field';
  static readonly observedAttributes = ['disabled', 'invalid', 'touched', 'dirty'];

  readonly #root: HTMLElement;
  readonly #baseId = 'ds-field-' + nextId++;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open', delegatesFocus: false });
    shadow.adoptedStyleSheets = [SHEET];
    shadow.append(TEMPLATE.content.cloneNode(true));
    this.#root = shadow.querySelector('[part="root"]')!;

    this.#watchSlots(shadow);

    // NO HANDLER COMPOSITION. `addEventListener` is additive by definition, so a
    // consumer's listener on this element and the ones below both run — the problem
    // React and Vue each solve with a hand-written chain does not exist here.
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

  /** The control ignores interaction. Set on the field so the label and description can dim with it. */
  get disabled(): boolean {
    return this.hasAttribute('disabled');
  }
  set disabled(value: boolean) {
    this.toggleAttribute('disabled', Boolean(value));
  }

  /** Validation has run and failed. Reaches assistive technology as aria-invalid and shows the error. */
  get invalid(): boolean {
    return this.hasAttribute('invalid');
  }
  set invalid(value: boolean) {
    this.toggleAttribute('invalid', Boolean(value));
  }

  /** The control has been focused and then blurred at least once. Gates WHEN an error is allowed to show. */
  get touched(): boolean {
    return this.hasAttribute('touched');
  }
  set touched(value: boolean) {
    this.toggleAttribute('touched', Boolean(value));
  }

  /** The value differs from the value the field started with. Gates validation timing and enables a reset affordance. */
  get dirty(): boolean {
    return this.hasAttribute('dirty');
  }
  set dirty(value: boolean) {
    this.toggleAttribute('dirty', Boolean(value));
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
    if (this.disabled) root.setAttribute('aria-disabled', 'true');
    else root.removeAttribute('aria-disabled');
    this.#part('label')?.setAttribute('id', this.#baseId + '-label');
    this.#part('control')?.setAttribute('id', this.#baseId + '-control');
    this.#part('description')?.setAttribute('id', this.#baseId + '-description');
    this.#part('error')?.setAttribute('id', this.#baseId + '-error');
    this.#part('control')?.setAttribute('aria-labelledby', this.#baseId + '-label');
    this.#part('control')?.setAttribute(
      'aria-describedby',
      [this.#baseId + '-description', this.invalid ? this.#baseId + '-error' : '']
        .filter(Boolean)
        .join(' '),
    );
    this.#part('error')?.toggleAttribute('hidden', !this.invalid);
  }

  #part(name: string): HTMLElement | null {
    return this.shadowRoot!.querySelector<HTMLElement>('[part="' + name + '"]');
  }
}

if (!customElements.get(Field.tagName)) {
  customElements.define(Field.tagName, Field);
}

declare global {
  interface HTMLElementTagNameMap {
    'ds-field': Field;
  }
}
