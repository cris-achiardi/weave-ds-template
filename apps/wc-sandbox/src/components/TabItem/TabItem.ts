// GENERATED from TabItem.contract.json + TabItem.wc.json. Do not edit by hand.
// Regenerate: node packages/wc/src/emit/emit.mjs TabItem --out <dir>
//
// One tab: a label that reveals its panel when chosen. It carries its own identity and its own disabled state, and nothing else.

import { supplyRelations } from '@ds/wc/behavior';
import type {} from '@ds/wc/behavior';
import { TABS_CHANGE, type Tabs } from '../Tabs/Tabs';

// THE ONE BUNDLER-SPECIFIC TOKEN IN THIS FILE. `?inline` asks Vite for the stylesheet as
// a string so it can be adopted into the shadow root rather than injected into the page —
// which is what a plain CSS import would do, and would put these rules where they can
// never match. The standard replacement is a CSS module script
// (`import sheet from './x.css' with { type: 'css' }`); it is not portable enough yet.
import structureCss from './TabItem.structure.css?inline';
import themeCss from './TabItem.theme.css?inline';

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
      <div part="indicator"></div>
      <slot></slot>
    </div>
`;

// A counter, because the platform has no useId. It matters less here than anywhere:
// every id below is scoped to this element's own shadow root.
let nextId = 0;

export class TabItem extends HTMLElement {
  static readonly tagName = 'ds-tab-item';
  static readonly observedAttributes = ['disabled', 'value', 'id'];

  readonly #host = supplyRelations('TabItem');
  readonly #baseId = 'ds-tab-item-' + nextId++;
  #collection: Tabs | null = null;
  #registeredValue: string | null = null;
  readonly #pendingActivations = new Set<number>();

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open', delegatesFocus: false });
    shadow.adoptedStyleSheets = [SHEET];
    shadow.append(TEMPLATE.content.cloneNode(true));

    this.#watchSlots(shadow);

    // Listeners are additive, but internal listeners run before host bubbling listeners.
    // Queue click activation so the consumer can cancel it before state changes.
    this.addEventListener('click', (event) => this.#queueActivation(event as MouseEvent));
    this.addEventListener('keydown', (event) => this.#keyActivation(event as KeyboardEvent));
    this.addEventListener('keyup', (event) => this.#keyActivation(event as KeyboardEvent));
    this.addEventListener('blur', () => (this.#space = 'idle'));
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
    this.#collection = this.closest<Tabs>('ds-tabs');
    if (!this.#collection) {
      throw new Error(
        '<ds-tab-item> must be inside a <ds-tabs>. There is no selection to compare against, and looking unselected would hide the mistake.',
      );
    }
    this.#collection.addEventListener(TABS_CHANGE, this.#onCollectionChange);
    window.addEventListener('keydown', this.#settleSpace);
    this.#update();
    // Joining changes who this member's siblings pair with (ADR 0008).
    this.#collection.relink();
  }

  disconnectedCallback(): void {
    for (const timer of this.#pendingActivations) window.clearTimeout(timer);
    this.#pendingActivations.clear();
    window.removeEventListener('keydown', this.#settleSpace);
    this.#space = 'idle';
    const collection = this.#collection;
    this.#collection = null;
    collection?.removeEventListener(TABS_CHANGE, this.#onCollectionChange);
    const previous = this.#registeredValue;
    this.#registeredValue = null;
    if (previous !== null) collection?.unregister(previous);
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

  /** Set by the prop or inherited from the strip. Skipped by arrow-key movement. */
  get disabled(): boolean {
    return this.hasAttribute('disabled');
  }
  set disabled(value: boolean) {
    this.toggleAttribute('disabled', Boolean(value));
  }

  /** Distinguishes this TabItem from its siblings. The ancestor Tabs compares against it to decide whether this one is in the selection. */
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

  /**
   * What a native button did for free, now that the host is the control (ADR 0008):
   * Enter clicks on keydown, Space on keyup, and Space does not scroll the page.
   * The click is DISPATCHED, so it reaches #queueActivation and every consumer click
   * listener exactly like a pointer click — and it waits a task, so a consumer
   * keydown/keyup listener that calls preventDefault() still cancels it. A Space
   * press whose KEYDOWN was cancelled does not activate, as on a native button.
   */
  #keyActivation(event: KeyboardEvent): void {
    if (event.target !== this || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === ' ') {
      if (event.type === 'keydown') {
        // Settled by #settleSpace once every consumer listener has seen the keydown.
        this.#space = event.defaultPrevented ? 'canceled' : 'pending';
        return;
      }
      const armed = this.#space === 'armed' || this.#space === 'pending';
      this.#space = 'idle';
      if (!armed) return;
    } else if (!(event.type === 'keydown' && event.key === 'Enter')) return;
    const timer = window.setTimeout(() => {
      this.#pendingActivations.delete(timer);
      if (this.isConnected && !event.defaultPrevented) this.click();
    }, 0);
    this.#pendingActivations.add(timer);
  }

  /**
   * The current Space press. ARMED by an uncancelled keydown (settled in #settleSpace);
   * disarmed by a cancelled keydown or by focus leaving the host. Keyup clicks only
   * while armed — or still 'pending', when the keydown's propagation was stopped
   * before #settleSpace could see it, which does not cancel a native button either.
   */
  #space: 'idle' | 'pending' | 'armed' | 'canceled' = 'idle';

  /**
   * The LAST listener a Space keydown on this host meets — a bubbling one on window,
   * added while connected — so every consumer listener has already run and
   * `defaultPrevented` says whether one cancelled. Only then does it prevent the page
   * scroll, which this component must do itself and which would otherwise hide a
   * consumer's cancellation. A consumer that stops propagation instead never reaches
   * here: the press still activates (that does not cancel a native button either),
   * but the page may scroll.
   */
  readonly #settleSpace = (event: KeyboardEvent): void => {
    if (event.key !== ' ' || this.#space !== 'pending' || event.composedPath()[0] !== this) return;
    if (event.defaultPrevented) {
      this.#space = 'canceled';
      return;
    }
    this.#space = 'armed';
    event.preventDefault();
  };

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
    const owned: Record<string, string | null> = { role: 'tab' };
    owned['aria-disabled'] = this.#isDisabled ? 'true' : null;
    owned['aria-selected'] = String(this.#selected);
    // The host carries it too, because CSS cannot select inside a shadow root from
    // outside and cannot append an attribute selector to ::part(). One fact, two
    // places — forced by the boundary, not chosen.
    owned['selected'] = this.#selected ? '' : null;
    if (this.#collection) {
      const value = this.value;
      const previous = this.#registeredValue;
      // Record before notifying: collection announcements are synchronous.
      this.#registeredValue = value;
      if (previous !== null && previous !== value) this.#collection.unregister(previous);
      this.#collection.register(value, { element: this, disabled: this.#isDisabled });
    }
    owned['tabindex'] = this.#collection?.isTabStop(this.value) ? '0' : '-1';
    // Cross-member relations, as IDREFs between HOSTS in one tree. The collection pairs
    // this member with the sibling of the same identity; a missing sibling, or a duplicate
    // identity after the first, links nothing rather than something wrong. The sibling's
    // id is whatever it carries — the consumer's own, or the fallback it assigned itself.
    const controlsPair = this.#collection?.pairOf(this, 'ds-tab-panel') ?? null;
    this.#part('indicator')?.toggleAttribute('hidden', !this.#selected);
    // Nothing is written onto the consumer's host while it is detached: wiring happens on
    // connect, and disconnectedCallback takes back exactly what was written.
    if (this.isConnected)
      this.#host.write([
        [
          this,
          {
            id: this.#baseId,
            controls: [controlsPair?.getAttribute('id')],
            attributes: owned,
          },
        ],
      ]);
  }

  #part(name: string): HTMLElement | null {
    return this.shadowRoot!.querySelector<HTMLElement>('[part="' + name + '"]');
  }
}

if (!customElements.get(TabItem.tagName)) {
  customElements.define(TabItem.tagName, TabItem);
}

declare global {
  interface HTMLElementTagNameMap {
    'ds-tab-item': TabItem;
  }
}
