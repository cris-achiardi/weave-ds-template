// GENERATED from TabPanel.contract.json + TabPanel.wc.json. Do not edit by hand.
// Regenerate: node packages/wc/src/emit/emit.mjs TabPanel --out <dir>
//
// The content one tab reveals. It exists so the strip has something real to control: a tab announcing that it opens a panel, with no panel wired to it, describes an interaction that does not happen.

import { TABS_CHANGE, type Tabs } from '../Tabs/Tabs';

// THE ONE BUNDLER-SPECIFIC TOKEN IN THIS FILE. `?inline` asks Vite for the stylesheet as
// a string so it can be adopted into the shadow root rather than injected into the page —
// which is what a plain CSS import would do, and would put these rules where they can
// never match. The standard replacement is a CSS module script
// (`import sheet from './x.css' with { type: 'css' }`); it is not portable enough yet.
import structureCss from './TabPanel.structure.css?inline';
import themeCss from './TabPanel.theme.css?inline';

const SHEET = new CSSStyleSheet();
SHEET.replaceSync(structureCss + '\n' + themeCss);

// Built ONCE at module scope and cloned per instance. This is the whole render model:
// clone, then mutate attributes. It is enough because a contract's anatomy is STATIC —
// every part always exists, and `visibleWhen` hides rather than removes.
const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
    <div part="root" role="tabpanel">
    </div>
`;

// A counter, because the platform has no useId. It matters less here than anywhere:
// every id below is scoped to this element's own shadow root.
let nextId = 0;

export class TabPanel extends HTMLElement {
  static readonly tagName = 'ds-tab-panel';
  static readonly observedAttributes = ['value'];

  readonly #root: HTMLElement;
  readonly #baseId = 'ds-tab-panel-' + nextId++;
  #collection: Tabs | null = null;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open', delegatesFocus: true });
    shadow.adoptedStyleSheets = [SHEET];
    shadow.append(TEMPLATE.content.cloneNode(true));
    this.#root = shadow.querySelector('[part="root"]')!;

    // NO HANDLER COMPOSITION. `addEventListener` is additive by definition, so a
    // consumer's listener on this element and the ones below both run — the problem
    // React and Vue each solve with a hand-written chain does not exist here.
  }

  connectedCallback(): void {
    this.#collection = this.closest<Tabs>('ds-tabs');
    if (!this.#collection) {
      throw new Error(
        '<ds-tab-panel> must be inside a <ds-tabs>. There is no selection to compare against, and looking unselected would hide the mistake.',
      );
    }
    this.#collection.addEventListener(TABS_CHANGE, this.#onCollectionChange);
    this.#update();
  }

  disconnectedCallback(): void {
    this.#collection?.removeEventListener(TABS_CHANGE, this.#onCollectionChange);
    this.#collection = null;
  }

  readonly #onCollectionChange = () => this.#update();

  attributeChangedCallback(): void {
    // Cheap on purpose: every change re-writes every derived attribute. There is no
    // diffing here and none is wanted — the work is a handful of setAttribute calls.
    this.#update();
  }

  /** Distinguishes this TabPanel from its siblings. The ancestor Tabs compares against it to decide whether this one is in the selection. */
  get value(): string {
    return this.getAttribute('value') ?? '';
  }
  set value(value: string) {
    this.setAttribute('value', value);
  }

  get #selected(): boolean {
    return this.#collection?.value === this.value;
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
    // The host carries it too, because CSS cannot select inside a shadow root from
    // outside and cannot append an attribute selector to ::part(). One fact, two
    // places — forced by the boundary, not chosen.
    this.toggleAttribute('selected', this.#selected);
    root?.setAttribute('id', this.#baseId);
    this.toggleAttribute('hidden', !this.#selected);
  }
}

if (!customElements.get(TabPanel.tagName)) {
  customElements.define(TabPanel.tagName, TabPanel);
}

declare global {
  interface HTMLElementTagNameMap {
    'ds-tab-panel': TabPanel;
  }
}
