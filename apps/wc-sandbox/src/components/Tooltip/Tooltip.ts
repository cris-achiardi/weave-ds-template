// GENERATED from Tooltip.contract.json + Tooltip.wc.json. Do not edit by hand.
// Regenerate: node packages/wc/src/emit/emit.mjs Tooltip --out <dir>
//
// Shows a short label for a control whose own presentation cannot carry it — an icon button, a truncated name — on hover and on focus, without taking focus itself.

import { useDismissal } from '@ds/wc/behavior';
import type { DismissalOptions } from '@ds/wc/behavior';

// THE ONE BUNDLER-SPECIFIC TOKEN IN THIS FILE. `?inline` asks Vite for the stylesheet as
// a string so it can be adopted into the shadow root rather than injected into the page —
// which is what a plain CSS import would do, and would put these rules where they can
// never match. The standard replacement is a CSS module script
// (`import sheet from './x.css' with { type: 'css' }`); it is not portable enough yet.
import structureCss from './Tooltip.structure.css?inline';
import themeCss from './Tooltip.theme.css?inline';

const SHEET = new CSSStyleSheet();
SHEET.replaceSync(structureCss + '\n' + themeCss);

// Built ONCE at module scope and cloned per instance. This is the whole render model:
// clone, then mutate attributes. It is enough because a contract's anatomy is STATIC —
// every part always exists, and `visibleWhen` hides rather than removes.
const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
    <div part="root">
      <div part="trigger">
        <slot name="trigger"></slot>
      </div>
      <div part="popup" role="tooltip">
        <slot name="content"></slot>
      </div>
      <slot></slot>
    </div>
`;

// A counter, because the platform has no useId. It matters less here than anywhere:
// every id below is scoped to this element's own shadow root.
let nextId = 0;

// Transcribed from Tooltip.contract.json > dismisses. Cases in
// @ds/contracts/conformance/dismissal.json.
const DISMISSAL: DismissalOptions = { on: ['escape'] };

export class DsTooltip extends HTMLElement {
  static readonly tagName = 'ds-tooltip';
  static readonly observedAttributes = ['disabled', 'placement', 'open'];

  readonly #root: HTMLElement;
  readonly #baseId = 'ds-tooltip-' + nextId++;
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
      () => {
        this.open = false;
        this.#emit('open-change', false);
      },
    );

    this.#watchSlots(shadow);

    // NO HANDLER COMPOSITION. `addEventListener` is additive by definition, so a
    // consumer's listener on this element and the ones below both run — the problem
    // React and Vue each solve with a hand-written chain does not exist here.
    this.#root.addEventListener('keydown', (event) =>
      this.#dismissal.onKeyDown(event as KeyboardEvent),
    );
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

  /** The tooltip never opens. The trigger still works. */
  get disabled(): boolean {
    return this.hasAttribute('disabled');
  }
  set disabled(value: boolean) {
    this.toggleAttribute('disabled', Boolean(value));
  }

  /** The PREFERRED side. A tooltip may be moved elsewhere when there is not room, so this is a request rather than a guarantee — a distinction the axis mechanism cannot express. */
  get placement():
    'top' | 'top-start' | 'top-end' | 'bottom' | 'bottom-start' | 'bottom-end' | 'left' | 'right' {
    return (this.getAttribute('placement') ?? 'top') as
      'top' | 'top-start' | 'top-end' | 'bottom' | 'bottom-start' | 'bottom-end' | 'left' | 'right';
  }
  set placement(
    value:
      'top' | 'top-start' | 'top-end' | 'bottom' | 'bottom-start' | 'bottom-end' | 'left' | 'right',
  ) {
    this.setAttribute('placement', value);
  }

  /** The tooltip is showing. A consumer may control it; hover and focus on the trigger also change it. */
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

  #update(): void {
    const root = this.#root;
    root.toggleAttribute('aria-disabled', Boolean(this.disabled));
    this.#part('trigger')?.setAttribute('id', this.#baseId + '-trigger');
    this.#part('popup')?.setAttribute('id', this.#baseId + '-popup');
    this.#part('trigger')?.setAttribute(
      'aria-describedby',
      [this.open ? this.#baseId + '-popup' : ''].filter(Boolean).join(' '),
    );
    this.#part('popup')?.toggleAttribute('hidden', !this.open);
  }

  #part(name: string): HTMLElement | null {
    return this.shadowRoot!.querySelector<HTMLElement>('[part="' + name + '"]');
  }
}

if (!customElements.get(DsTooltip.tagName)) {
  customElements.define(DsTooltip.tagName, DsTooltip);
}

declare global {
  interface HTMLElementTagNameMap {
    'ds-tooltip': DsTooltip;
  }
}
