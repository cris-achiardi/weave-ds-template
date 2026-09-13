// Drives the conformance cases in @ds/contracts against this backend's implementation.
//
// Same shape as linear-navigation.test.ts: the cases are DATA owned by the contracts package, and
// this file is the React backend's adapter for them. Unlike that suite, nothing here is deferred to
// a browser — range stepping is arithmetic, and a case that needed a rendered DOM would mean the
// arithmetic had leaked into the hook.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { apply, fractionOf, intentFor, snap, valueAt } from './range-stepping.js';
import type { RangeOptions, RangeOrientation } from './range-stepping.js';

interface Case {
  id: string;
  given: {
    min: number;
    max: number;
    step: number;
    value?: number;
    fraction?: number;
    pageStep?: number;
    orientation?: RangeOrientation;
  };
  press: string | null;
  expect: { value?: number; fraction?: number; handled?: boolean };
  apg: string;
}

const SUITE = JSON.parse(
  readFileSync(
    fileURLToPath(new URL('../../../contracts/conformance/range-stepping.json', import.meta.url)),
    'utf8',
  ),
) as { primitive: string; cases: Case[] };

function optionsFor(c: Case): RangeOptions {
  return {
    min: c.given.min,
    max: c.given.max,
    step: c.given.step,
    orientation: c.given.orientation ?? 'horizontal',
    pageStep: c.given.pageStep,
  };
}

describe(`conformance: ${SUITE.primitive}`, () => {
  for (const c of SUITE.cases) {
    it(`${c.id} [apg: ${c.apg}]`, () => {
      const options = optionsFor(c);

      // A pointer case: no key, a fraction along the track instead.
      if (c.press === null) {
        if (c.given.fraction !== undefined) {
          expect(valueAt(c.given.fraction, options), 'value at that point on the track').toBe(
            c.expect.value,
          );
        }
        if (c.expect.fraction !== undefined) {
          expect(fractionOf(c.given.value as number, options), 'fraction of that value').toBe(
            c.expect.fraction,
          );
        }
        return;
      }

      const intent = intentFor(c.press, options);

      // `handled: false` asserts the key is NOT ours. Returning an intent for it would mean
      // consuming an event the pattern never claimed.
      if (c.expect.handled === false) {
        expect(intent, `${c.press} must not be claimed`).toBeNull();
        return;
      }

      expect(intent, `${c.press} should map to an intent`).not.toBeNull();
      if (intent === null) return;
      expect(apply(intent, c.given.value as number, options), 'value after the press').toBe(
        c.expect.value,
      );
    });
  }
});

describe('range-stepping: the parts the cases do not reach', () => {
  const base: RangeOptions = { min: 0, max: 100, step: 1, orientation: 'horizontal' };

  it('snaps a value that is already allowed to itself', () => {
    expect(snap(40, base)).toBe(40);
    expect(snap(0, base)).toBe(0);
    expect(snap(100, base)).toBe(100);
  });

  it('survives a value that is not a number at all', () => {
    // `aria-valuenow={NaN}` renders as nothing and the thumb jumps to an unrelated place. A
    // controlled value is the consumer's, and this is the cheapest place to refuse to propagate it.
    expect(snap(Number.NaN, base)).toBe(0);
    expect(snap(Number.POSITIVE_INFINITY, base)).toBe(0);
  });

  it('keeps a fractional step exact across many presses', () => {
    const tenths: RangeOptions = { min: 0, max: 1, step: 0.1, orientation: 'horizontal' };
    let v = 0;
    for (let i = 0; i < 10; i += 1) v = apply({ by: 0.1 }, v, tenths);
    expect(v, 'ten presses of one tenth').toBe(1);
    expect(String(v)).not.toContain('999');
  });

  it('reports a fraction that stays inside 0..1 for an out-of-range value', () => {
    expect(fractionOf(-50, base)).toBe(0);
    expect(fractionOf(500, base)).toBe(1);
  });

  it('does not claim Page Up or Page Down unless a jump is declared', () => {
    expect(intentFor('PageUp', base)).toBeNull();
    expect(intentFor('PageDown', base)).toBeNull();
    expect(intentFor('PageUp', { ...base, pageStep: 10 })).toEqual({ by: 10 });
  });

  it('claims no key that is not an arrow, Home, End or a declared page key', () => {
    for (const key of ['Enter', ' ', 'Escape', 'a', 'Tab', 'F10', 'Backspace']) {
      expect(intentFor(key, { ...base, pageStep: 10 }), key).toBeNull();
    }
  });

  it('answers both axes for a vertical range too', () => {
    // Orientation governs the POINTER. Restricting the keyboard by it would be the tab list's
    // rule, and the APG deliberately does not give it to a slider.
    const vertical: RangeOptions = { ...base, orientation: 'vertical' };
    expect(intentFor('ArrowRight', vertical)).toEqual({ by: 1 });
    expect(intentFor('ArrowUp', vertical)).toEqual({ by: 1 });
  });
});
