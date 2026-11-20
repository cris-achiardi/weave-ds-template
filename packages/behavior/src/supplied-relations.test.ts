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
