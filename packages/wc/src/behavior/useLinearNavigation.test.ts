// Registration bookkeeping, and nothing else.
//
// THIS FILE EXISTS BECAUSE OF A SHIPPED BUG THAT FROZE THE BROWSER TAB IT RENDERED IN, and it is
// deliberately narrow: the arrow-key decisions are already covered by the conformance cases in
// `@ds/contracts/conformance/linear-navigation.json`, which execute against `@ds/behavior`. What
// those cases cannot see is the BINDING around them, and that is where the defect was.
//
// The loop, in full:
//
//   a member re-registers with its collection from its own `#update()`
//   -> the collection announced a change
//   -> the announcement makes every member `#update()`
//   -> every member re-registers
//   -> forever
//
// The React, Vue and Angular bindings never had it, because each compares the incoming entry
// against the stored one to decide whether to bump its reactivity counter. This binding has no
// counter, so the comparison was dropped as unnecessary — and the comparison was the part that
// mattered. `register` now reports whether anything a reader depends on actually MOVED, and the
// generated collection announces only then.
//
// No DOM here on purpose. The registry is a Map and the answer is a comparison, which is exactly
// the split the pure cores are built on: if a case needed a rendered tree, the decision would have
// leaked somewhere it should not be.

import { describe, expect, it } from 'vitest';
import { useLinearNavigation } from './useLinearNavigation.js';
import type { NavigationOptions } from './useLinearNavigation.js';

const OPTIONS: NavigationOptions = {
  orientation: 'horizontal',
  wrap: true,
  followsFocus: true,
  disabledItems: 'focusable',
  homeEnd: true,
};

/** A stand-in for a member's host element. Nothing here reads it. */
const el = () => ({}) as HTMLElement;

const nav = () =>
  useLinearNavigation(
    OPTIONS,
    () => '',
    () => {},
  );

describe('register reports whether anything moved', () => {
  it('a member the collection has never seen has moved', () => {
    const n = nav();
    expect(n.register('a', { element: el(), disabled: false })).toBe(true);
  });

  it('THE REGRESSION: re-registering an unchanged member has NOT moved', () => {
    const n = nav();
    const element = el();
    n.register('a', { element, disabled: false });
    // A member calls this from every `#update()`. Answering `true` here is what looped.
    expect(n.register('a', { element, disabled: false })).toBe(false);
    expect(n.register('a', { element, disabled: false })).toBe(false);
  });

  it('a member whose disabled state changed has moved', () => {
    const n = nav();
    const element = el();
    n.register('a', { element, disabled: false });
    expect(n.register('a', { element, disabled: true })).toBe(true);
    // ...and is then stable again.
    expect(n.register('a', { element, disabled: true })).toBe(false);
  });

  it('a member whose element was replaced has moved', () => {
    const n = nav();
    n.register('a', { element: el(), disabled: false });
    expect(n.register('a', { element: el(), disabled: false })).toBe(true);
  });

  it('unregister reports whether the member was there', () => {
    const n = nav();
    n.register('a', { element: el(), disabled: false });
    expect(n.unregister('a')).toBe(true);
    // A member that disconnects twice — which happens when a collection is torn down — must not
    // announce the second time either.
    expect(n.unregister('a')).toBe(false);
  });
});

describe('isTabStop survives an empty registry', () => {
  it('answers without a member registered', () => {
    // A collection renders before its members connect, and asked this in that window.
    expect(nav().isTabStop('a')).toBe(false);
  });
});
