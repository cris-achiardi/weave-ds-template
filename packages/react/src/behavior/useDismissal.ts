import { useCallback, useMemo } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { dismissesOnKey, dismissesOnPress } from './dismissal.js';
import type { DismissalOptions } from './dismissal.js';

export type { DismissalCause, DismissalOptions, PressTarget } from './dismissal.js';

export interface Dismissal {
  /** Goes on the region's root. Catches Escape from anywhere inside it. */
  onKeyDown: (event: KeyboardEvent) => void;
  /** Goes on the region's root. A press whose target is the root itself is a press on the backdrop. */
  onPointerDown: (event: PointerEvent) => void;
}

/**
 * Closing a region with a key or a press that is not activation.
 *
 * The decision logic is in ./dismissal.ts as pure functions, so the cases in
 * `@ds/contracts/conformance/dismissal.json` execute against it. This hook is the React binding:
 * reading the event, and calling the state writer.
 *
 * NOTE WHAT THIS DOES NOT DO. There is no document-level listener and no global state. Both handlers
 * go on the region's own root, because both events already arrive there: Escape bubbles from
 * whatever inside holds focus, and a backdrop press reports the region itself as its target. The
 * backlog predicted this primitive would be the first global listener in generated code; measured
 * against the two contracts that need it, it is not, and the library's no-global-listeners property
 * survives. A portalled popup would be a different matter and is not in this corpus.
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

  const onPointerDown = useCallback(
    (event: PointerEvent) => {
      if (event.defaultPrevented) return;
      // `currentTarget` is the region the handler is attached to. Comparing the two is the entire
      // content of "outside press": equal means the press landed on the region itself rather than
      // on anything inside it.
      const target = event.target === event.currentTarget ? 'region' : 'inside';
      if (!dismissesOnPress(target, event.button === 0, isOpen, options)) return;
      event.preventDefault();
      onDismiss();
    },
    [isOpen, onDismiss, options],
  );

  return useMemo(() => ({ onKeyDown, onPointerDown }), [onKeyDown, onPointerDown]);
}

export { dismissesOnKey, dismissesOnPress };
