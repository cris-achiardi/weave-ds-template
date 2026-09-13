// Drives the conformance cases in @ds/contracts against this backend's implementation.
//
// The cases are DATA, transcribed from the W3C ARIA APG and owned by the contracts package. This
// file is the React adapter for them: it reads the same JSON a Vue backend would read and asserts
// our pure core agrees with it. That is the whole argument for the conformance directory existing —
// without a second backend passing the same file, "agnostic" is an assertion.
//
// Cases that need a rendered DOM — the roving tab stop, entry via Tab, activation via Space — are
// marked below and driven in the browser instead. They are listed rather than silently skipped, so
// the gap between "tested here" and "verified somewhere" stays visible.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { intentFor, navigable, resolve, tabStop } from './linear-navigation.js';
import type { DisabledItems, Member, NavigationOptions, Orientation } from './linear-navigation.js';

interface Case {
  id: string;
  patterns: string[];
  given: {
    orientation?: Orientation;
    items?: string[];
    disabled?: string[];
    focused?: string;
    selected?: string | null;
    followsFocus?: boolean;
    disabledItems?: DisabledItems;
    focusWithin?: boolean;
  };
  press: string | null;
  expect: {
    focused?: string;
    selected?: string;
    handled?: boolean;
    tabbable?: string[];
    changed?: boolean;
  };
  apg: string;
}

const SUITE = JSON.parse(
  readFileSync(
    fileURLToPath(
      new URL('../../../contracts/conformance/linear-navigation.json', import.meta.url),
    ),
    'utf8',
  ),
) as { primitive: string; cases: Case[] };

/**
 * Cases whose assertion is about rendered output rather than about the decision logic. Each names
 * WHY, so this list cannot quietly become a dumping ground for anything inconvenient.
 */
// KNOWN GAP, and it is a finding rather than an oversight: unlike `dismissal.test.ts`, nothing
// asserts that a case listed here is ALSO flagged in the conformance data as needing a DOM —
// because `linear-navigation.json` carries no such flag on any case. So an id added below silences
// that case with no second opinion. Closing it means flagging these five in the contracts package,
// which is a framework-neutral artifact every backend reads, and belongs in its own change.
const NEEDS_A_BROWSER: Record<string, string> = {
  'entry-lands-on-the-selected-member': 'Tab into the collection — real focus order',
  'entry-with-nothing-selected-lands-on-first': 'Tab into the collection — real focus order',
  'exactly-one-member-in-the-tab-sequence': 'asserts rendered tabIndex attributes',
  'tabs-space-activates-when-focus-does-not': 'Space on a native button — platform activation',
  'reselecting-the-selected-member-is-inert': 'activation path, not navigation',
};

function optionsFor(c: Case): NavigationOptions {
  return {
    orientation: c.given.orientation ?? 'horizontal',
    wrap: true,
    followsFocus: c.given.followsFocus ?? true,
    disabledItems: c.given.disabledItems ?? 'skip',
    // Only the Home/End cases exercise this, and both declare the key they press.
    homeEnd: c.press === 'Home' || c.press === 'End',
  };
}

function membersFor(c: Case): Member[] {
  return (c.given.items ?? []).map((value) => ({
    value,
    disabled: (c.given.disabled ?? []).includes(value),
  }));
}

