// GENERATED from Dialog.contract.json + Dialog.angular.json. Do not edit by hand.
// Regenerate: node packages/angular/src/emit/emit.mjs Dialog --out <dir>
//
// Interrupts what a person was doing to ask for something that cannot wait, and refuses to let them continue until they answer or leave.

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
import { useDismissal } from '@ds/angular/behavior';
import type { DismissalOptions } from '@ds/angular/behavior';

// Transcribed from Dialog.contract.json > dismisses. The cases this commits us to
// are in @ds/contracts/conformance/dismissal.json.
//
// The contract also declares escape, which is NOT generated: the
// platform supplies it for a <dialog>. See @ds/platform-web > visibility.supplies.
const DISMISSAL: DismissalOptions = {
  on: ['outside-press'],
};

// Angular has no useId. React does and Vue 3.5 does; this counter is the emitter's
// own invention, and it is wrong under server rendering with hydration — which
// nothing in this repo exercises. Recorded rather than solved.
let nextId = 0;

@Component({
  // The binding's `element` becomes a SELECTOR, because an Angular component attaches
  // to an element rather than rendering one. A consumer writes <dialog dsDialog>.
  selector: 'dialog[dsDialog]',
  exportAs: 'dsDialog',
  // ViewEncapsulation.None IS LOAD-BEARING. Angular's default rewrites every selector in
  // these stylesheets to include a generated _ngcontent attribute, which would scope them
  // to this component and break the one property the whole system rests on: that a theme
  // file selecting on [data-ds-component] dresses the React, Vue and Angular builds
  // alike. It fails silently — the CSS loads, matches nothing, and the component renders
  // unstyled.
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['./Dialog.structure.css', './Dialog.theme.css'],
  host: {
    '[attr.id]': 'baseId',
    '[attr.data-ds-state-open]': 'open() || null',
    '[attr.data-ds-size]': 'size()',
    '[attr.aria-labelledby]': "baseId + '-title'",
    'data-ds-component': 'Dialog',
    'data-ds-part': 'root',
    '(pointerdown)': 'dismissal.onPointerDown($event)',
    '(pointercancel)': 'dismissal.onPointerCancel()',
    '(click)': 'dismissal.onClick($event)',
  },
  template: `
    <div [attr.id]="baseId + '-title'" data-ds-part="title">
      <ng-content select="[slot=title]" />
    </div>
    <div data-ds-part="body">
      <ng-content select="[slot=body]" />
    </div>
    <div data-ds-part="actions">
      <ng-content select="[slot=actions]" />
    </div>
    <ng-content />
  `,
})
export class Dialog {
  /** How wide the panel is. A contiguous subset of the canon's ladder. Defaults to `m`. */
  readonly size = input<'s' | 'm' | 'l'>('m');
  /** The dialog is showing and holding focus. Two-way: `[(open)]`. */
  readonly open = model<boolean>(false);

  readonly baseId = 'ds-dialog-' + nextId++;

  private readonly host = inject<ElementRef<HTMLDialogElement>>(ElementRef);

  // A platform modal is closed BY THE ELEMENT, never by writing the state: writing
  // it would run the effect, which calls close(), which the observer sees — two
  // notifications for one dismissal. One close path, one place to look.
  protected readonly dismissal = useDismissal(
    DISMISSAL,
    () => this.open(),
    () => this.host.nativeElement.close(),
  );

  constructor() {
    // A <dialog> is opened by CALLING showModal(), never by rendering an attribute.
    // React reaches for useEffect here and Vue for a post-flush watcher; Angular's
    // effect() runs after the view is created, which is the same requirement met
    // by a third primitive.
    effect(() => {
      const node = this.host.nativeElement;
      // `open` reflects showModal() having been called, so it is also the
      // guard against calling it twice.
      if (this.open() && !node.open) node.showModal();
      else if (!this.open() && node.open) node.close();
    });

    // The dialog closes ITSELF on Escape, so this component is no longer the only
    // writer of its own state. Synced from the ELEMENT's own `open`
    // attribute, not from a `close` event — measured unreliable in Chrome.
    // Without this the platform would hide the element while `open` stayed
    // true, and the next open would be a no-op.
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const node = this.host.nativeElement;
      const observer = new MutationObserver(() => {
        // Guarded, or a close already recorded emits openChange a second time.
        if (!node.open && this.open()) this.open.set(false);
      });
      observer.observe(node, { attributes: true, attributeFilter: ['open'] });
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }
}
