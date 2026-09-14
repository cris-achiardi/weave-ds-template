// GENERATED from Accordion.contract.json + Accordion.wc.json. Do not edit by hand.
// Regenerate: node packages/wc/src/emit/emit.mjs Accordion --out <dir>
//
// Holds which of a set of sections are expanded, and lets a reader open one without losing the list of the others. It exists so that the open set has exactly one home rather than each section holding its own copy.

// THE ONE BUNDLER-SPECIFIC TOKEN IN THIS FILE. `?inline` asks Vite for the stylesheet as
// a string so it can be adopted into the shadow root rather than injected into the page —
// which is what a plain CSS import would do, and would put these rules where they can
// never match. The standard replacement is a CSS module script
// (`import sheet from './x.css' with { type: 'css' }`); it is not portable enough yet.
import structureCss from './Accordion.structure.css?inline';
import themeCss from './Accordion.theme.css?inline';

const SHEET = new CSSStyleSheet();
SHEET.replaceSync(structureCss + '\n' + themeCss);

// Built ONCE at module scope and cloned per instance. This is the whole render model:
// clone, then mutate attributes. It is enough because a contract's anatomy is STATIC —
// every part always exists, and `visibleWhen` hides rather than removes.
const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
    <div part="root">
      <slot></slot>
    </div>
`;

// A counter, because the platform has no useId. It matters less here than anywhere:
// every id below is scoped to this element's own shadow root.
let nextId = 0;

/** Fired on the collection whenever the selection or the roster changes. */
export const ACCORDION_CHANGE = 'ds-accordion-internal-change';

export class Accordion extends HTMLElement {
  static readonly tagName = 'ds-accordion';
  static readonly observedAttributes = ['disabled', 'orientation', 'value'];

  readonly #root: HTMLElement;
  readonly #baseId = 'ds-accordion-' + nextId++;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open', delegatesFocus: false });
    shadow.adoptedStyleSheets = [SHEET];
    shadow.append(TEMPLATE.content.cloneNode(true));
    this.#root = shadow.querySelector('[part="root"]')!;

    // NO HANDLER COMPOSITION. `addEventListener` is additive by definition, so a
    // consumer's listener on this element and the ones below both run — the problem
    // React and Vue each solve with a hand-written chain does not exist here.
  }

  connectedCallback(): void {
    this.#update();
  }

  attributeChangedCallback(): void {
    // Cheap on purpose: every change re-writes every derived attribute. There is no
    // diffing here and none is wanted — the work is a handful of setAttribute calls.
    this.#update();
    this.#announce();
  }

  /** The whole accordion ignores interaction. Cascades to every item. */
  get disabled(): boolean {
    return this.hasAttribute('disabled');
  }
  set disabled(value: boolean) {
    this.toggleAttribute('disabled', Boolean(value));
  }

  /** Only vertical is designed. Recorded as an axis with one value rather than omitted, because the horizontal case exists in the canon and this component deliberately does not take it. */
  get orientation(): 'vertical' {
    return (this.getAttribute('orientation') ?? 'vertical') as 'vertical';
  }
  set orientation(value: 'vertical') {
    this.setAttribute('orientation', value);
  }

  /** The current selection, by member identity. */
  get value(): string[] {
    // Space separated, like every other token list the platform has — class, rel,
    // aria-describedby. An attribute is a string and something had to be chosen.
    return (this.getAttribute('value') ?? '').split(/\s+/).filter(Boolean);
  }
  set value(value: string[]) {
    this.setAttribute('value', value.join(' '));
  }

  /** Called by a member when it is activated. */
  toggle(memberValue: string): void {
    const current = this.value;
    this.value = current.includes(memberValue)
      ? current.filter((v) => v !== memberValue)
      : [...current, memberValue];
    this.#emit('value-change', this.value);
    this.#announce();
  }

  /** The id root every member's parts hang off. */
  get baseId(): string {
    return this.#baseId;
  }

  /** Tell every member to re-read us. The DOM's answer to a re-render. */
  #announce(): void {
    this.dispatchEvent(new Event(ACCORDION_CHANGE));
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
    // Write enumerated defaults into the DOM. A getter can fall back to the contract's
    // default and every script sees the right value; CSS cannot, because
    // `:host([hierarchy='secondary'])` matches an ATTRIBUTE. Idempotent, and the
    // re-entrancy guard above absorbs the callback each write causes.
    if (!this.hasAttribute('orientation')) this.setAttribute('orientation', 'vertical');

    root.toggleAttribute('aria-disabled', Boolean(this.disabled));
  }
}

if (!customElements.get(Accordion.tagName)) {
  customElements.define(Accordion.tagName, Accordion);
}

declare global {
  interface HTMLElementTagNameMap {
    'ds-accordion': Accordion;
  }
}
