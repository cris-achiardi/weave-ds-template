import { useCallback, useMemo, useRef } from 'react';
import type { KeyboardEvent, MouseEvent, PointerEvent } from 'react';
import { dismissesOnKey, dismissesOnPress } from './dismissal.js';
import type { DismissalOptions } from './dismissal.js';

export type { DismissalCause, DismissalOptions, PressTarget } from './dismissal.js';

export interface Dismissal {
  /** Goes on the region's root. Catches Escape from anywhere inside it — see the note above. */
  onKeyDown: (event: KeyboardEvent) => void;
  /** Goes on the region's root. Remembers where a press began; see the note on drags. */
  onPointerDown: (event: PointerEvent) => void;
  /** Goes on the region's root. Forgets a press the platform abandoned. */
  onPointerCancel: () => void;
  /** Goes on the region's root. Dismisses only when press AND release were both on the backdrop. */
  onClick: (event: MouseEvent) => void;
}

/**
 * Closing a region with a key or a press that is not activation.
 *
 * The decision logic is in ./dismissal.ts as pure functions, so the cases in
 * `@ds/contracts/conformance/dismissal.json` execute against it. This hook is the React binding:
 * reading the event, and calling the state writer.
 *
 * NOTE WHAT THIS DOES NOT DO, AND WHAT THAT COSTS. There is no document-level listener and no
 * global state. Both handlers go on the region's own root, because both events arrive there: a
 * backdrop click reports the region itself as its target, and Escape bubbles from whatever inside
 * holds focus.
 *
 * That second one is a real limitation rather than a free win, and an earlier version of this
 * comment overstated it. **Escape only reaches this handler when focus is already inside the
 * region.** For a dialog that is always true — it contains focus. For a TOOLTIP it is not: the case
 * the APG actually describes is a tooltip shown on hover with focus somewhere else entirely, and
 * Escape then never arrives here. That case cannot occur while nothing opens a tooltip on hover, so
 * it is accepted rather than solved — but building hover-opening forces this open again, and it is
 * where the first global listener will come from.
 *
 * @param options  the contract's `dismisses` block
 * @param isOpen   whether the region is currently showing
 * @param onDismiss called when it should close
 */
export function useDismissal(
  options: DismissalOptions,
  isOpen: boolean,
  onDismiss: () => void,
): Dismissal {
  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Someone else already claimed it — a text field inside, say.
      if (event.defaultPrevented) return;
      if (!dismissesOnKey(event.key, isOpen, options)) return;
      event.preventDefault();
      onDismiss();
    },
    [isOpen, onDismiss, options],
  );

  // TWO CONDITIONS, and shipping only the first is what let a press INSIDE the panel close it.
  //
  // `target === currentTarget` alone is true for the backdrop AND for the region's own padding, its
  // gaps, and any leftover flex space — all visibly inside the panel, all hitting the element itself
  // because no child is there to receive them. A dialog with 20px of padding closed when someone
  // pressed 20px inside its own corner.
  //
  // Geometry alone is not enough either: a child positioned outside its parent's box would read as
  // a backdrop press. Together they say what was always meant — on the region, and not on it.
  const isBackdrop = useCallback((event: MouseEvent | PointerEvent) => {
    if (event.target !== event.currentTarget) return false;
    const box = event.currentTarget.getBoundingClientRect();
    return (
      event.clientX < box.left ||
      event.clientX > box.right ||
      event.clientY < box.top ||
      event.clientY > box.bottom
    );
  }, []);

  // WHERE THE PRESS BEGAN, which a click alone cannot tell you.
  //
  // A `click` fires on the nearest common ancestor of press and release, with the RELEASE
  // coordinates. So selecting text inside the panel and letting go past its edge produces a click
  // on the region with backdrop coordinates — indistinguishable from a real backdrop press, and it
  // dismissed. Measured, after switching to `click` specifically to avoid this and finding it did
  // not: the drag closed the dialog anyway.
  //
  // Requiring both ends to be on the backdrop is what actually fixes it, and it is why the pointer
  // handler exists purely to remember.
  const pressBeganOnBackdrop = useRef(false);

  const onPointerDown = useCallback(
    (event: PointerEvent) => {
      pressBeganOnBackdrop.current = !event.defaultPrevented && isBackdrop(event);
    },
    [isBackdrop],
  );

  // A press the platform took away — the pointer left the window, a gesture was recognised, a
  // context menu opened — produces no click, so nothing would otherwise clear the flag and it would
  // sit `true` across a close and reopen. Not exploitable today, because a later dismissal still
  // needs a click that independently passes `isBackdrop`; cleared anyway rather than left resting
  // on a second test to cover for it.
  const onPointerCancel = useCallback(() => {
    pressBeganOnBackdrop.current = false;
  }, []);

  // Closing by any other route also ends the press this flag was remembering.
  if (!isOpen && pressBeganOnBackdrop.current) pressBeganOnBackdrop.current = false;

  const onClick = useCallback(
    (event: MouseEvent) => {
      const began = pressBeganOnBackdrop.current;
      pressBeganOnBackdrop.current = false;
      if (event.defaultPrevented) return;

      const target = began && isBackdrop(event) ? 'region' : 'inside';
      if (!dismissesOnPress(target, event.button === 0, isOpen, options)) return;
      event.preventDefault();
      onDismiss();
    },
    [isBackdrop, isOpen, onDismiss, options],
  );

  return useMemo(
    () => ({ onKeyDown, onPointerDown, onPointerCancel, onClick }),
    [onKeyDown, onPointerDown, onPointerCancel, onClick],
  );
}

export { dismissesOnKey, dismissesOnPress };
