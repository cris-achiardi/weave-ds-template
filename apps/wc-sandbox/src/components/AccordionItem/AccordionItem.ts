// GENERATED from AccordionItem.contract.json + AccordionItem.wc.json. Do not edit by hand.
// Regenerate: node packages/wc/src/emit/emit.mjs AccordionItem --out <dir>
//
// One section of an accordion: a heading that reveals a panel when chosen. It carries its own identity and its own disabled state, and nothing else — whether it is open is a comparison against the surrounding Accordion, not a property it holds.

import { ACCORDION_CHANGE, type Accordion } from '../Accordion/Accordion';

// THE ONE BUNDLER-SPECIFIC TOKEN IN THIS FILE. `?inline` asks Vite for the stylesheet as
// a string so it can be adopted into the shadow root rather than injected into the page —
// which is what a plain CSS import would do, and would put these rules where they can
// never match. The standard replacement is a CSS module script
// (`import sheet from './x.css' with { type: 'css' }`); it is not portable enough yet.
import structureCss from './AccordionItem.structure.css?inline';
import themeCss from './AccordionItem.theme.css?inline';

const SHEET = new CSSStyleSheet();
SHEET.replaceSync(structureCss + '\n' + themeCss);

// Built ONCE at module scope and cloned per instance. This is the whole render model:
// clone, then mutate attributes. It is enough because a contract's anatomy is STATIC —
// every part always exists, and `visibleWhen` hides rather than removes.
const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
    <div part="root">
      <div part="header">
        <button part="trigger" type="button">
          <slot name="heading"></slot>
          <div part="indicator"></div>
        </button>
      </div>
      <div part="panel" role="region">
        <slot name="panel"></slot>
      </div>
      <slot></slot>
    </div>
`;

// A counter, because the platform has no useId. It matters less here than anywhere:
// every id below is scoped to this element's own shadow root.
let nextId = 0;

export class AccordionItem extends HTMLElement {
  static readonly tagName = 'ds-accordion-item';
  static readonly observedAttributes = ['disabled', 'value'];

  readonly #root: HTMLElement;
  readonly #baseId = 'ds-accordion-item-' + nextId++;
  #collection: Accordion | null = null;

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
    shadow
      .querySelector('[part="trigger"]')!
      .addEventListener('click', (event) => this.#activate(event as MouseEvent));
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
    this.#collection = this.closest<Accordion>('ds-accordion');
    if (!this.#collection) {
      throw new Error(
        '<ds-accordion-item> must be inside a <ds-accordion>. There is no selection to compare against, and looking unselected would hide the mistake.',
      );
    }
    this.#collection.addEventListener(ACCORDION_CHANGE, this.#onCollectionChange);
    this.#update();
  }

  disconnectedCallback(): void {
    this.#collection?.removeEventListener(ACCORDION_CHANGE, this.#onCollectionChange);
    this.#collection = null;
  }

  readonly #onCollectionChange = () => this.#update();

  attributeChangedCallback(): void {
    // Cheap on purpose: every change re-writes every derived attribute. There is no
    // diffing here and none is wanted — the work is a handful of setAttribute calls.
    this.#update();
  }

  /** Set by the `disabled` prop or inherited from the Accordion. Rendered as a natively disabled button. */
  get disabled(): boolean {
    return this.hasAttribute('disabled');
  }
  set disabled(value: boolean) {
    this.toggleAttribute('disabled', Boolean(value));
  }

  /** Distinguishes this AccordionItem from its siblings. The ancestor Accordion compares against it to decide whether this one is in the selection. */
  get value(): string {
    return this.getAttribute('value') ?? '';
  }
  set value(value: string) {
    this.setAttribute('value', value);
  }

  get #isDisabled(): boolean {
    return this.disabled || Boolean(this.#collection?.hasAttribute('disabled'));
  }

  get #selected(): boolean {
    return Boolean(this.#collection?.value.includes(this.value));
  }

  #activate(event?: { defaultPrevented: boolean }): void {
    // Guards, because this runs on a CLICK and the platform guards there too.
    if (event?.defaultPrevented) return;
    if (this.#isDisabled) return;
    this.#collection?.toggle(this.value);
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
    // The host carries it too, because CSS cannot select inside a shadow root from
    // outside and cannot append an attribute selector to ::part(). One fact, two
    // places — forced by the boundary, not chosen.
    this.toggleAttribute('open', this.#selected);
    this.#part('trigger')?.setAttribute('id', this.#baseId + '-trigger');
    this.#part('panel')?.setAttribute('id', this.#baseId + '-panel');
    this.#part('trigger')?.setAttribute('aria-controls', this.#baseId + '-panel');
    this.#part('trigger')?.setAttribute('aria-expanded', String(this.#selected));
    this.#part('panel')?.setAttribute('aria-labelledby', this.#baseId + '-trigger');
    this.#part('panel')?.toggleAttribute('hidden', !this.#selected);
  }

  #part(name: string): HTMLElement | null {
    return this.shadowRoot!.querySelector<HTMLElement>('[part="' + name + '"]');
  }
}

if (!customElements.get(AccordionItem.tagName)) {
  customElements.define(AccordionItem.tagName, AccordionItem);
}

declare global {
  interface HTMLElementTagNameMap {
    'ds-accordion-item': AccordionItem;
  }
}
