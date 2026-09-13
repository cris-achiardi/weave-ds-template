import { effect, signal } from '@angular/core';
import { dismissesOnKey, dismissesOnPress } from './dismissal.js';
import type { DismissalOptions } from './dismissal.js';

export type { DismissalCause, DismissalOptions, PressTarget } from './dismissal.js';

export interface Dismissal {
  /** Goes on the region's host. Catches Escape from anywhere inside it. */
  onKeyDown: (event: KeyboardEvent) => void;
  /** Goes on the region's host. Remembers where a press began; see the note on drags. */
  onPointerDown: (event: PointerEvent) => void;
  /** Goes on the region's host. Forgets a press the platform abandoned. */
  onPointerCancel: () => void;
  /** Goes on the region's host. Dismisses only when press AND release were both on the backdrop. */
  onClick: (event: MouseEvent) => void;
}

/**
 * Closing a region with a key or a press that is not activation.
 *
 * The decision logic is in ./dismissal.ts as pure functions, so the cases in
 * `@ds/contracts/conformance/dismissal.json` execute against it. This is the Angular binding:
 * reading the event, and calling the state writer.
 *
 * MUST BE CALLED FROM AN INJECTION CONTEXT — a field initializer or a constructor — because it
 * creates an `effect`. Generated components call it from a field initializer, which is one.
 *
 * `isOpen` IS A GETTER, for the same reason it is one in the Vue binding: the value has to be read
 * at event time rather than captured once. In Angular that getter is almost always a signal read,
 * which means this composable takes part in change detection without depending on signals in its
 * own signature — a plain `() => boolean` from any source works.
 *
 * NOTE WHAT THIS DOES NOT DO. There is no document-level listener and no global state. Both
 * handlers go on the region's own host, because both events arrive there: a backdrop click reports
 * the region itself as its target, and Escape bubbles from whatever inside holds focus. Escape
 * therefore only reaches this handler when focus is already inside the region — always true for a
 * dialog, not true for a tooltip shown on hover with focus elsewhere. All three backends carry the
 * identical limitation, which makes it a property of the approach rather than of any framework.
 *
 * @param options   the contract's `dismisses` block
 * @param isOpen    getter: whether the region is currently showing
 * @param onDismiss called when it should close
 */
export function useDismissal(
  options: DismissalOptions,
  isOpen: () => boolean,
  onDismiss: () => void,
): Dismissal {
  // TWO CONDITIONS, and shipping only the first is what let a press INSIDE the panel close it.
  //
  // `target === currentTarget` alone is true for the backdrop AND for the region's own padding, its
  // gaps, and any leftover flex space — all visibly inside the panel, all hitting the element itself
  // because no child is there to receive them. A dialog with 20px of padding closed when someone
  // pressed 20px inside its own corner.
  //
  // Geometry alone is not enough either: a child positioned outside its parent's box would read as
  // a backdrop press. Together they say what was always meant — on the region, and not on it.
  const isBackdrop = (event: MouseEvent | PointerEvent) => {
    const current = event.currentTarget;
    if (event.target !== current) return false;
    if (!(current instanceof Element)) return false;
    const box = current.getBoundingClientRect();
    return (
      event.clientX < box.left ||
      event.clientX > box.right ||
      event.clientY < box.top ||
      event.clientY > box.bottom
    );
  };

  // WHERE THE PRESS BEGAN, which a click alone cannot tell you.
  //
  // A `click` fires on the nearest common ancestor of press and release, with the RELEASE
  // coordinates. So selecting text inside the panel and letting go past its edge produces a click
  // on the region with backdrop coordinates — indistinguishable from a real backdrop press, and it
  // dismissed. Requiring both ends to be on the backdrop is what actually fixes it, and it is why
  // the pointer handler exists purely to remember.
  const pressBeganOnBackdrop = signal(false);

  // Closing by any other route also ends the press this flag was remembering.
  //
  // An `effect` rather than React's `useEffect` or Vue's `watchEffect`. Unlike React's, it needs no
  // note about writing during render — Angular has no discarded render for the write to escape
  // from. `allowSignalWrites` is not passed because Angular 19 dropped the restriction it guarded.
  effect(() => {
    if (!isOpen()) pressBeganOnBackdrop.set(false);
  });

  const onKeyDown = (event: KeyboardEvent) => {
    // Someone else already claimed it — a text field inside, say.
    if (event.defaultPrevented) return;
    if (!dismissesOnKey(event.key, isOpen(), options)) return;
    event.preventDefault();
    onDismiss();
  };

  // NO `defaultPrevented` CHECK, for the reason useRangeControl gives at length: on a pointerdown
  // that call is how you suppress text selection and focus, not how you claim an event.
  const onPointerDown = (event: PointerEvent) => {
    pressBeganOnBackdrop.set(isBackdrop(event));
  };

  // A press the platform took away — the pointer left the window, a gesture was recognised, a
  // context menu opened — produces no click, so nothing would otherwise clear the flag.
  const onPointerCancel = () => {
    pressBeganOnBackdrop.set(false);
  };

  const onClick = (event: MouseEvent) => {
    const began = pressBeganOnBackdrop();
    pressBeganOnBackdrop.set(false);
    if (event.defaultPrevented) return;

    const target = began && isBackdrop(event) ? 'region' : 'inside';
    if (!dismissesOnPress(target, event.button === 0, isOpen(), options)) return;
    event.preventDefault();
    onDismiss();
  };

  return { onKeyDown, onPointerDown, onPointerCancel, onClick };
}

export { dismissesOnKey, dismissesOnPress };
