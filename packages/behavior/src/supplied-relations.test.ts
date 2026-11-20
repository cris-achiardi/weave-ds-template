// The ownership policy for relations written on a consumer-supplied element (#35, #46).
// A fake element is enough: the core touches nothing but three attribute methods.

import { describe, expect, it } from 'vitest';
import {
  applyRelations,
  mergeTokens,
  relationWriter,
  releaseRelations,
  resolvedId,
} from './supplied-relations.js';

function fake(initial: Record<string, string> = {}) {
  const attrs = new Map(Object.entries(initial));
  return {
    attrs,
    getAttribute: (n: string) => attrs.get(n) ?? null,
    setAttribute: (n: string, v: string) => void attrs.set(n, v),
    removeAttribute: (n: string) => void attrs.delete(n),
  };
}

describe('mergeTokens', () => {
  it('keeps consumer tokens first, then appends owned ones without duplicates', () => {
    expect(mergeTokens('hint mine', ['f-desc', 'mine', null, false, 'f-err'])).toBe(
      'hint mine f-desc f-err',
    );
  });
  it('drops only previously owned tokens', () => {
    expect(mergeTokens('hint f-desc f-err', ['f-desc'], ['f-desc', 'f-err'])).toBe('hint f-desc');
  });
  it('returns null when nothing is left', () => {
    expect(mergeTokens('', [])).toBeNull();
    expect(mergeTokens('f-err', [], ['f-err'])).toBeNull();
  });
});

describe('resolvedId', () => {
  it('prefers the consumer id', () => {
    expect(resolvedId('mine', 'fallback')).toBe('mine');
    expect(resolvedId(undefined, 'fallback')).toBe('fallback');
    expect(resolvedId('', null)).toBeNull();
  });
});

describe('applyRelations', () => {
  it('writes id, relations and invalid onto a bare element', () => {
    const el = fake();
    applyRelations(el, {
      id: 'f-control',
      labelledBy: ['f-label'],
      describedBy: ['f-desc'],
      invalid: true,
    });
    expect(Object.fromEntries(el.attrs)).toEqual({
      id: 'f-control',
      'aria-labelledby': 'f-label',
      'aria-describedby': 'f-desc',
      'aria-invalid': 'true',
    });
  });

  it('never replaces a consumer id', () => {
    const el = fake({ id: 'mine' });
    const applied = applyRelations(el, { id: 'f-control' });
    expect(el.attrs.get('id')).toBe('mine');
    releaseRelations(el, applied);
    expect(el.attrs.get('id')).toBe('mine');
  });

  it('follows state changes and removes only its own tokens', () => {
    const el = fake({ 'aria-describedby': 'hint' });
    let applied = applyRelations(el, { describedBy: ['f-desc', 'f-err'], invalid: true });
    expect(el.attrs.get('aria-describedby')).toBe('hint f-desc f-err');
    applied = applyRelations(el, { describedBy: ['f-desc', null], invalid: false }, applied);
    expect(el.attrs.get('aria-describedby')).toBe('hint f-desc');
    expect(el.attrs.has('aria-invalid')).toBe(false);
    // Idempotent.
    applied = applyRelations(el, { describedBy: ['f-desc', null] }, applied);
    expect(el.attrs.get('aria-describedby')).toBe('hint f-desc');
    releaseRelations(el, applied);
    expect(Object.fromEntries(el.attrs)).toEqual({ 'aria-describedby': 'hint' });
  });

  it('restores a consumer aria-invalid it overwrote', () => {
    const el = fake({ 'aria-invalid': 'grammar' });
    let applied = applyRelations(el, { invalid: true });
    expect(el.attrs.get('aria-invalid')).toBe('true');
    applied = applyRelations(el, { invalid: true }, applied);
    applied = applyRelations(el, { invalid: false }, applied);
    expect(el.attrs.get('aria-invalid')).toBe('grammar');
  });

  it('removes a generated id on release', () => {
    const el = fake();
    const applied = applyRelations(el, { id: 'f-control', labelledBy: ['f-label'] });
    releaseRelations(el, applied);
    expect(el.attrs.size).toBe(0);
  });

  // PR #53 review: a requested token the consumer already had was recorded as owned and stripped.
  it('never claims a token the consumer already had', () => {
    const el = fake({ 'aria-describedby': 'consumer shared' });
    let applied = applyRelations(el, { describedBy: ['shared', 'f-desc'] });
    expect(el.attrs.get('aria-describedby')).toBe('consumer shared f-desc');
    expect(applied.describedBy).toEqual(['f-desc']);
    applied = applyRelations(el, { describedBy: ['shared'] }, applied);
    expect(el.attrs.get('aria-describedby')).toBe('consumer shared');
    releaseRelations(el, applied);
    expect(el.attrs.get('aria-describedby')).toBe('consumer shared');
  });

  it('keeps a consumer labelled-by that equals the component label id', () => {
    const el = fake({ 'aria-labelledby': 'consumer-label' });
    const applied = applyRelations(el, { labelledBy: ['consumer-label'] });
    releaseRelations(el, applied);
    expect(el.attrs.get('aria-labelledby')).toBe('consumer-label');
  });

  // PR #53 review: the saved prior was restored over a value the consumer set during attachment.
  it('keeps a consumer aria-invalid written after the component wrote its own', () => {
    const el = fake({ 'aria-invalid': 'grammar' });
    let applied = applyRelations(el, { invalid: true });
    el.setAttribute('aria-invalid', 'spelling');
    releaseRelations(el, applied);
    expect(el.attrs.get('aria-invalid')).toBe('spelling');

    // Same while still attached: becoming valid leaves the consumer's newer value alone…
    const other = fake({ 'aria-invalid': 'grammar' });
    applied = applyRelations(other, { invalid: true });
    other.setAttribute('aria-invalid', 'spelling');
    applied = applyRelations(other, { invalid: false }, applied);
    expect(other.attrs.get('aria-invalid')).toBe('spelling');
    // …and re-asserting invalid saves THAT value as the one to restore.
    applied = applyRelations(other, { invalid: true }, applied);
    expect(other.attrs.get('aria-invalid')).toBe('true');
    releaseRelations(other, applied);
    expect(other.attrs.get('aria-invalid')).toBe('spelling');
  });

  it('does not remove an aria-invalid the consumer removed and re-added', () => {
    const el = fake();
    const applied = applyRelations(el, { invalid: true });
    el.setAttribute('aria-invalid', 'false');
    releaseRelations(el, applied);
    expect(el.attrs.get('aria-invalid')).toBe('false');
  });
});

