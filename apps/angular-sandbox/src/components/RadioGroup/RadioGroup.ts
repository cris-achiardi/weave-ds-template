// GENERATED from RadioGroup.contract.json + RadioGroup.angular.json. Do not edit by hand.
// Regenerate: node packages/angular/src/emit/emit.mjs RadioGroup --out <dir>
//
// Holds one choice from a small set of mutually exclusive options, all visible at once. It exists so the chosen option has exactly one home: the items compare against it rather than each holding a copy.

import {
  Component,
  DestroyRef,
  ElementRef,
  InjectionToken,
  ViewEncapsulation,
  afterNextRender,
  booleanAttribute,
  computed,
  effect,
  forwardRef,
  inject,
  input,
  model,
  signal,
  viewChild,
} from '@angular/core';
import type { Signal } from '@angular/core';
import { useLinearNavigation } from '@ds/angular/behavior';
import type { MemberRegistration, NavigationOptions } from '@ds/angular/behavior';

// Transcribed field for field from RadioGroup.contract.json > collection.navigation.
// The cases this commits us to are in
// @ds/contracts/conformance/linear-navigation.json.
const NAVIGATION: NavigationOptions = {
  orientation: 'both',
  wrap: true,
  followsFocus: true,
  disabledItems: 'skip',
};

// Angular has no useId. React does and Vue 3.5 does; this counter is the emitter's
// own invention, and it is wrong under server rendering with hydration — which
// nothing in this repo exercises. Recorded rather than solved.
let nextId = 0;

/** Published to every member through the injector. */
export interface RadioGroupContext {
  /** The current selection, by member value. */
  readonly selection: Signal<string>;
  /** Called by a member when it is activated. */
  toggle(value: string): void;
  /** Shared id root, so a member's parts can reference one another. */
  readonly baseId: string;
  /** True when the whole collection is disabled. */
  readonly collectionDisabled: Signal<boolean>;
  /** A member announces its DOM node, so the collection can move focus. */
  register(value: string, entry: MemberRegistration): void;
  unregister(value: string): void;
  /** True for the one member that sits in the page's tab sequence. */
  isTabStop(value: string): boolean;
}

/**
 * The injection token. A member asks the injector for its collection, which is
 * Angular's answer to React context and Vue's provide/inject — the contract declares
 * that a membership exists and says nothing about the protocol.
 */
export const RADIOGROUP = new InjectionToken<RadioGroupContext>('RadioGroup');

@Component({
  // The binding's `element` becomes a SELECTOR, because an Angular component attaches
  // to an element rather than rendering one. A consumer writes <div dsRadioGroup>.
  selector: 'div[dsRadioGroup]',
  exportAs: 'dsRadioGroup',
  // ViewEncapsulation.None IS LOAD-BEARING. Angular's default rewrites every selector in
  // these stylesheets to include a generated _ngcontent attribute, which would scope them
  // to this component and break the one property the whole system rests on: that a theme
  // file selecting on [data-ds-component] dresses the React, Vue and Angular builds
  // alike. It fails silently — the CSS loads, matches nothing, and the component renders
  // unstyled.
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['./RadioGroup.structure.css', './RadioGroup.theme.css'],
  providers: [{ provide: RADIOGROUP, useExisting: forwardRef(() => RadioGroup) }],
  host: {
    '[attr.role]': "'radiogroup'",
    '[attr.id]': 'baseId',
    '[attr.aria-disabled]': 'effectiveDisabled() || null',
    '[attr.aria-readonly]': 'readOnly() || null',
    '[attr.name]': 'null',
    '[attr.form]': 'null',
    '[attr.required]': 'null',
    'data-ds-component': 'RadioGroup',
    'data-ds-part': 'root',
    '(keydown)': 'nav.onKeyDown($event)',
  },
  template: `
    <ng-content />
    <input
      #formProxy
      type="text"
      [attr.name]="name() || null"
      [attr.form]="form() || null"
      [required]="required() && !readOnly()"
      [readOnly]="readOnly()"
      [disabled]="disabled()"
      aria-hidden="true"
      tabindex="-1"
      autocomplete="off"
      [style]="formProxyStyle"
      (focus)="onFormProxyFocus($event)"
    />
  `,
})
export class RadioGroup implements RadioGroupContext {
  /** The whole group ignores interaction. Cascades to every item. */
  readonly disabled = input<boolean>(false);
  /** The selection cannot be changed, but the group stays readable and focusable. Distinct from disabled, which removes it from the focus order. */
  readonly readOnly = input<boolean>(false);
  /** Name of the submitted answer. An empty name contributes nothing. */
  readonly name = input<string>('');
  /** Whether an answer is required for form validation. */
  readonly required = input<boolean, unknown>(false, { transform: booleanAttribute });
  /** The id of the form that owns this answer, when it is not an ancestor form. */
  readonly form = input<string>('');
  /** The current selection, by member identity. Two-way: `[(value)]`. */
  readonly value = model<string>('');

  readonly baseId = 'ds-radio-group-' + nextId++;

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

  readonly selection = this.value.asReadonly();
  readonly collectionDisabled = computed(() => this.effectiveDisabled());

  // `memberValue`, not `value`: the selection model is a member of
  // this class under that name, and a parameter shadowing it reads as the string.
  toggle(memberValue: string): void {
    if (this.value() === memberValue) return;
    this.value.set(memberValue);
  }

  // `toggle` is the selection setter, and `followsFocus` is what decides whether
  // the primitive calls it. With followsFocus false it is never called from here
  // and arrowing only moves focus.
  private readonly nav = useLinearNavigation(
    NAVIGATION,
    () => this.value(),
    (v) => this.toggle(v),
  );
  register = this.nav.register;
  unregister = this.nav.unregister;
  isTabStop = this.nav.isTabStop;
  protected readonly navHandlers = this.nav;

  constructor() {
    // ---- form contribution (contract.form). See packages/wc/forms.md.
    // Driven imperatively: a native reset rewrites the proxy behind the binding's back.
    const formWrite = () => {
      const proxy = this.formProxy()?.nativeElement;
      if (!proxy) return;
      proxy.value = this.value();
    };
    effect(formWrite);
    // The answer a reset restores: captured once, at first render — after the consumer's
    // bindings have arrived — and never re-captured.
    let formAnswer: string | undefined;
    let formAnswered = false;
    let formTimer: ReturnType<typeof setTimeout> | undefined;
    let formObserver: MutationObserver | undefined;
    let formDocument: Document | undefined;
    // Matched against the CURRENT owner when it fires, so a `form` input, an owner change
    // or a move needs no re-subscription.
    const onFormReset = (event: Event) => {
      const proxy = this.formProxy()?.nativeElement;
      if (!proxy || !formAnswered || event.target !== proxy.form) return;
      const answer = formAnswer as string;
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

  protected readonly nav2 = this.navHandlers;
}
