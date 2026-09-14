import { computed, signal } from '@angular/core';
import type { Signal } from '@angular/core';
import { apply, fractionOf, intentFor, snap, valueAt } from '@ds/behavior/range-stepping';
import type { RangeOptions } from '@ds/behavior/range-stepping';

export type { RangeIntent, RangeOptions, RangeOrientation } from '@ds/behavior/range-stepping';

export interface RangeControl {
  /** Goes on the component's host, alongside the pointer handlers. */
  onKeyDown: (event: KeyboardEvent) => void;
  onPointerDown: (event: PointerEvent) => void;
  onPointerMove: (event: PointerEvent) => void;
  onPointerUp: (event: PointerEvent) => void;
  /** True while a pointer is held down and moving. The contract declares this an `internal` state. */
  dragging: Signal<boolean>;
  /** Where the value sits along the track, 0..1. Draws the fill's length and the thumb's offset. */
  fraction: Signal<number>;
}

/**
 * A number in a range, operated by keyboard and pointer.
 *
 * The arithmetic lives in @ds/behavior as pure functions, so it can be executed against the
 * conformance cases in `@ds/contracts/conformance/range-stepping.json`. This is the Angular binding
 * around it: the track's box, pointer capture, and the drag.
 *
 * THE TRACK ARRIVES AS A GETTER, not as a ref setter. React hands this primitive a callback ref to
 * attach and Vue hands it a function ref; Angular resolves the element itself with a `viewChild`
 * query and hands in a reader. Three ways of answering "which box does a pointer measure against",
 * none of which the contract knows about — it names the part and stops, which is exactly as far as
 * a framework-agnostic statement can go.
 *
 * `value`, `disabled` and `track` are all getters, for the reason useDismissal explains.
 *
 * @param options  the contract's `range` block, plus min/max/step from the operated state
 * @param value    getter: the current number
 * @param onChange called with the next number
 * @param disabled getter: whether the control is inert
 * @param track    getter: the element a pointer is measured against
 */
export function useRangeControl(
  options: RangeOptions,
  value: () => number,
  onChange: (next: number) => void,
  disabled: () => boolean = () => false,
  track: () => HTMLElement | null = () => null,
): RangeControl {
  const dragging = signal(false);

  const fractionAt = (event: PointerEvent) => {
    const box = track()?.getBoundingClientRect();
    if (!box) return null;
    if (options.orientation === 'vertical') {
      // Screen y grows downward and a vertical slider's maximum is at the TOP, so the fraction is
      // measured from the bottom edge.
      return box.height === 0 ? 0 : (box.bottom - event.clientY) / box.height;
    }
    return box.width === 0 ? 0 : (event.clientX - box.left) / box.width;
  };

  const setFromPointer = (event: PointerEvent) => {
    const f = fractionAt(event);
    if (f === null) return;
    const next = valueAt(f, options);
    if (next !== snap(value(), options)) onChange(next);
  };

  const onPointerDown = (event: PointerEvent) => {
    if (disabled() || event.button !== 0) return;
    if (!track()) return;
    // NO `defaultPrevented` CHECK. On a pointerdown, preventDefault() is the ordinary way to
    // suppress text selection and the focus change — it is not a claim on the event — and guarding
    // on it stopped a drag from starting at all for a consumer doing something reasonable.
    const current = event.currentTarget;
    if (current instanceof Element) {
      try {
        current.setPointerCapture(event.pointerId);
      } catch {
        /* no capture available — the drag still works while the pointer stays over the element */
      }
    }
    event.preventDefault();
    dragging.set(true);
    setFromPointer(event);
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!dragging()) return;
    setFromPointer(event);
  };

  const onPointerUp = (event: PointerEvent) => {
    dragging.set(false);
    const current = event.currentTarget;
    if (current instanceof Element) {
      try {
        if (current.hasPointerCapture(event.pointerId)) {
          current.releasePointerCapture(event.pointerId);
        }
      } catch {
        /* nothing was captured; see onPointerDown */
      }
    }
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (disabled()) return;
    const intent = intentFor(event.key, options);
    // NOT ours. A slider must not swallow Tab, or every other key on the board.
    if (intent === null) return;
    if (event.defaultPrevented) return;
    event.preventDefault();
    const next = apply(intent, value(), options);
    if (next !== snap(value(), options)) onChange(next);
  };

  return {
    onKeyDown,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    dragging: dragging.asReadonly(),
    fraction: computed(() => fractionOf(value(), options)),
  };
}

export { apply, fractionOf, intentFor as rangeIntentFor, snap, valueAt };
