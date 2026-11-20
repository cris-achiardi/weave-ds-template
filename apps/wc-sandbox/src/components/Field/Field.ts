// GENERATED from Field.contract.json + Field.wc.json. Do not edit by hand.
// Regenerate: node packages/wc/src/emit/emit.mjs Field --out <dir>
//
// Wires a form control to its label, its help text and its error message, so the three are announced together and the control's validity has one place to live. It is the plumbing around an input, never the input.

import { suppliedId, supplyRelations } from '@ds/wc/behavior';
import type { SuppliedRelations } from '@ds/wc/behavior';

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
// most ids below are scoped to this element's own shadow root. The exception is an id
// given to a SLOTTED element that has none, which lives in the consumer's tree.
let nextId = 0;

export class Field extends HTMLElement {
  static readonly tagName = 'ds-field';
  static readonly observedAttributes = ['disabled', 'invalid', 'touched', 'dirty'];

  readonly #root: HTMLElement;
  readonly #baseId = 'ds-field-' + nextId++;
  readonly #supplied = supplyRelations('Field');

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open', delegatesFocus: false });
    shadow.adoptedStyleSheets = [SHEET];
    shadow.append(TEMPLATE.content.cloneNode(true));
    this.#root = shadow.querySelector('[part="root"]')!;

    this.#watchSlots(shadow);

    // A replaced or removed slotted element is re-wired, and the old one handed back clean.
    shadow.addEventListener('slotchange', () => this.#wireSupplied());
    // A native <label for> cannot reach across the shadow boundary, so clicking the
    // label part focuses the slotted control directly. Focus only: a checkable
    // control is not toggled the way a native label would toggle it.
    this.#part('label')?.addEventListener('click', () => {
      const control = this.#supplied.single(this.#slot('control'));
      if (control instanceof HTMLElement) control.focus();
    });

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

  disconnectedCallback(): void {
    this.#supplied.release();
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
    this.#part('description')?.setAttribute('id', this.#baseId + '-description');
    this.#part('error')?.setAttribute('id', this.#baseId + '-error');
    this.#part('error')?.toggleAttribute('hidden', !this.invalid);
    this.#wireSupplied();
  }

  /**
   * Write each slot-filled part's relations onto the element the consumer slotted in.
   *
   * IDREFs between LIGHT-DOM elements: the slotted control points at the slotted content of
   * each target part, giving that content an id if it has none. Consumer ids and tokens
   * are never removed; an element that left its slot gets back exactly what it had.
   */
  #wireSupplied(): void {
    const entries: [Element, SuppliedRelations][] = [];
    const content = (slot: string, key: string): string[] =>
      (this.#slot(slot)?.assignedElements({ flatten: true }) ?? []).map((el, i) => {
        const id = suppliedId(el, this.#baseId + '-' + key + '-' + i);
        entries.push([el, { id }]);
        return id;
      });
    const control = this.#supplied.single(this.#slot('control'));
    if (control) {
      entries.push([
        control,
        {
          labelledBy: content('label', 'label'),
          describedBy: [
            ...content('description', 'description'),
            ...(this.invalid ? content('error', 'error') : []),
          ],
          invalid: this.invalid,
        },
      ]);
    }
    this.#supplied.write(entries);
  }

  #slot(name: string): HTMLSlotElement | null {
    return this.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="' + name + '"]');
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
