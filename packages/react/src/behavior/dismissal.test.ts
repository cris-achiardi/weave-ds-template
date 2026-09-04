// Drives the conformance cases in @ds/contracts against this backend's implementation.
//
// Same arrangement as the other two primitives: the cases are DATA owned by the contracts package,
// and this file is the React adapter for them.
//
// NOTHING IS DEFERRED TO A BROWSER, and that is deliberate rather than lucky. Dismissal is two
// questions — is this key Escape, and did this press land on the region itself — and both are
// answerable from plain values. A case here that needed a rendered DOM would mean the decision had
// leaked out of the pure core and into the hook.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { dismissesOnKey, dismissesOnPress } from './dismissal.js';
import type { DismissalCause, DismissalOptions } from './dismissal.js';

interface Case {
  id: string;
  patterns: string[];
  given: { state: string; on: DismissalCause[]; isOpen: boolean };
  press: string | null;
  pointer?: { target: 'region' | 'descendant' | 'nested-descendant'; button: string };
  expect: { dismissed: boolean; handled: boolean };
  apg: string;
}

const SUITE = JSON.parse(
  readFileSync(
    fileURLToPath(new URL('../../../contracts/conformance/dismissal.json', import.meta.url)),
    'utf8',
  ),
) as { primitive: string; cases: Case[] };

describe(`conformance: ${SUITE.primitive}`, () => {
  for (const c of SUITE.cases) {
    it(`${c.id} [apg: ${c.apg}]`, () => {
      const options: DismissalOptions = { on: c.given.on };

      if (c.press !== null) {
        const dismissed = dismissesOnKey(c.press, c.given.isOpen, options);
        expect(dismissed, 'dismissed').toBe(c.expect.dismissed);
        // For this primitive the two are the same fact: it consumes an event exactly when it acts
        // on it. Asserting both keeps the case data honest if that ever stops being true.
        expect(dismissed, 'handled').toBe(c.expect.handled);
        return;
      }

      const pointer = c.pointer;
      if (!pointer) throw new Error(`${c.id} has neither a press nor a pointer`);

      // `descendant` and `nested-descendant` are both simply "not the region". The distinction is
      // in the case data because a backend comparing against direct children only would pass one
      // and fail the other; the pure core sees no difference, which is the point.
      const target = pointer.target === 'region' ? 'region' : 'inside';
      const dismissed = dismissesOnPress(
        target,
        pointer.button === 'primary',
        c.given.isOpen,
        options,
      );
      expect(dismissed, 'dismissed').toBe(c.expect.dismissed);
      expect(dismissed, 'handled').toBe(c.expect.handled);
    });
  }
});

describe('dismissal: the parts the cases do not reach', () => {
  const both: DismissalOptions = { on: ['escape', 'outside-press'] };

  it('claims no key but Escape, whatever is declared', () => {
    for (const key of ['Enter', ' ', 'Tab', 'ArrowDown', 'Escape ', 'escape', 'Esc']) {
      expect(dismissesOnKey(key, true, both), key).toBe(false);
    }
    expect(dismissesOnKey('Escape', true, both)).toBe(true);
  });

  it('treats `on` as a set, so neither cause disables the other', () => {
    expect(dismissesOnKey('Escape', true, both)).toBe(true);
    expect(dismissesOnPress('region', true, true, both)).toBe(true);
  });

  it('refuses every cause while closed', () => {
    expect(dismissesOnKey('Escape', false, both)).toBe(false);
    expect(dismissesOnPress('region', true, false, both)).toBe(false);
  });

  it('survives an empty cause list rather than assuming a default', () => {
    const none: DismissalOptions = { on: [] };
    expect(dismissesOnKey('Escape', true, none)).toBe(false);
    expect(dismissesOnPress('region', true, true, none)).toBe(false);
  });
});