describe(`conformance: ${SUITE.primitive}`, () => {
  it('every case is either executed here or explicitly deferred to a browser', () => {
    const ids = SUITE.cases.map((c) => c.id);
    for (const deferred of Object.keys(NEEDS_A_BROWSER)) {
      expect(ids, `${deferred} is deferred but no longer exists in the suite`).toContain(deferred);
    }
  });

  for (const c of SUITE.cases) {
    if (c.id in NEEDS_A_BROWSER) {
      it.skip(`${c.id} — in a browser: ${NEEDS_A_BROWSER[c.id]}`, () => {});
      continue;
    }

    it(`${c.id} [apg: ${c.apg}]`, () => {
      const options = optionsFor(c);
      const members = membersFor(c);
      const intent = intentFor(c.press ?? '', options);

      // A case expecting `handled: false` asserts the key is NOT ours. Returning an intent for it
      // would mean consuming an event the APG says to leave alone.
      if (c.expect.handled === false) {
        expect(intent, `${c.press} must not be claimed`).toBeNull();
        return;
      }

      expect(intent, `${c.press} should map to an intent`).not.toBeNull();
      if (intent === null) return;

      const target = resolve(intent, c.given.focused ?? null, members, options);

      if (c.expect.focused !== undefined) {
        expect(target?.value, 'focus target').toBe(c.expect.focused);
      }

      if (c.expect.selected !== undefined) {
        const wouldSelect = options.followsFocus && target && !target.disabled;
        const selected = wouldSelect ? target.value : (c.given.selected ?? null);
        expect(selected, 'selection after the press').toBe(c.expect.selected);
      }
    });
  }
});

describe('linear-navigation: the parts the cases do not reach', () => {
  const base: NavigationOptions = {
    orientation: 'horizontal',
    wrap: true,
    followsFocus: true,
    disabledItems: 'skip',
  };

  it('leaves Home and End alone unless homeEnd is declared', () => {
    expect(intentFor('Home', base)).toBeNull();
    expect(intentFor('End', base)).toBeNull();
    expect(intentFor('Home', { ...base, homeEnd: true })).toBe('first');
  });

  it('claims no key that is not an arrow, Home or End', () => {
    for (const key of ['Enter', 'Escape', 'a', 'Tab', 'PageDown', 'F10']) {
      expect(intentFor(key, { ...base, orientation: 'both', homeEnd: true }), key).toBeNull();
    }
  });

  it('refuses to move rather than wrapping when wrap is false', () => {
    const members: Member[] = [
      { value: 'a', disabled: false },
      { value: 'b', disabled: false },
    ];
    expect(resolve('next', 'b', members, { ...base, wrap: false })).toBeNull();
    expect(resolve('next', 'b', members, base)?.value).toBe('a');
  });

  it('skips a run of consecutive disabled members', () => {
    const members: Member[] = [
      { value: 'a', disabled: false },
      { value: 'b', disabled: true },
      { value: 'c', disabled: true },
      { value: 'd', disabled: false },
    ];
    expect(resolve('next', 'a', members, base)?.value).toBe('d');
    expect(navigable(members, base)).toHaveLength(2);
    expect(navigable(members, { ...base, disabledItems: 'focusable' })).toHaveLength(4);
  });

  it('survives a collection where every member is disabled', () => {
    const members: Member[] = [{ value: 'a', disabled: true }];
    expect(resolve('next', null, members, base)).toBeNull();
    expect(tabStop(null, members, base)).toBe('a');
  });

  it('puts the tab stop on the selection, falling back to the first member', () => {
    const members: Member[] = [
      { value: 'a', disabled: false },
      { value: 'b', disabled: false },
    ];
    expect(tabStop('b', members, base)).toBe('b');
    expect(tabStop(null, members, base)).toBe('a');
    // A controlled value naming nothing rendered must not strand the collection outside the
    // tab order — the failure the RadioGroup contract warns about in its a11y notes.
    expect(tabStop('nope', members, base)).toBe('a');
  });

  it('does not park the tab stop on a member the arrows cannot reach', () => {
    const members: Member[] = [
      { value: 'a', disabled: false },
      { value: 'b', disabled: true },
    ];
    // Under `skip` the disabled selection is outside the arrow path, so the stop moves to a
    // member that is inside it. Under `focusable` the member IS reachable, and keeps the stop.
    expect(tabStop('b', members, base)).toBe('a');
    expect(tabStop('b', members, { ...base, disabledItems: 'focusable' })).toBe('b');
  });

  it('reads a set selection by its first entry, for a many-cardinality collection', () => {
    const members: Member[] = [
      { value: 'a', disabled: false },
      { value: 'b', disabled: false },
    ];
    expect(tabStop(['b'], members, base)).toBe('b');
    expect(tabStop([], members, base)).toBe('a');
  });
});
