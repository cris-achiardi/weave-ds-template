// GENERATED from RadioGroup.contract.json + RadioGroup.wc.json. Do not edit by hand.
// Regenerate: node packages/wc/src/emit/emit.mjs RadioGroup --out <dir>
//
// Holds one choice from a small set of mutually exclusive options, all visible at once. It exists so the chosen option has exactly one home: the items compare against it rather than each holding a copy.

import { useLinearNavigation } from '@ds/wc/behavior';
import type { NavigationOptions } from '@ds/wc/behavior';

// THE ONE BUNDLER-SPECIFIC TOKEN IN THIS FILE. `?inline` asks Vite for the stylesheet as
// a string so it can be adopted into the shadow root rather than injected into the page —
// which is what a plain CSS import would do, and would put these rules where they can
// never match. The standard replacement is a CSS module script
// (`import sheet from './x.css' with { type: 'css' }`); it is not portable enough yet.
import structureCss from './RadioGroup.structure.css?inline';
import themeCss from './RadioGroup.theme.css?inline';

const SHEET = new CSSStyleSheet();
SHEET.replaceSync(structureCss + '\n' + themeCss);

// Built ONCE at module scope and cloned per instance. This is the whole render model:
// clone, then mutate attributes. It is enough because a contract's anatomy is STATIC —
// every part always exists, and `visibleWhen` hides rather than removes.
const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
    <div part="root" role="radiogroup">
      <slot></slot>
    </div>
`;

// A counter, because the platform has no useId. It matters less here than anywhere:
// every id below is scoped to this element's own shadow root.
let nextId = 0;

// Transcribed field for field from RadioGroup.contract.json > collection.navigation.
const NAVIGATION: NavigationOptions = {
  orientation: 'both',
  wrap: true,
  followsFocus: true,
  disabledItems: 'skip',
};

/** Fired on the collection whenever the selection or the roster changes. */
export const RADIOGROUP_CHANGE = 'ds-radio-group-internal-change';

export class RadioGroup extends HTMLElement {
  static readonly tagName = 'ds-radio-group';
  static readonly observedAttributes = ['disabled', 'read-only', 'value'];

  readonly #root: HTMLElement;
  readonly #baseId = 'ds-radio-group-' + nextId++;
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

  /** The whole group ignores interaction. Cascades to every item. */
  get disabled(): boolean {
    return this.hasAttribute('disabled');
  }
  set disabled(value: boolean) {
    this.toggleAttribute('disabled', Boolean(value));
  }

  /** The selection cannot be changed, but the group stays readable and focusable. Distinct from disabled, which removes it from the focus order. */
  get readOnly(): boolean {
    return this.hasAttribute('read-only');
  }
  set readOnly(value: boolean) {
    this.toggleAttribute('read-only', Boolean(value));
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
    this.dispatchEvent(new Event(RADIOGROUP_CHANGE));
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
    root.toggleAttribute('aria-readonly', Boolean(this.readOnly));
  }
}

if (!customElements.get(RadioGroup.tagName)) {
  customElements.define(RadioGroup.tagName, RadioGroup);
}

declare global {
  interface HTMLElementTagNameMap {
    'ds-radio-group': RadioGroup;
  }
}
