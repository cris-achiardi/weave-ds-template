// GENERATED from TabPanel.contract.json + TabPanel.wc.json. Do not edit by hand.
// Regenerate: node packages/wc/src/emit/emit.mjs TabPanel --out <dir>
//
// The content one tab reveals. It exists so the strip has something real to control: a tab announcing that it opens a panel, with no panel wired to it, describes an interaction that does not happen.

import { supplyRelations } from '@ds/wc/behavior';
import type {} from '@ds/wc/behavior';
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
    <div part="root">
      <slot></slot>
    </div>
`;

// A counter, because the platform has no useId. It matters less here than anywhere:
// every id below is scoped to this element's own shadow root.
let nextId = 0;

export class TabPanel extends HTMLElement {
  static readonly tagName = 'ds-tab-panel';
  static readonly observedAttributes = ['value', 'id'];

  readonly #host = supplyRelations('TabPanel');
  readonly #baseId = 'ds-tab-panel-' + nextId++;
  #collection: Tabs | null = null;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open', delegatesFocus: false });
    shadow.adoptedStyleSheets = [SHEET];
    shadow.append(TEMPLATE.content.cloneNode(true));

    // Listeners are additive, but internal listeners run before host bubbling listeners.
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
    // Joining changes who this member's siblings pair with (ADR 0008).
    this.#collection.relink();
  }

  disconnectedCallback(): void {
    const collection = this.#collection;
    this.#collection = null;
    collection?.removeEventListener(TABS_CHANGE, this.#onCollectionChange);
    // Leaving: give the consumer's host back exactly what it had before this component
    // wrote to it, and let the siblings re-pair without this member.
    this.#host.release();
    collection?.relink();
  }

  readonly #onCollectionChange = () => this.#update();

  attributeChangedCallback(): void {
    // Cheap on purpose: every change re-writes every derived attribute. There is no
    // diffing here and none is wanted — the work is a handful of setAttribute calls.
    this.#update();
    // An identity change re-pairs this member and its siblings (ADR 0008).
    this.#collection?.relink();
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
    // The host IS this component's root: its role and states are attributes ON THE HOST,
    // collected here and written at the end under the supplied-relations ownership policy.
    const owned: Record<string, string | null> = { role: 'tabpanel' };
    // The host carries it too, because CSS cannot select inside a shadow root from
    // outside and cannot append an attribute selector to ::part(). One fact, two
    // places — forced by the boundary, not chosen.
    owned['selected'] = this.#selected ? '' : null;
    // Cross-member relations, as IDREFs between HOSTS in one tree. The collection pairs
    // this member with the sibling of the same identity; a missing sibling, or a duplicate
    // identity after the first, links nothing rather than something wrong. The sibling's
    // id is whatever it carries — the consumer's own, or the fallback it assigned itself.
    const labelledByPair = this.#collection?.pairOf(this, 'ds-tab-item') ?? null;
    // Focusable by contract, and the host is the element that takes focus.
    owned['tabindex'] = '0';
    owned['hidden'] = !this.#selected ? '' : null;
    // Nothing is written onto the consumer's host while it is detached: wiring happens on
    // connect, and disconnectedCallback takes back exactly what was written.
    if (this.isConnected)
      this.#host.write([
        [
          this,
          {
            id: this.#baseId,
            labelledBy: [labelledByPair?.getAttribute('id')],
            attributes: owned,
          },
        ],
      ]);
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
