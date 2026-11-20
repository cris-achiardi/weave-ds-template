// GENERATED from Switch.contract.json + Switch.angular.json. Do not edit by hand.
// Regenerate: node packages/angular/src/emit/emit.mjs Switch --out <dir>
//
// A binary on/off control that takes effect immediately, for a setting whose two states both make sense on their own — not a value collected and submitted later.

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

@Component({
  // The binding's `element` becomes a SELECTOR, because an Angular component attaches
  // to an element rather than rendering one. A consumer writes <button dsSwitch>.
  selector: 'button[dsSwitch]',
  exportAs: 'dsSwitch',
  // ViewEncapsulation.None IS LOAD-BEARING. Angular's default rewrites every selector in
  // these stylesheets to include a generated _ngcontent attribute, which would scope them
  // to this component and break the one property the whole system rests on: that a theme
  // file selecting on [data-ds-component] dresses the React, Vue and Angular builds
  // alike. It fails silently — the CSS loads, matches nothing, and the component renders
  // unstyled.
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['./Switch.structure.css', './Switch.theme.css'],
  host: {
    type: 'button',
    '[attr.role]': "'switch'",
    '[attr.aria-checked]': 'checked()',
    '[attr.disabled]': 'effectiveDisabled() || null',
    '[attr.aria-readonly]': 'readOnly() || null',
    '[attr.name]': 'null',
    '[attr.form]': 'null',
    '[attr.required]': 'null',
    '[attr.value]': 'null',
    'data-ds-component': 'Switch',
    'data-ds-part': 'root',
    '(click)': 'activate($event)',
  },
  template: `
    <div data-ds-part="thumb"></div>
    <input
      #formProxy
      type="checkbox"
      [attr.name]="name() || null"
      [attr.form]="form() || null"
      [required]="required() && !readOnly()"
      [disabled]="disabled()"
      [value]="value()"
      aria-hidden="true"
      tabindex="-1"
      autocomplete="off"
      [style]="formProxyStyle"
      (focus)="onFormProxyFocus($event)"
    />
  `,
})
export class Switch {
  /** The platform's own disabled state. Removed from the focus order and cannot be toggled. */
  readonly disabled = input<boolean>(false);
  /** Cannot be toggled, but remains focusable and readable. Distinct from disabled, which removes it from the focus order entirely. */
  readonly readOnly = input<boolean>(false);
  /** Name of the submitted answer. An empty name contributes nothing. */
  readonly name = input<string>('');
  /** Whether an answer is required for form validation. */
  readonly required = input<boolean, unknown>(false, { transform: booleanAttribute });
  /** The id of the form that owns this answer, when it is not an ancestor form. */
  readonly form = input<string>('');
  /** Value submitted when checked. */
  readonly value = input<string>('on');
  /** The switch is on. Tracked by the implementation and reflected to assistive technology. Two-way: `[(checked)]`. */
  readonly checked = model<boolean>(false);

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

  constructor() {
    // ---- form contribution (contract.form). See packages/wc/forms.md.
    // Driven imperatively: a native reset rewrites the proxy behind the binding's back.
    const formWrite = () => {
      const proxy = this.formProxy()?.nativeElement;
      if (!proxy) return;
      proxy.checked = this.checked() === true;
    };
    effect(formWrite);
    // The answer a reset restores: captured once, at first render — after the consumer's
    // bindings have arrived — and never re-captured.
    let formAnswer: boolean | undefined;
    let formAnswered = false;
    let formTimer: ReturnType<typeof setTimeout> | undefined;
    let formObserver: MutationObserver | undefined;
    let formDocument: Document | undefined;
    // Matched against the CURRENT owner when it fires, so a `form` input, an owner change
    // or a move needs no re-subscription.
    const onFormReset = (event: Event) => {
      const proxy = this.formProxy()?.nativeElement;
      if (!proxy || !formAnswered || event.target !== proxy.form) return;
      const answer = formAnswer as boolean;
      // A TASK, not a microtask: a reset button dispatches from native code, so a
      // microtask would run before later listeners could cancel and before the reset.
      clearTimeout(formTimer);
      formTimer = setTimeout(() => {
        if (event.defaultPrevented) return;
        // The model hears only a real difference, and no DOM event is dispatched: this
        // is lifecycle synchronisation, not a user edit.
        if (this.checked() !== answer) this.checked.set(answer);
        // The platform has rewritten the proxy; put back what the model holds now.
        formWrite();
      });
    };
    afterNextRender(() => {
      const proxy = this.formProxy()?.nativeElement;
      if (!proxy) return;
      formAnswer = this.checked();
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

  protected activate(event?: { defaultPrevented: boolean }): void {
    // Guards, because this runs on a CLICK and the platform guards there too: calling
    // preventDefault() in a click handler is what cancels a native checkbox's toggle.
    if (event?.defaultPrevented) return;
    if (this.effectiveDisabled() || this.readOnly()) return;
    this.checked.set(!this.checked());
  }
}
