// GENERATED from Slider.contract.json + Slider.wc.json. Do not edit by hand.
// Regenerate: node packages/wc/src/emit/emit.mjs Slider --out <dir>
//
// Chooses a number from a continuous range where the approximate value matters more than the exact one — a volume, a zoom level, a price ceiling.

import { snap, useRangeControl } from '@ds/wc/behavior';
import type { RangeOptions } from '@ds/wc/behavior';

// THE ONE BUNDLER-SPECIFIC TOKEN IN THIS FILE. `?inline` asks Vite for the stylesheet as
// a string so it can be adopted into the shadow root rather than injected into the page —
// which is what a plain CSS import would do, and would put these rules where they can
// never match. The standard replacement is a CSS module script
// (`import sheet from './x.css' with { type: 'css' }`); it is not portable enough yet.
import structureCss from './Slider.structure.css?inline';
import themeCss from './Slider.theme.css?inline';

const SHEET = new CSSStyleSheet();
SHEET.replaceSync(structureCss + '\n' + themeCss);

// Built ONCE at module scope and cloned per instance. This is the whole render model:
// clone, then mutate attributes. It is enough because a contract's anatomy is STATIC —
// every part always exists, and `visibleWhen` hides rather than removes.
const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
    <div part="root" role="slider">
      <div part="track"></div>
      <div part="fill"></div>
      <div part="thumb"></div>
    </div>
`;

// Transcribed from Slider.contract.json: the `range` block plus min/max/step.
const RANGE: RangeOptions = {
  min: 0,
  max: 100,
  step: 1,
  orientation: 'horizontal',
  pageStep: 10,
};

export class Slider extends HTMLElement {
  static readonly tagName = 'ds-slider';
  static readonly formAssociated = true;
  static readonly observedAttributes = ['disabled', 'name', 'required', 'value', 'aria-label'];

  readonly #internals = this.attachInternals();
  #formDisabled = false;
  #customValidity = '';
  #initialFormValue: number | undefined;
  readonly #root: HTMLElement;
  readonly #track: HTMLElement;
  readonly #range;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open', delegatesFocus: true });
    shadow.adoptedStyleSheets = [SHEET];
    shadow.append(TEMPLATE.content.cloneNode(true));
    this.#root = shadow.querySelector('[part="root"]')!;
    this.#track = shadow.querySelector('[part="track"]')!;

    this.#range = useRangeControl(
      RANGE,
      () => this.value,
      (next: number) => {
        this.value = next;
        this.#emit('value-change', next);
      },
      () => this.disabled || this.#formDisabled,
      () => this.#track,
      () => this.#update(),
    );

    // Listeners are additive, but internal listeners run before host bubbling listeners.
    this.#root.addEventListener('keydown', (event) =>
      this.#range.onKeyDown(event as KeyboardEvent),
    );
    this.#root.addEventListener('pointerdown', (event) =>
      this.#range.onPointerDown(event as PointerEvent),
    );
    this.#root.addEventListener('pointermove', (event) =>
      this.#range.onPointerMove(event as PointerEvent),
    );
    this.#root.addEventListener('pointerup', (event) =>
      this.#range.onPointerUp(event as PointerEvent),
    );
    this.#root.addEventListener('pointercancel', (event) =>
      this.#range.onPointerUp(event as PointerEvent),
    );
  }

  connectedCallback(): void {
    this.#initialFormValue ??= this.value;
    this.#update();
  }

  attributeChangedCallback(): void {
    // Cheap on purpose: every change re-writes every derived attribute. There is no
    // diffing here and none is wanted — the work is a handful of setAttribute calls.
    this.#update();
  }

  /** The platform's own disabled state. Removed from the focus order and cannot be moved. */
  get disabled(): boolean {
    return this.hasAttribute('disabled');
  }
  set disabled(value: boolean) {
    this.toggleAttribute('disabled', Boolean(value));
  }

  /** Name of the submitted answer. An empty name contributes nothing. */
  get name(): string {
    return this.getAttribute('name') ?? '';
  }
  set name(value: string) {
    this.setAttribute('name', value);
  }

  /** Whether an answer is required for form validation. */
  get required(): boolean {
    return this.hasAttribute('required');
  }
  set required(value: boolean) {
    this.toggleAttribute('required', Boolean(value));
  }

  /** The chosen number. Bounded and stepped — facts that live nowhere else, and that no boolean or enumeration can carry. */
  get value(): number {
    const raw = this.getAttribute('value');
    return raw === null ? 0 : Number(raw);
  }
  set value(value: number) {
    this.setAttribute('value', String(value));
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
    // The semantic control is inside the shadow root; naming only the host misses it.
    const label = this.getAttribute('aria-label');
    if (label === null) root.removeAttribute('aria-label');
    else root.setAttribute('aria-label', label);
    if (this.disabled || this.#formDisabled) root.setAttribute('aria-disabled', 'true');
    else root.removeAttribute('aria-disabled');
    root.setAttribute('aria-valuemin', '0');
    root.setAttribute('aria-valuemax', '100');
    root.setAttribute('aria-valuenow', String(snap(this.value, RANGE)));
    root.style.setProperty('--ds-fraction', String(this.#range.fraction));
    this.toggleAttribute('dragging', this.#range.dragging);
    root.setAttribute('tabindex', this.disabled || this.#formDisabled ? '-1' : '0');
    this.#syncForm();
  }

  get form(): HTMLFormElement | null {
    return this.#internals.form;
  }
  get validity(): ValidityState {
    return this.#internals.validity;
  }
  get validationMessage(): string {
    return this.#internals.validationMessage;
  }
  get willValidate(): boolean {
    return this.#internals.willValidate;
  }
  checkValidity(): boolean {
    return this.#internals.checkValidity();
  }
  reportValidity(): boolean {
    return this.#internals.reportValidity();
  }
  setCustomValidity(message: string): void {
    this.#customValidity = String(message);
    this.#update();
  }
  formDisabledCallback(disabled: boolean): void {
    this.#formDisabled = disabled;
    this.#update();
  }
  formResetCallback(): void {
    if (this.#initialFormValue !== undefined) this.value = this.#initialFormValue;

    this.#update();
  }
  formStateRestoreCallback(state: string | File | FormData | null): void {
    if (typeof state !== 'string') return;
    if (!Number.isFinite(Number(state))) return;

    this.value = Number(state);

    this.#update();
  }
  #syncForm(): void {
    const answer = snap(Number.isFinite(this.value) ? this.value : 0, RANGE);
    const disabled = this.disabled || this.#formDisabled;
    this.#internals.setFormValue(disabled ? null : String(answer), String(answer));

    const valueMissing = this.required && false;
    const customError = Boolean(this.#customValidity);
    const flags = { valueMissing, customError };
    const message =
      this.#customValidity ||
      (customError ? 'Invalid value.' : valueMissing ? 'Please provide an answer.' : '');
    this.#internals.setValidity(flags, message, this.#root);
    this.#root.setAttribute('aria-invalid', String(valueMissing || customError));
    this.#root.setAttribute('aria-required', String(this.required));
  }
}

if (!customElements.get(Slider.tagName)) {
  customElements.define(Slider.tagName, Slider);
}

declare global {
  interface HTMLElementTagNameMap {
    'ds-slider': Slider;
  }
}