describe('relationWriter', () => {
  it('releases an element that left the slot and wires its replacement', () => {
    const writer = relationWriter<ReturnType<typeof fake>>();
    const first = fake({ 'aria-describedby': 'hint' });
    const second = fake();
    writer.write([[first, { id: 'f-control', describedBy: ['f-desc'] }]]);
    expect(first.attrs.get('aria-describedby')).toBe('hint f-desc');
    writer.write([[second, { id: 'f-control', describedBy: ['f-desc'] }]]);
    expect(Object.fromEntries(first.attrs)).toEqual({ 'aria-describedby': 'hint' });
    expect(Object.fromEntries(second.attrs)).toEqual({
      id: 'f-control',
      'aria-describedby': 'f-desc',
    });
    writer.release();
    expect(second.attrs.size).toBe(0);
  });
});

// #36: a WC member that realizes its root on its host writes role, state and the tab -> panel
// relation onto that consumer-owned host. Same ownership rules as the supplied-control case.
describe('owned attributes and aria-controls (#36)', () => {
  it('writes aria-controls like the other IDREF lists, keeping consumer tokens first', () => {
    const el = fake({ 'aria-controls': 'theirs' });
    const done = applyRelations(el, { controls: ['panel-1'] });
    expect(el.attrs.get('aria-controls')).toBe('theirs panel-1');
    const moved = applyRelations(el, { controls: ['panel-2'] }, done);
    expect(el.attrs.get('aria-controls')).toBe('theirs panel-2');
    releaseRelations(el, moved);
    expect(el.attrs.get('aria-controls')).toBe('theirs');
  });

  it('writes owned attributes and removes on release only what it added', () => {
    const el = fake();
    const done = applyRelations(el, {
      attributes: { role: 'tab', 'aria-selected': 'false', tabindex: '-1' },
    });
    expect(Object.fromEntries(el.attrs)).toEqual({
      role: 'tab',
      'aria-selected': 'false',
      tabindex: '-1',
    });
    const next = applyRelations(
      el,
      { attributes: { role: 'tab', 'aria-selected': 'true', tabindex: '0' } },
      done,
    );
    expect(el.attrs.get('aria-selected')).toBe('true');
    releaseRelations(el, next);
    expect(el.attrs.size).toBe(0);
  });

  it("restores a consumer's value it overwrote, and drops an attribute no longer wanted", () => {
    const el = fake({ tabindex: '3', 'aria-disabled': 'false' });
    const done = applyRelations(el, { attributes: { tabindex: '0', 'aria-disabled': 'true' } });
    expect(el.attrs.get('tabindex')).toBe('0');
    const enabled = applyRelations(
      el,
      { attributes: { tabindex: '0', 'aria-disabled': null } },
      done,
    );
    expect(el.attrs.get('aria-disabled')).toBe('false');
    releaseRelations(el, enabled);
    expect(el.attrs.get('tabindex')).toBe('3');
  });

  it('leaves a value the consumer set after the component wrote its own', () => {
    const el = fake();
    const done = applyRelations(el, { attributes: { role: 'tab' } });
    el.setAttribute('role', 'presentation');
    releaseRelations(el, done);
    expect(el.attrs.get('role')).toBe('presentation');
  });
});
