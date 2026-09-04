import { useCallback, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { apply, fractionOf, intentFor, snap, valueAt } from './range-stepping.js';
import type { RangeOptions } from './range-stepping.js';

export type { RangeIntent, RangeOptions, RangeOrientation } from './range-stepping.js';

export interface RangeControl {
  /** Goes on the part the contract names as the `track`. It is what a pointer is measured against. */
  trackRef: (node: HTMLElement | null) => void;
  /** Goes on the component's root, alongside `onPointerDown`. */
  onKeyDown: (event: KeyboardEvent) => void;
  onPointerDown: (event: PointerEvent) => void;
  onPointerMove: (event: PointerEvent) => void;
  onPointerUp: (event: PointerEvent) => void;
  /** True while a pointer is held down and moving. The contract declares this as an `internal` state. */
  dragging: boolean;
  /** Where the value sits along the track, 0..1. Draws the fill's length and the thumb's offset. */
  fraction: number;
}

/**
 * A number in a range, operated by keyboard and pointer.
 *
 * The arithmetic lives in ./range-stepping.ts as pure functions, so it can be executed against the
 * conformance cases in `@ds/contracts/conformance/range-stepping.json`. This hook is the React
 * binding around it: the track's box, pointer capture, and the drag.
 *
 * @param options  the contract's `range` block merged with the operated state's min/max/step
 * @param value    the current value
 * @param onChange called with the next value, already snapped and inside the range
 * @param disabled when true the control is inert, and neither key nor pointer moves it
 */
export function useRangeControl(
  options: RangeOptions,
  value: number,
  onChange: (next: number) => void,
  disabled = false,
): RangeControl {
  const track = useRef<HTMLElement | null>(null);
  const [dragging, setDragging] = useState(false);

  const trackRef = useCallback((node: HTMLElement | null) => {
    track.current = node;
  }, []);

  // Where a pointer sits along the track, as 0..1. Measured against the TRACK's box rather than
  // the root's: a root usually carries padding so its hit area can reach 44px, and measuring
  // against it would make the thumb lag the pointer by that padding at both ends.
  const fractionAt = useCallback(
    (event: PointerEvent) => {
      const box = track.current?.getBoundingClientRect();
      if (!box) return null;
      if (options.orientation === 'vertical') {
        // Screen coordinates grow downward and a vertical range grows upward, so this axis is
        // inverted. Getting it wrong produces a slider that works and runs backwards.
        return box.height === 0 ? 0 : (box.bottom - event.clientY) / box.height;
      }
      return box.width === 0 ? 0 : (event.clientX - box.left) / box.width;
    },
    [options.orientation],
  );

  const setFromPointer = useCallback(
    (event: PointerEvent) => {
      const f = fractionAt(event);
      if (f === null) return;
      const next = valueAt(f, options);
      if (next !== snap(value, options)) onChange(next);
    },
    [fractionAt, onChange, options, value],
  );

  const onPointerDown = useCallback(
    (event: PointerEvent) => {
      if (disabled || event.button !== 0) return;
      // Someone else already claimed it. Needed because a root may carry handlers from more than
      // one primitive, and the emitter now composes them into one chain — without this guard the
      // chain is not self-terminating for pointer events the way it is for keys.
      if (event.defaultPrevented) return;
      if (!track.current) return;
      // Capture on the element the listener is attached to, so a pointer that leaves the track —
      // or the window — keeps reporting here until it is released. Without this a drag dies the
      // moment the pointer strays off the thumb, which is most of the time.
      //
      // It throws for a pointerId the browser has no active pointer for, which is every
      // synthesised event: a test harness, an automation driver, an assistive tool that clicks.
      // Losing capture degrades the drag; letting the exception out would kill the press entirely
      // and take the value-jump with it.
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        /* no capture available — the drag still works while the pointer stays over the element */
      }
      event.preventDefault();
      setDragging(true);
      // Pressing anywhere on the track jumps the value to that point, which is what makes a
      // slider feel direct. The APG says nothing about this; it is an affordance, declared by
      // `range.drag`.
      setFromPointer(event);
    },
    [disabled, setFromPointer],
  );

  const onPointerMove = useCallback(
    (event: PointerEvent) => {
      if (!dragging) return;
      if (event.defaultPrevented) return;
      setFromPointer(event);
    },
    [dragging, setFromPointer],
  );

  // Deliberately NOT guarded on `defaultPrevented`. Releasing the capture has to happen whatever
  // else claimed the event, or the pointer stays captured and the next drag starts broken.
  const onPointerUp = useCallback((event: PointerEvent) => {
    setDragging(false);
    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    } catch {
      /* nothing was captured; see onPointerDown */
    }
  }, []);

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (disabled) return;
      const intent = intentFor(event.key, options);
      // NOT ours. Leave the event alone — this is what keeps Tab moving off the slider, and what
      // lets Page Up scroll the page when no jump size was declared.
      if (intent === null) return;
      if (event.defaultPrevented) return;
      event.preventDefault();
      const next = apply(intent, value, options);
      if (next !== snap(value, options)) onChange(next);
    },
    [disabled, onChange, options, value],
  );

  const fraction = fractionOf(value, options);

  return useMemo(
    () => ({ trackRef, onKeyDown, onPointerDown, onPointerMove, onPointerUp, dragging, fraction }),
    [trackRef, onKeyDown, onPointerDown, onPointerMove, onPointerUp, dragging, fraction],
  );
}

export { apply, fractionOf, intentFor, snap, valueAt };
