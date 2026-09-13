// GENERATED from Tabs.contract.json + Tabs.wc.json. Do not edit by hand.
// Regenerate: node packages/wc/src/emit/emit.mjs Tabs --out <dir>
//
// Holds which one of several sections is showing, in a fixed area, so a person can move between them without losing their place on the page.

import { useLinearNavigation } from '@ds/wc/behavior';
import type { NavigationOptions } from '@ds/wc/behavior';

// THE ONE BUNDLER-SPECIFIC TOKEN IN THIS FILE. `?inline` asks Vite for the stylesheet as
// a string so it can be adopted into the shadow root rather than injected into the page —
// which is what a plain CSS import would do, and would put these rules where they can
// never match. The standard replacement is a CSS module script
// (`import sheet from './x.css' with { type: 'css' }`); it is not portable enough yet.
import structureCss from './Tabs.structure.css?inline';
import themeCss from './Tabs.theme.css?inline';

const SHEET = new CSSStyleSheet();
SHEET.replaceSync(structureCss + '\n' + themeCss);

// Built ONCE at module scope and cloned per instance. This is the whole render model:
// clone, then mutate attributes. It is enough because a contract's anatomy is STATIC —
// every part always exists, and `visibleWhen` hides rather than removes.
const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
    <div part="root">
      <div part="list" role="tablist"></div>
      <slot></slot>
    </div>
`;

// A counter, because the platform has no useId. It matters less here than anywhere:
// every id below is scoped to this element's own shadow root.
let nextId = 0;

// Transcribed field for field from Tabs.contract.json > collection.navigation.
const NAVIGATION: NavigationOptions = {
  orientation: 'horizontal',
  wrap: true,
  followsFocus: true,
  disabledItems: 'focusable',
  homeEnd: true,
};

/** Fired on the collection whenever the selection or the roster changes. */
export const TABS_CHANGE = 'ds-tabs-internal-change';

export class DsTabs extends HTMLElement {
  static readonly tagName = 'ds-tabs';
  static readonly observedAttributes = ['disabled', 'value'];

  readonly #root: HTMLElement;
  readonly #baseId = 'ds-tabs-' + nextId++;
  readonly #nav;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open', delegatesFocus: false });
    shadow.adoptedStyleSheets = [SHEET];
    shadow.append(TEMPLATE.content.cloneNode(true));
    this.#root = shadow.querySelector('[part="root"]')!;

    this.#nav = useLinearNavigation(
      NAVIGATION,
      () => this.value,
      (v: string) => this.toggle(v),
    );

    // NO HANDLER COMPOSITION. `addEventListener` is additive by definition, so a
    // consumer's listener on this element and the ones below both run — the problem
    // React and Vue each solve with a hand-written chain does not exist here.
    this.#root.addEventListener('keydown', (event) => this.#nav.onKeyDown(event as KeyboardEvent));
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

  /** The whole strip ignores interaction. Cascades to every tab. */
  get disabled(): boolean {
    return this.hasAttribute('disabled');
  }
  set disabled(value: boolean) {
    this.toggleAttribute('disabled', Boolean(value));
  }

  /** The current selection, by member identity. */
  get value(): string {
    return this.getAttribute('value') ?? '';
  }
  set value(value: string) {
    this.setAttribute('value', value);
  }

  /** Called by a member when it is activated. */
  toggle(memberValue: string): void {
    if (this.value === memberValue) return;
    this.value = memberValue;
    this.#emit('value-change', this.value);
    this.#announce();
  }

  /** The id root every member's parts hang off. */
  get baseId(): string {
    return this.#baseId;
  }

  register(value: string, entry: { element: HTMLElement | null; disabled: boolean }) {
    // ANNOUNCES ONLY WHEN SOMETHING MOVED. A member re-registers from its own
    // update, and an announcement is what makes every member update — so
    // announcing unconditionally is an infinite loop. It froze the tab.
    if (this.#nav.register(value, entry)) this.#announce();
  }

  unregister(value: string): void {
    if (this.#nav.unregister(value)) this.#announce();
  }

  isTabStop(value: string): boolean {
    return this.#nav.isTabStop(value);
  }

  /** Tell every member to re-read us. The DOM's answer to a re-render. */
  #announce(): void {
    this.dispatchEvent(new Event(TABS_CHANGE));
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
    root.toggleAttribute('aria-disabled', Boolean(this.disabled));
    this.#part('list')?.setAttribute('id', this.#baseId + '-list');
  }

  #part(name: string): HTMLElement | null {
    return this.shadowRoot!.querySelector<HTMLElement>('[part="' + name + '"]');
  }
}

if (!customElements.get(DsTabs.tagName)) {
  customElements.define(DsTabs.tagName, DsTabs);
}

declare global {
  interface HTMLElementTagNameMap {
    'ds-tabs': DsTabs;
  }
}
