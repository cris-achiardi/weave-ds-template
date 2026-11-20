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
      [type]="readOnly() ? 'text' : 'checkbox'"
      [attr.name]="readOnly() && !(checked() === true) ? null : name() || null"
      [attr.form]="form() || null"
      [required]="required() && !readOnly()"
      [readOnly]="readOnly()"
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
    // One observer per DOCUMENT, shared by every generated control on it and refcounted, notifying
    // only the controls a record can affect. Generated from packages/emit-web/form-disabled.mjs.
    function watchFormDisabled(proxy: HTMLInputElement, sync: () => void): () => void {
      type Watcher = { proxy: HTMLInputElement; sync: () => void };
      type Registry = { observer: MutationObserver; watchers: Set<Watcher> };
      const doc = proxy.ownerDocument;
      const key = Symbol.for('ds.form-disabled');
      const host = doc as unknown as Record<symbol, Registry | undefined>;
      let registry = host[key];
      if (!registry) {
        const watchers = new Set<Watcher>();
        // ONE pass over the records, each tested cheaply before any subscriber is: a `disabled`
        // change matters only on a fieldset, and an insertion only if it holds an <input>, since
        // every proxy is one. Unrelated mutations cost a type check or a tag lookup, not a walk.
        const observer = new MutationObserver((records) => {
          const due = new Set<Watcher>();
          const collect = (root: Node) => {
            for (const watcher of watchers) if (root.contains(watcher.proxy)) due.add(watcher);
          };
          for (const record of records) {
            if (record.type === 'attributes') {
              if (record.target.nodeName === 'FIELDSET') collect(record.target);
              continue;
            }
            const added = record.addedNodes;
            for (let i = 0; i < added.length; i++) {
              const node = added[i] as Element;
              if (node.nodeType !== 1) continue;
              if (node.nodeName !== 'INPUT') {
                if (!node.firstElementChild || !node.getElementsByTagName('input').length) continue;
              }
              collect(node);
            }
          }
          for (const watcher of due) watcher.sync();
        });
        observer.observe(doc.documentElement, {
          attributes: true,
          attributeFilter: ['disabled'],
          childList: true,
          subtree: true,
        });
        registry = { observer, watchers };
        host[key] = registry;
      }
      const watcher: Watcher = { proxy, sync };
      registry.watchers.add(watcher);
      return () => {
        const current = host[key];
        if (!current) return;
        current.watchers.delete(watcher);
        if (current.watchers.size) return;
        current.observer.disconnect();
        delete host[key];
      };
    }
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
    let formUnwatch: (() => void) | undefined;
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
      // A disabled <fieldset> fires no event. The shared document watcher calls back on
      // a fieldset `disabled` change or a move that can affect this control; the proxy,
      // which the platform disables with its fieldset, gives the answer.
      const syncDisabled = () =>
        this.formDisabled.set(proxy.matches(':disabled') && !proxy.disabled);
      syncDisabled();
      formUnwatch = watchFormDisabled(proxy, syncDisabled);
      formDocument.addEventListener('reset', onFormReset, true);
    });
    inject(DestroyRef).onDestroy(() => {
      formUnwatch?.();
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
