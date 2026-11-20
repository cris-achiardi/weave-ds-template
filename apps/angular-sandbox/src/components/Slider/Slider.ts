// GENERATED from Slider.contract.json + Slider.angular.json. Do not edit by hand.
// Regenerate: node packages/angular/src/emit/emit.mjs Slider --out <dir>
//
// Chooses a number from a continuous range where the approximate value matters more than the exact one — a volume, a zoom level, a price ceiling.

import {
  Component,
  DestroyRef,
  ElementRef,
  ViewEncapsulation,
  afterNextRender,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  model,
  signal,
  viewChild,
} from '@angular/core';
import { snap, useRangeControl } from '@ds/angular/behavior';
import type { RangeOptions } from '@ds/angular/behavior';

// Transcribed from Slider.contract.json: the `range` block, plus min/max/step from
// the `value` state. The cases this commits us to are in
// @ds/contracts/conformance/range-stepping.json.
const RANGE: RangeOptions = {
  min: 0,
  max: 100,
  step: 1,
  orientation: 'horizontal',
  pageStep: 10,
};

@Component({
  // The binding's `element` becomes a SELECTOR, because an Angular component attaches
  // to an element rather than rendering one. A consumer writes <div dsSlider>.
  selector: 'div[dsSlider]',
  exportAs: 'dsSlider',
  // ViewEncapsulation.None IS LOAD-BEARING. Angular's default rewrites every selector in
  // these stylesheets to include a generated _ngcontent attribute, which would scope them
  // to this component and break the one property the whole system rests on: that a theme
  // file selecting on [data-ds-component] dresses the React, Vue and Angular builds
  // alike. It fails silently — the CSS loads, matches nothing, and the component renders
  // unstyled.
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['./Slider.structure.css', './Slider.theme.css'],
  host: {
    '[attr.role]': "'slider'",
    '[attr.aria-disabled]': 'effectiveDisabled() || null',
    '[attr.data-ds-state-dragging]': 'range.dragging() || null',
    '[attr.tabindex]': 'effectiveDisabled() ? -1 : 0',
    '[attr.name]': 'null',
    '[attr.form]': 'null',
    '[attr.required]': 'null',
    '[attr.aria-valuemin]': '0',
    '[attr.aria-valuemax]': '100',
    '[attr.aria-valuenow]': 'announcedValue()',
    '[style.--ds-fraction]': 'range.fraction()',
    'data-ds-component': 'Slider',
    'data-ds-part': 'root',
    '(keydown)': 'range.onKeyDown($event)',
    '(pointerdown)': 'range.onPointerDown($event)',
    '(pointermove)': 'range.onPointerMove($event)',
    '(pointerup)': 'range.onPointerUp($event)',
    '(pointercancel)': 'range.onPointerUp($event)',
  },
  template: `
    <div #track data-ds-part="track"></div>
    <div data-ds-part="fill"></div>
    <div data-ds-part="thumb"></div>
    <input
      #formProxy
      type="range"
      [attr.name]="name() || null"
      [attr.form]="form() || null"
      [required]="required()"
      [disabled]="disabled()"
      min="0"
      max="100"
      step="1"
      aria-hidden="true"
      tabindex="-1"
      autocomplete="off"
      [style]="formProxyStyle"
      (focus)="onFormProxyFocus($event)"
    />
  `,
})
export class Slider {
  /** The platform's own disabled state. Removed from the focus order and cannot be moved. */
  readonly disabled = input<boolean>(false);
  /** Name of the submitted answer. An empty name contributes nothing. */
  readonly name = input<string>('');
  /** Whether an answer is required for form validation. */
  readonly required = input<boolean, unknown>(false, { transform: booleanAttribute });
  /** The id of the form that owns this answer, when it is not an ancestor form. */
  readonly form = input<string>('');
  /** The chosen number. Bounded and stepped — facts that live nowhere else, and that no boolean or enumeration can carry. Two-way: `[(value)]`. */
  readonly value = model<number>(0);

