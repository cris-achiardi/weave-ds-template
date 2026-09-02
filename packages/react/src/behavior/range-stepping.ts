// The pure core of range stepping: no React, no DOM, no side effects.
//
// Split from the hook for the same reason `linear-navigation.ts` is: everything below is a
// function from (key or pointer fraction, parameters, current value) to a number, so the
// conformance cases in packages/contracts/conformance/range-stepping.json can be executed against
// it directly rather than asserted by reading the code.
//
// The parameters are the contract's `range` block plus the operated state's `min`, `max` and
// `step`. If a name here drifts from a name there, the schema is the authority.

/** Which way the value increases under the POINTER. The keyboard answers both axes regardless. */
export type RangeOrientation = 'horizontal' | 'vertical';

export interface RangeOptions {
  min: number;
  max: number;
  step: number;
  orientation: RangeOrientation;
  /** How far Page Up and Page Down move. Undefined means those keys are not ours. */
  pageStep?: number;
}

/**
 * What a key press means, as a change to apply. `null` is load-bearing and not a failure case: it
 * means the key is not ours and the caller must NOT consume the event — the same rule the
 * navigation primitive follows, and the reason Tab still leaves a slider.
 */
export type RangeIntent = { by: number } | { to: 'min' } | { to: 'max' } | null;

/**
 * How many decimal places a step implies.
 *
 * Stepping by repeated addition drifts: 0.7 + 0.1 is 0.7999999999999999 in binary floating point,
 * and a slider that reports that through `aria-valuenow` is announced as that. Rounding to the
 * step's own precision is the cheap fix and is exact for every step a contract can write, because
 * a JSON number is decimal on the page.
 */
function precisionOf(step: number): number {
  const s = String(step);
  if (s.includes('e-')) return Number(s.split('e-')[1]);
  const dot = s.indexOf('.');
  return dot === -1 ? 0 : s.length - dot - 1;
}

/**
 * The nearest allowed value, counted in steps FROM THE MINIMUM and held inside the range.
 *
 * Two things this has to survive, both reachable from a legal contract and a controlled value:
 * a value between steps, and a value outside the range entirely. Clamping happens last so a wild
 * controlled value lands on an end rather than on the nearest step to somewhere far outside.
 */
export function snap(raw: number, options: RangeOptions): number {
  const { min, max, step } = options;
  if (!Number.isFinite(raw)) return min;
  const steps = Math.round((raw - min) / step);
  const at = Number((min + steps * step).toFixed(precisionOf(step)));
  if (at <= min) return min;
  // The maximum is not necessarily ON a step. With min 0, max 100 and step 30 the last allowed
  // value is 90, and reporting 100 would be a value the contract says cannot occur.
  const last = Number((min + Math.floor((max - min) / step) * step).toFixed(precisionOf(step)));
  return at >= last ? last : at;
}

/** Map a key to a change, given the declared range. */
export function intentFor(key: string, options: RangeOptions): RangeIntent {
  // All four arrows, whatever the orientation. The APG lists them for a slider without qualifying
  // them by axis, which is deliberately the opposite of the rule it gives a tab list.
  if (key === 'ArrowRight' || key === 'ArrowUp') return { by: options.step };
  if (key === 'ArrowLeft' || key === 'ArrowDown') return { by: -options.step };
  if (key === 'Home') return { to: 'min' };
  if (key === 'End') return { to: 'max' };
  // Page Up and Page Down are marked Optional. A contract that declares no jump has not asked for
  // them, so they are left alone and scroll the page.
  if (options.pageStep === undefined) return null;
  if (key === 'PageUp') return { by: options.pageStep };
  if (key === 'PageDown') return { by: -options.pageStep };
  return null;
}

/**
 * Apply an intent to the current value.
 *
 * The current value is snapped BEFORE the intent is applied, so one press brings an off-step or
 * out-of-range controlled value back inside the range rather than carrying the error forward.
 */
export function apply(intent: Exclude<RangeIntent, null>, current: number, options: RangeOptions) {
  const from = snap(current, options);
  if ('to' in intent)
    return intent.to === 'min' ? snap(options.min, options) : snap(options.max, options);
  return snap(from + intent.by, options);
}

/** Where along the track a value sits, as 0..1. This is the one number a backend needs to draw
 * both the fill's length and the thumb's offset. */
export function fractionOf(value: number, options: RangeOptions): number {
  const { min, max } = options;
  // A minimum equal to its maximum is a legal contract, and the obvious arithmetic divides by zero.
  if (max === min) return 0;
  const at = snap(value, options);
  return Math.min(1, Math.max(0, (at - min) / (max - min)));
}

/**
 * The value at a fraction along the track, snapped to the NEAREST step.
 *
 * Nearest rather than floor: a thumb dragged to 0.46 of a ten-step range is closer to 50 than to
 * 40, and flooring would make the thumb lag behind the pointer by up to a whole step.
 *
 * The fraction is not clamped by the caller because a pointer keeps sending coordinates after it
 * leaves the track — a drag that continues past the end arrives here as a number above 1.
 */
export function valueAt(fraction: number, options: RangeOptions): number {
  const { min, max } = options;
  const f = Math.min(1, Math.max(0, fraction));
  return snap(min + f * (max - min), options);
}
