// GENERATED from Dialog.contract.json + Dialog.wc.json. Do not edit by hand.
// Regenerate: node packages/wc/src/emit/emit.mjs Dialog --out <dir>
//
// Interrupts what a person was doing to ask for something that cannot wait, and refuses to let them continue until they answer or leave.

import { useDismissal } from '@ds/wc/behavior';
import type { DismissalOptions } from '@ds/wc/behavior';

// THE ONE BUNDLER-SPECIFIC TOKEN IN THIS FILE. `?inline` asks Vite for the stylesheet as
// a string so it can be adopted into the shadow root rather than injected into the page —
// which is what a plain CSS import would do, and would put these rules where they can
// never match. The standard replacement is a CSS module script
// (`import sheet from './x.css' with { type: 'css' }`); it is not portable enough yet.
import structureCss from './Dialog.structure.css?inline';
import themeCss from './Dialog.theme.css?inline';

const SHEET = new CSSStyleSheet();
SHEET.replaceSync(structureCss + '\n' + themeCss);

// Built ONCE at module scope and cloned per instance. This is the whole render model:
// clone, then mutate attributes. It is enough because a contract's anatomy is STATIC —
// every part always exists, and `visibleWhen` hides rather than removes.
const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
    <dialog part="root">
      <div part="title">
        <slot name="title"></slot>
      </div>
      <div part="body">
        <slot name="body"></slot>
      </div>
      <div part="actions">
        <slot name="actions"></slot>
      </div>
      <slot></slot>
    </dialog>
`;

// A counter, because the platform has no useId. It matters less here than anywhere:
// every id below is scoped to this element's own shadow root.
let nextId = 0;

// Transcribed from Dialog.contract.json > dismisses. Cases in
// @ds/contracts/conformance/dismissal.json.
// The contract also declares escape, supplied by the platform.
const DISMISSAL: DismissalOptions = { on: ['outside-press'] };

export class DsDialog extends HTMLElement {
  static readonly tagName = 'ds-dialog';
  static readonly observedAttributes = ['size', 'open'];

  readonly #root: HTMLElement;
  readonly #baseId = 'ds-dialog-' + nextId++;
  readonly #dismissal;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open', delegatesFocus: false });
    shadow.adoptedStyleSheets = [SHEET];
    shadow.append(TEMPLATE.content.cloneNode(true));
    this.#root = shadow.querySelector('[part="root"]')!;

    this.#dismissal = useDismissal(
      DISMISSAL,
      () => this.open,
      // A platform modal is closed BY THE ELEMENT, never by writing the state.
      () => (this.#root as HTMLDialogElement).close(),
    );

    this.#watchSlots(shadow);

    // NO HANDLER COMPOSITION. `addEventListener` is additive by definition, so a
    // consumer's listener on this element and the ones below both run — the problem
    // React and Vue each solve with a hand-written chain does not exist here.
    this.#root.addEventListener('pointerdown', (event) =>
      this.#dismissal.onPointerDown(event as PointerEvent),
    );
    this.#root.addEventListener('pointercancel', () => this.#dismissal.onPointerCancel());
    this.#root.addEventListener('click', (event) => this.#dismissal.onClick(event as MouseEvent));

    // The dialog closes ITSELF on Escape, so this element is no longer the only
    // writer of its own state. Synced from the element's own `open`
    // attribute rather than a `close` event, which is measured unreliable.
    new MutationObserver(() => {
      if (!(this.#root as HTMLDialogElement).open && this.open) {
        this.open = false;
        this.#emit('open-change', false);
      }
    }).observe(this.#root, { attributes: true, attributeFilter: ['open'] });
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

  /** How wide the panel is. A contiguous subset of the canon's ladder. */
  get size(): 's' | 'm' | 'l' {
    return (this.getAttribute('size') ?? 'm') as 's' | 'm' | 'l';
  }
  set size(value: 's' | 'm' | 'l') {
    this.setAttribute('size', value);
  }

  /** The dialog is showing and holding focus. */
  get open(): boolean {
    return this.hasAttribute('open');
  }
  set open(value: boolean) {
    this.toggleAttribute('open', Boolean(value));
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
    if (!this.hasAttribute('size')) this.setAttribute('size', 'm');

    root?.setAttribute('id', this.#baseId);
    this.#part('title')?.setAttribute('id', this.#baseId + '-title');
    root?.setAttribute('aria-labelledby', this.#baseId + '-title');
    // A <dialog> is opened by CALLING showModal(), never by rendering an attribute.
    const dlg = root as HTMLDialogElement;
    if (this.open && !dlg.open) dlg.showModal();
    else if (!this.open && dlg.open) dlg.close();
  }

  #part(name: string): HTMLElement | null {
    return this.shadowRoot!.querySelector<HTMLElement>('[part="' + name + '"]');
  }
}

if (!customElements.get(DsDialog.tagName)) {
  customElements.define(DsDialog.tagName, DsDialog);
}

declare global {
  interface HTMLElementTagNameMap {
    'ds-dialog': DsDialog;
  }
}
