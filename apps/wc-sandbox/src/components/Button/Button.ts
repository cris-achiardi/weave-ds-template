// GENERATED from Button.contract.json + Button.wc.json. Do not edit by hand.
// Regenerate: node packages/wc/src/emit/emit.mjs Button --out <dir>
//
// Runs an action when chosen. It is the only component here that does something rather than holding something — nothing about a button's own state survives the click.

// THE ONE BUNDLER-SPECIFIC TOKEN IN THIS FILE. `?inline` asks Vite for the stylesheet as
// a string so it can be adopted into the shadow root rather than injected into the page —
// which is what a plain CSS import would do, and would put these rules where they can
// never match. The standard replacement is a CSS module script
// (`import sheet from './x.css' with { type: 'css' }`); it is not portable enough yet.
import structureCss from './Button.structure.css?inline';
import themeCss from './Button.theme.css?inline';

const SHEET = new CSSStyleSheet();
SHEET.replaceSync(structureCss + '\n' + themeCss);

// Built ONCE at module scope and cloned per instance. This is the whole render model:
// clone, then mutate attributes. It is enough because a contract's anatomy is STATIC —
// every part always exists, and `visibleWhen` hides rather than removes.
const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
    <button part="root" type="button">
      <div part="icon-start">
        <slot name="icon-start"></slot>
      </div>
      <div part="label">
        <slot></slot>
      </div>
      <div part="icon-end">
        <slot name="icon-end"></slot>
      </div>
    </button>
`;

export class Button extends HTMLElement {
  static readonly tagName = 'ds-button';
  static readonly observedAttributes = [
    'disabled',
    'loading',
    'hierarchy',
    'variant',
    'size',
    'aria-label',
  ];

  readonly #root: HTMLElement;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open', delegatesFocus: true });
    shadow.adoptedStyleSheets = [SHEET];
    shadow.append(TEMPLATE.content.cloneNode(true));
    this.#root = shadow.querySelector('[part="root"]')!;

    this.#watchSlots(shadow);

    // Listeners are additive, but internal listeners run before host bubbling listeners.
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

  /** The platform's own disabled state. Removed from the focus order and cannot be activated. */
  get disabled(): boolean {
    return this.hasAttribute('disabled');
  }
  set disabled(value: boolean) {
    this.toggleAttribute('disabled', Boolean(value));
  }

  /** The action is already running. The implementation must track this: no platform provides it. */
  get loading(): boolean {
    return this.hasAttribute('loading');
  }
  set loading(value: boolean) {
    this.toggleAttribute('loading', Boolean(value));
  }

  /** How much emphasis this action carries relative to the others around it. The rank of the action, not its colour — a page should hold one primary action, and everything else ranks below it. Defaults to `secondary` rather than the canon's `primary`, because the common case is not the page's most important action and a default of `primary` makes every unconsidered button shout. */
  get hierarchy(): 'primary' | 'secondary' | 'tertiary' {
    return (this.getAttribute('hierarchy') ?? 'secondary') as 'primary' | 'secondary' | 'tertiary';
  }
  set hierarchy(value: 'primary' | 'secondary' | 'tertiary') {
    this.setAttribute('hierarchy', value);
  }

  /** What kind of action this is, which selects the colour role. Orthogonal to `hierarchy`: a secondary destructive action is `hierarchy: secondary` and `variant: danger`, and collapsing the two axes would make that unsayable. `success` and `warning` are in the canon and deliberately not taken — an action is not a status. */
  get variant(): 'neutral' | 'brand' | 'danger' {
    return (this.getAttribute('variant') ?? 'neutral') as 'neutral' | 'brand' | 'danger';
  }
  set variant(value: 'neutral' | 'brand' | 'danger') {
    this.setAttribute('variant', value);
  }

  /** A contiguous subset of the canon's ladder. `xs` and `xl` are not designed for actions. */
  get size(): 's' | 'm' | 'l' {
    return (this.getAttribute('size') ?? 'm') as 's' | 'm' | 'l';
  }
  set size(value: 's' | 'm' | 'l') {
    this.setAttribute('size', value);
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
    // Write enumerated defaults into the DOM. A getter can fall back to the contract's
    // default and every script sees the right value; CSS cannot, because
    // `:host([hierarchy='secondary'])` matches an ATTRIBUTE. Idempotent, and the
    // re-entrancy guard above absorbs the callback each write causes.
    if (!this.hasAttribute('hierarchy')) this.setAttribute('hierarchy', 'secondary');
    if (!this.hasAttribute('variant')) this.setAttribute('variant', 'neutral');
    if (!this.hasAttribute('size')) this.setAttribute('size', 'm');

    root.toggleAttribute('disabled', this.disabled);
  }
}

if (!customElements.get(Button.tagName)) {
  customElements.define(Button.tagName, Button);
}

declare global {
  interface HTMLElementTagNameMap {
    'ds-button': Button;
  }
}
