// GENERATED from TextField.contract.json + TextField.angular.json. Do not edit by hand.
// Regenerate: node packages/angular/src/emit/emit.mjs TextField --out <dir>
//
// Collects a single line of text from a person. It is the control itself, where Field is the plumbing around a control — the two compose, and neither does the other's job.

import {
  Component,
  DestroyRef,
  ElementRef,
  ViewEncapsulation,
  afterNextRender,
  effect,
  inject,
  input,
  model,
} from '@angular/core';

@Component({
  // The binding's `element` becomes a SELECTOR, because an Angular component attaches
  // to an element rather than rendering one. A consumer writes <input dsTextField>.
  selector: 'input[dsTextField]',
  exportAs: 'dsTextField',
  // ViewEncapsulation.None IS LOAD-BEARING. Angular's default rewrites every selector in
  // these stylesheets to include a generated _ngcontent attribute, which would scope them
  // to this component and break the one property the whole system rests on: that a theme
  // file selecting on [data-ds-component] dresses the React, Vue and Angular builds
  // alike. It fails silently — the CSS loads, matches nothing, and the component renders
  // unstyled.
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['./TextField.structure.css', './TextField.theme.css'],
  host: {
    '[attr.disabled]': 'disabled() || null',
    '[attr.aria-readonly]': 'readOnly() || null',
    '[attr.aria-invalid]': 'invalid() || null',
    '[attr.data-ds-size]': 'size()',
    '[value]': 'value()',
    '[attr.readonly]': 'readOnly() || null',
    'data-ds-component': 'TextField',
    'data-ds-part': 'root',
    '(input)': 'handleInput($event)',
  },
  // A void element has no content model, so there is no template at all.
  template: '',
})
export class TextField {
  /** The platform's own disabled state. Removed from the focus order and cannot be typed into. */
  readonly disabled = input<boolean>(false);
  /** The text can be read and selected but not changed. Distinct from disabled, which removes it from the focus order. */
  readonly readOnly = input<boolean>(false);
  /** Set from outside — usually by a surrounding Field. This component does not decide it. */
  readonly invalid = input<boolean>(false);
  /** A contiguous subset of the canon's ladder. Defaults to `m`. */
  readonly size = input<'s' | 'm' | 'l'>('m');
  /** The text itself. Free-form: not a boolean, and not one of a fixed set — which is what makes this the first state in the library that `values` cannot describe. Two-way: `[(value)]`. */
  readonly value = model<string>('');

  private readonly formHost = inject<ElementRef<HTMLInputElement>>(ElementRef);

  constructor() {
    // ---- form lifecycle (contract.form). See packages/wc/forms.md.
    const control = this.formHost.nativeElement;
    // The answer a reset restores: captured once, at first render — after the consumer's
    // bindings have arrived — and never re-captured.
    let formAnswer: string | undefined;
    let formTimer: ReturnType<typeof setTimeout> | undefined;
    // Matched against the CURRENT owner when it fires, so a `form` attribute, an owner
    // change or a move needs no re-subscription.
    const onFormReset = (event: Event) => {
      if (formAnswer === undefined || event.target !== control.form) return;
      const answer = formAnswer;
      // A TASK, not a microtask: a reset button dispatches from native code, so a
      // microtask would run before later listeners could cancel and before the reset.
      clearTimeout(formTimer);
      formTimer = setTimeout(() => {
        if (event.defaultPrevented) return;
        // The model hears only a real difference, and no DOM event is dispatched: this
        // is lifecycle synchronisation, not a user edit.
        if (this.value() !== answer) this.value.set(answer);
        // The binding writes only on change; the platform has already rewritten the
        // element, so make it show what the model holds.
        control.value = this.value();
      });
    };
    afterNextRender(() => {
      formAnswer = this.value();
      control.ownerDocument.addEventListener('reset', onFormReset, true);
    });
    inject(DestroyRef).onDestroy(() => {
      control.ownerDocument.removeEventListener('reset', onFormReset, true);
      clearTimeout(formTimer);
    });
    // Custom validity has two writers, tracked by WRITER, not by message text: the consumer,
    // through the element's own setCustomValidity() method, and authored `invalid`. The
    // consumer's message wins, as in WC. Generated from packages/emit-web/validity.mjs, which also
    // records the one unsupported path (calling the prototype method directly).
    function ownValidity(element: HTMLInputElement) {
      const prior = Object.getOwnPropertyDescriptor(element, 'setCustomValidity');
      const write: (message: string) => void =
        typeof prior?.value === 'function'
          ? prior.value.bind(element)
          : HTMLInputElement.prototype.setCustomValidity.bind(element);
      // An error already present is the consumer's. While the element is barred from validation
      // its text reads '', so `null` records "present but unreadable": left exactly as it is.
      let consumer: string | null = element.validity.customError
        ? element.validationMessage || null
        : '';
      let invalid = false;
      const apply = () => {
        if (consumer !== null) write(consumer || (invalid ? 'Invalid value.' : ''));
      };
      const intercept = (message: string) => {
        consumer = String(message);
        apply();
      };
      element.setCustomValidity = intercept;
      return {
        setInvalid(next: boolean) {
          invalid = next;
          apply();
        },
        release() {
          // A newer override is the consumer's: leave it.
          if (element.setCustomValidity !== intercept) return;
          if (prior) Object.defineProperty(element, 'setCustomValidity', prior);
          else Reflect.deleteProperty(element, 'setCustomValidity');
        },
      };
    }
    const formValidity = ownValidity(control);
    inject(DestroyRef).onDestroy(() => formValidity.release());
    effect(() => formValidity.setInvalid(this.invalid()));
  }

  protected handleInput(event: Event): void {
    const next = (event.target as HTMLInputElement).value;
    this.value.set(next);
  }
}
