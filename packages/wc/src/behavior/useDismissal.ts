import { dismissesOnKey, dismissesOnPress } from '@ds/behavior/dismissal';
import type { DismissalOptions } from '@ds/behavior/dismissal';

export type { DismissalCause, DismissalOptions, PressTarget } from '@ds/behavior/dismissal';

export interface Dismissal {
  onKeyDown: (event: KeyboardEvent) => void;
  onPointerDown: (event: PointerEvent) => void;
  onPointerCancel: () => void;
  onClick: (event: MouseEvent) => void;
}

/**
 * Closing a region with a key or a press that is not activation.
 *
 * The decision logic is in @ds/behavior as pure functions, so the cases in
 * `@ds/contracts/conformance/dismissal.json` execute against it. This is the vanilla binding, and
 * it is the shortest of the four because there is no reactivity system to satisfy: a closure over a
 * `let`, and two functions.
 *
 * `isOpen` IS A GETTER for the same reason it is one in the Vue and Angular bindings — the value has
 * to be read at event time. Here that is not a framework constraint, just the ordinary consequence
 * of the component owning its own state.
 */
export function useDismissal(
  options: DismissalOptions,
  isOpen: () => boolean,
  onDismiss: () => void,
): Dismissal {
  // TWO CONDITIONS, and shipping only the first is what let a press INSIDE the panel close it.
  // `target === currentTarget` alone is true for the backdrop AND for the region's own padding.
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

  // WHERE THE PRESS BEGAN, which a click alone cannot tell you: a click fires on the nearest common
  // ancestor of press and release, with the RELEASE coordinates.
  let pressBeganOnBackdrop = false;
  let wasOpen = isOpen();

  const forgetIfClosed = () => {
    const open = isOpen();
    if (wasOpen && !open) pressBeganOnBackdrop = false;
    wasOpen = open;
  };

  return {
    onKeyDown(event) {
      forgetIfClosed();
      if (event.defaultPrevented) return;
      if (!dismissesOnKey(event.key, isOpen(), options)) return;
      event.preventDefault();
      onDismiss();
    },
    // NO `defaultPrevented` CHECK: on a pointerdown that call is how you suppress text selection
    // and focus, not how you claim an event.
    onPointerDown(event) {
      forgetIfClosed();
      pressBeganOnBackdrop = isBackdrop(event);
    },
    onPointerCancel() {
      pressBeganOnBackdrop = false;
    },
    onClick(event) {
      const began = pressBeganOnBackdrop;
      pressBeganOnBackdrop = false;
      if (event.defaultPrevented) return;
      const target = began && isBackdrop(event) ? 'region' : 'inside';
      if (!dismissesOnPress(target, event.button === 0, isOpen(), options)) return;
      event.preventDefault();
      onDismiss();
    },
  };
}

export { dismissesOnKey, dismissesOnPress };
