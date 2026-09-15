// GENERATED from RadioItem.contract.json + RadioItem.wc.json. Do not edit by hand.
// Regenerate: node packages/wc/src/emit/emit.mjs RadioItem --out <dir>
//
// One option in a radio group: a label that becomes the group's answer when chosen. It carries its own identity and its own disabled state, and nothing else — whether it is chosen is a comparison, not a property it holds.

import { RADIOGROUP_CHANGE, type RadioGroup } from '../RadioGroup/RadioGroup';

// THE ONE BUNDLER-SPECIFIC TOKEN IN THIS FILE. `?inline` asks Vite for the stylesheet as
// a string so it can be adopted into the shadow root rather than injected into the page —
// which is what a plain CSS import would do, and would put these rules where they can
// never match. The standard replacement is a CSS module script
// (`import sheet from './x.css' with { type: 'css' }`); it is not portable enough yet.
import structureCss from './RadioItem.structure.css?inline';
import themeCss from './RadioItem.theme.css?inline';

const SHEET = new CSSStyleSheet();
SHEET.replaceSync(structureCss + '\n' + themeCss);

// Built ONCE at module scope and cloned per instance. This is the whole render model:
// clone, then mutate attributes. It is enough because a contract's anatomy is STATIC —
// every part always exists, and `visibleWhen` hides rather than removes.
const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
    <div part="root" role="radio">
      <div part="control">
        <div part="mark"></div>
      </div>
      <div part="label">
        <slot name="label"></slot>
      </div>
      <slot></slot>
    </div>
`;

export class RadioItem extends HTMLElement {
  static readonly tagName = 'ds-radio-item';
  static readonly observedAttributes = ['disabled', 'value', 'aria-label'];

  readonly #root: HTMLElement;
  #collection: RadioGroup | null = null;
  #registeredValue: string | null = null;
  readonly #pendingActivations = new Set<number>();

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open', delegatesFocus: true });
    shadow.adoptedStyleSheets = [SHEET];
    shadow.append(TEMPLATE.content.cloneNode(true));
    this.#root = shadow.querySelector('[part="root"]')!;

    this.#watchSlots(shadow);

    // Listeners are additive, but internal listeners run before host bubbling listeners.
    // Queue click activation so the consumer can cancel it before state changes.
    this.#root.addEventListener('click', (event) => this.#queueActivation(event as MouseEvent));
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
    this.#collection = this.closest<RadioGroup>('ds-radio-group');
    if (!this.#collection) {
      throw new Error(
        '<ds-radio-item> must be inside a <ds-radio-group>. There is no selection to compare against, and looking unselected would hide the mistake.',
      );
    }
    this.#collection.addEventListener(RADIOGROUP_CHANGE, this.#onCollectionChange);
    this.#update();
  }

  disconnectedCallback(): void {
    for (const timer of this.#pendingActivations) window.clearTimeout(timer);
    this.#pendingActivations.clear();
    this.#collection?.removeEventListener(RADIOGROUP_CHANGE, this.#onCollectionChange);
    const previous = this.#registeredValue;
    this.#registeredValue = null;
    if (previous !== null) this.#collection?.unregister(previous);
    this.#collection = null;
  }

  readonly #onCollectionChange = () => this.#update();

  attributeChangedCallback(): void {
    // Cheap on purpose: every change re-writes every derived attribute. There is no
    // diffing here and none is wanted — the work is a handful of setAttribute calls.
    this.#update();
  }

  /** Set by the `disabled` prop or inherited from the group. Skipped by arrow-key movement. */
  get disabled(): boolean {
    return this.hasAttribute('disabled');
  }
  set disabled(value: boolean) {
    this.toggleAttribute('disabled', Boolean(value));
  }

  /** Distinguishes this RadioItem from its siblings. The ancestor RadioGroup compares against it to decide whether this one is in the selection. */
  get value(): string {
    return this.getAttribute('value') ?? '';
  }
  set value(value: string) {
    this.setAttribute('value', value);
  }

  get #isDisabled(): boolean {
    return (
      this.disabled ||
      Boolean(this.#collection?.hasAttribute('disabled') || this.#collection?.matches(':disabled'))
    );
  }

  get #selected(): boolean {
    return this.#collection?.value === this.value;
  }

  #queueActivation(event: MouseEvent): void {
    if (!this.isConnected || event.defaultPrevented) return;
    if (this.#isDisabled) return;
    const collection = this.#collection;
    const version = collection?.interactionVersion;
    const value = this.value;
    // A task, not a microtask: trusted events can checkpoint between listeners.
    const timer = window.setTimeout(() => {
      this.#pendingActivations.delete(timer);
      if (!this.isConnected) return;
      if (
        collection !== this.#collection ||
        value !== this.value ||
        version !== collection?.interactionVersion
      )
        return;
      this.#activate(event);
    }, 0);
    this.#pendingActivations.add(timer);
  }

  #activate(event: MouseEvent): void {
    // Recheck cancellation and availability after every host listener has run.
    if (event.defaultPrevented) return;
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
    // The semantic control is inside the shadow root; naming only the host misses it.
    const label = this.getAttribute('aria-label');
    if (label === null) root.removeAttribute('aria-label');
    else root.setAttribute('aria-label', label);
    if (this.#isDisabled) root.setAttribute('aria-disabled', 'true');
    else root.removeAttribute('aria-disabled');
    root.setAttribute('aria-checked', String(this.#selected));
    // The host carries it too, because CSS cannot select inside a shadow root from
    // outside and cannot append an attribute selector to ::part(). One fact, two
    // places — forced by the boundary, not chosen.
    this.toggleAttribute('checked', this.#selected);
    if (this.#collection) {
      const value = this.value;
      const previous = this.#registeredValue;
      // Record before notifying: collection announcements are synchronous.
      this.#registeredValue = value;
      if (previous !== null && previous !== value) this.#collection.unregister(previous);
      this.#collection.register(value, { element: this, disabled: this.#isDisabled });
    }
    root.setAttribute('tabindex', this.#collection?.isTabStop(this.value) ? '0' : '-1');
    this.#part('mark')?.toggleAttribute('hidden', !this.#selected);
  }

  #part(name: string): HTMLElement | null {
    return this.shadowRoot!.querySelector<HTMLElement>('[part="' + name + '"]');
  }
}

if (!customElements.get(RadioItem.tagName)) {
  customElements.define(RadioItem.tagName, RadioItem);
}

declare global {
  interface HTMLElementTagNameMap {
    'ds-radio-item': RadioItem;
  }
}
