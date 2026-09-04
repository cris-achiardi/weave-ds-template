// Drives the conformance cases in @ds/contracts against this backend's implementation.
//
// Same arrangement as the other two primitives: the cases are DATA owned by the contracts package,
// and this file is the React adapter for them.
//
// THREE CASES ARE DEFERRED TO A BROWSER, and an earlier version of this file claimed none were.
// That claim was wrong in a way that cost a shipped bug: whether a point falls inside an element's
// box is NOT answerable from plain values, so the mapping from a real event to the word `region`
// was never tested here at all. Every executable case passed while a press on the dialog's own
// padding closed it.
//
// READ "DEFERRED TO A BROWSER" LITERALLY: there is no browser lane in this repo. No jsdom, no
// happy-dom, no Playwright — `vitest` runs in node and these three cases run NOWHERE automated.
// They were verified by HAND, once, on the sandbox Dialog, and that is the same standard
// `apps/sandbox/src/status.ts` holds every verdict to. So a regression in exactly the code that
// fixed the padding bug would not redden anything; it would need someone to press the panel again.
//
// That is a real gap and it is recorded rather than papered over — `CROSS_CUTTING` in status.ts
// carries it too, because `linear-navigation.test.ts` defers five cases on the same terms. Building
// the lane is its own work with its own decision about which runner; skipping straight to it here
// would have been a second unreviewed change in a file that just had a bug.
//
// The deferred cases are listed below with a reason each, following the pattern
// `linear-navigation.test.ts` established, so the gap between "tested here" and "verified
// somewhere" stays visible instead of looking like completeness.

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
  pointer?: { target: string; button: string; releasedOn?: string };
  expect: { dismissed: boolean; handled: boolean };
  apg: string;
  needsARenderedDOM?: boolean;
}

/**
 * Cases whose assertion is about GEOMETRY or event sequencing rather than about the decision logic.
 * Each names why, so this list cannot quietly become a dumping ground for anything inconvenient.
 */
const NEEDS_A_BROWSER: Record<string, string> = {
  'a-press-on-the-regions-own-padding-does-not-dismiss':
    'a point inside the box, on the element itself — geometry, not a decision',
  'a-press-on-a-child-outside-the-regions-box-does-not-dismiss':
    'a descendant rendered outside its parent box — geometry again',
  'a-press-beginning-on-the-backdrop-and-released-inside-does-not-dismiss':
    'press and release on different targets — the event sequence a click collapses',
};

const SUITE = JSON.parse(
  readFileSync(
    fileURLToPath(new URL('../../../contracts/conformance/dismissal.json', import.meta.url)),
    'utf8',
  ),
) as { primitive: string; cases: Case[] };

describe(`conformance: ${SUITE.primitive}`, () => {
  it('every case is either executed here or explicitly deferred to a browser', () => {
    const ids = SUITE.cases.map((c) => c.id);
    for (const deferred of Object.keys(NEEDS_A_BROWSER)) {
      expect(ids, `${deferred} is deferred but no longer exists in the suite`).toContain(deferred);
      // AND THE DATA HAS TO AGREE THAT IT NEEDS A DOM. Without this, adding an id and a sentence
      // to the map above silences any case at all — which is the dumping ground its own comment
      // says it must not become. The flag lives in the contracts package, so silencing a case now
      // takes an edit a backend cannot make alone.
      expect(
        SUITE.cases.find((c) => c.id === deferred)?.needsARenderedDOM,
        `${deferred} is deferred here but the suite does not flag it needsARenderedDOM`,
      ).toBe(true);
    }
    // And the reverse, which the navigation suite does not assert: a case flagged in the DATA as
    // needing a DOM must be named here with a reason, so one cannot be added and silently skipped.
    for (const c of SUITE.cases) {
      if (c.needsARenderedDOM) {
        expect(
          NEEDS_A_BROWSER,
          `${c.id} is flagged needsARenderedDOM but names no reason`,
        ).toHaveProperty(c.id);
      }
    }
  });

  for (const c of SUITE.cases) {
    if (c.id in NEEDS_A_BROWSER) {
      it.skip(`${c.id} — in a browser: ${NEEDS_A_BROWSER[c.id]}`, () => {});
      continue;
    }
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
