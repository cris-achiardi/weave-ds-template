import { apply, fractionOf, intentFor, snap, valueAt } from '@ds/behavior/range-stepping';
import type { RangeOptions } from '@ds/behavior/range-stepping';

export type { RangeIntent, RangeOptions, RangeOrientation } from '@ds/behavior/range-stepping';

export interface RangeControl {
  onKeyDown: (event: KeyboardEvent) => void;
  onPointerDown: (event: PointerEvent) => void;
  onPointerMove: (event: PointerEvent) => void;
  onPointerUp: (event: PointerEvent) => void;
  /** True while a pointer is held down and moving. The contract declares this an `internal` state. */
  readonly dragging: boolean;
  /** Where the value sits along the track, 0..1. Draws the fill's length and the thumb's offset. */
  readonly fraction: number;
}

/**
 * A number in a range, operated by keyboard and pointer.
 *
 * The arithmetic lives in @ds/behavior as pure functions. This is the vanilla binding: the track's
 * box, pointer capture, and the drag.
 *
 * IT TAKES AN `onDirty` CALLBACK, and it is the only one of the four that does. React re-renders
 * when state changes, Vue's refs and Angular's signals notify their own schedulers — and this
 * backend has none of that. `dragging` is internal state that nothing outside writes, so when it
 * changes the component has to be TOLD to rewrite its attributes. That callback is what a
 * reactivity system is, reduced to the one line this component actually needs.
 *
 * `dragging` and `fraction` are getters on the returned object rather than values, so a caller
 * reading `range.fraction` always reads now rather than whenever this was constructed.
 */
export function useRangeControl(
  options: RangeOptions,
  value: () => number,
  onChange: (next: number) => void,
  disabled: () => boolean = () => false,
  track: () => HTMLElement | null = () => null,
  onDirty: () => void = () => {},
): RangeControl {
  let dragging = false;

  const fractionAt = (event: PointerEvent) => {
    const box = track()?.getBoundingClientRect();
    if (!box) return null;
    if (options.orientation === 'vertical') {
      // Screen y grows downward and a vertical slider's maximum is at the TOP.
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

  return {
    get dragging() {
      return dragging;
    },
    get fraction() {
      return fractionOf(value(), options);
    },
    onPointerDown(event) {
      if (disabled() || event.button !== 0) return;
      if (!track()) return;
      // NO `defaultPrevented` CHECK: on a pointerdown that call is the ordinary way to suppress
      // text selection and the focus change, not a claim on the event.
      const current = event.currentTarget;
      if (current instanceof Element) {
        try {
          current.setPointerCapture(event.pointerId);
        } catch {
          /* no capture available — the drag still works while the pointer stays over it */
        }
      }
      event.preventDefault();
      dragging = true;
      setFromPointer(event);
      onDirty();
    },
    onPointerMove(event) {
      if (!dragging) return;
      setFromPointer(event);
    },
    onPointerUp(event) {
      dragging = false;
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
      onDirty();
    },
    onKeyDown(event) {
      if (disabled()) return;
      const intent = intentFor(event.key, options);
      // NOT ours. A slider must not swallow Tab, or every other key on the board.
      if (intent === null) return;
      if (event.defaultPrevented) return;
      event.preventDefault();
      const next = apply(intent, value(), options);
      if (next !== snap(value(), options)) onChange(next);
    },
  };
}

export { apply, fractionOf, intentFor as rangeIntentFor, snap, valueAt };