  // Effective disabled: the consumer's input, or a disabled <fieldset> around the control.
  // Everything reads this one; the input itself is never written.
  private readonly formDisabled = signal(false);
  protected readonly effectiveDisabled = computed(() => this.disabled() || this.formDisabled());
  private readonly formProxy = viewChild<ElementRef<HTMLInputElement>>('formProxy');
  // The form proxy: in the form, out of sight, out of the pointer's and the tab order's reach.
  protected readonly formProxyStyle = {
    position: 'absolute',
    width: '1px',
    height: '1px',
    margin: '0',
    padding: '0',
    border: '0',
    opacity: '0',
    overflow: 'hidden',
    'clip-path': 'inset(50%)',
    'pointer-events': 'none',
  };
  protected onFormProxyFocus(event: FocusEvent): void {
    const root = (event.currentTarget as HTMLElement).parentElement;
    (root?.querySelector<HTMLElement>('[tabindex="0"]') ?? root)?.focus();
  }

  private readonly track = viewChild<ElementRef<HTMLElement>>('track');

  /** Announce the value the contract says this holds, not the one it was handed: a
   *  controlled value may arrive off-step, and the thumb would be drawn at one
   *  number and announced as another. */
  protected readonly announcedValue = computed(() => snap(this.value(), RANGE));

  protected readonly range = useRangeControl(
    RANGE,
    () => this.value(),
    (next: number) => this.value.set(next),
    () => Boolean(this.effectiveDisabled()),
    () => this.track()?.nativeElement ?? null,
  );

  constructor() {
    // ---- form contribution (contract.form). See packages/wc/forms.md.
    // Driven imperatively: a native reset rewrites the proxy behind the binding's back.
    const formWrite = () => {
      const proxy = this.formProxy()?.nativeElement;
      if (!proxy) return;
      proxy.value = String(snap(this.value(), RANGE));
    };
    effect(formWrite);
    // The answer a reset restores: captured once, at first render — after the consumer's
    // bindings have arrived — and never re-captured.
    let formAnswer: number | undefined;
    let formAnswered = false;
    let formTimer: ReturnType<typeof setTimeout> | undefined;
    let formObserver: MutationObserver | undefined;
    let formDocument: Document | undefined;
    // Matched against the CURRENT owner when it fires, so a `form` input, an owner change
    // or a move needs no re-subscription.
    const onFormReset = (event: Event) => {
      const proxy = this.formProxy()?.nativeElement;
      if (!proxy || !formAnswered || event.target !== proxy.form) return;
      const answer = formAnswer as number;
      // A TASK, not a microtask: a reset button dispatches from native code, so a
      // microtask would run before later listeners could cancel and before the reset.
      clearTimeout(formTimer);
      formTimer = setTimeout(() => {
        if (event.defaultPrevented) return;
        // The model hears only a real difference, and no DOM event is dispatched: this
        // is lifecycle synchronisation, not a user edit.
        if (this.value() !== answer) this.value.set(answer);
        // The platform has rewritten the proxy; put back what the model holds now.
        formWrite();
      });
    };
    afterNextRender(() => {
      const proxy = this.formProxy()?.nativeElement;
      if (!proxy) return;
      formAnswer = this.value();
      formAnswered = true;
      formWrite();
      formDocument = proxy.ownerDocument;
      // A disabled <fieldset> fires no event. Watch `disabled` attributes and ask the
      // proxy, which the platform disables along with every other control inside it.
      const syncDisabled = () =>
        this.formDisabled.set(proxy.matches(':disabled') && !proxy.disabled);
      syncDisabled();
      formObserver = new MutationObserver(syncDisabled);
      formObserver.observe(formDocument.documentElement, {
        attributes: true,
        attributeFilter: ['disabled'],
        // Moves too: a control carried into or out of a disabled fieldset fires no
        // attribute change, only a childList one.
        childList: true,
        subtree: true,
      });
      formDocument.addEventListener('reset', onFormReset, true);
    });
    inject(DestroyRef).onDestroy(() => {
      formObserver?.disconnect();
      formDocument?.removeEventListener('reset', onFormReset, true);
      clearTimeout(formTimer);
    });
  }
}
