import { computed, reactive, ref } from 'vue';
import { apply, fractionOf, intentFor, snap, valueAt } from '@ds/behavior/range-stepping';
import type { RangeOptions } from '@ds/behavior/range-stepping';

export type { RangeIntent, RangeOptions, RangeOrientation } from '@ds/behavior/range-stepping';

export interface RangeControl {
  /** Goes on the part the contract names as the `track`. It is what a pointer is measured against. */
  setTrack: (node: unknown) => void;
  /** Goes on the component's root, alongside the pointer handlers. */
  onKeyDown: (event: KeyboardEvent) => void;
  onPointerDown: (event: PointerEvent) => void;
  onPointerMove: (event: PointerEvent) => void;
  onPointerUp: (event: PointerEvent) => void;
  /** True while a pointer is held down and moving. The contract declares this an `internal` state. */
  dragging: boolean;
  /** Where the value sits along the track, 0..1. Draws the fill's length and the thumb's offset. */
  fraction: number;
}

/**
 * A number in a range, operated by keyboard and pointer.
 *
 * The arithmetic lives in @ds/behavior as pure functions, so it can be executed against the
 * conformance cases in `@ds/contracts/conformance/range-stepping.json`. This composable is the Vue
 * binding around it: the track's box, pointer capture, and the drag.
 *
 * RETURNS A `reactive` OBJECT, not a plain one holding refs. Vue unwraps a ref reached through a
 * `reactive` proxy but NOT one reached through a plain object, so `range.fraction` in a template
 * would otherwise render `[object Object]` — and render it without any error, which is the failure
 * mode this package exists to avoid. The React binding returns a memoised plain object because
 * React has no unwrapping to get wrong.
 *
 * `value` and `disabled` ARE GETTERS for the reason useDismissal explains.
 *
 * @param options  the contract's `range` block, plus min/max/step from the operated state
 * @param value    getter: the current number
 * @param onChange called with the next number
 * @param disabled getter: whether the control is inert
 */
export function useRangeControl(
  options: RangeOptions,
  value: () => number,
  onChange: (next: number) => void,
  disabled: () => boolean = () => false,
): RangeControl {
  const track = ref<HTMLElement | null>(null);
  const dragging = ref(false);

  // A Vue function ref is called with the element — or with a component instance, which is why the
  // parameter is `unknown` and narrowed here rather than typed as an element and trusted.
  const setTrack = (node: unknown) => {
    track.value = node instanceof HTMLElement ? node : null;
  };

  const fractionAt = (event: PointerEvent) => {
    const box = track.value?.getBoundingClientRect();
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
    if (!track.value) return;
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
    dragging.value = true;
    setFromPointer(event);
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!dragging.value) return;
    setFromPointer(event);
  };

  const onPointerUp = (event: PointerEvent) => {
    dragging.value = false;
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

  return reactive({
    setTrack,
    onKeyDown,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    dragging,
    fraction: computed(() => fractionOf(value(), options)),
  }) as RangeControl;
}

export { apply, fractionOf, intentFor as rangeIntentFor, snap, valueAt };
