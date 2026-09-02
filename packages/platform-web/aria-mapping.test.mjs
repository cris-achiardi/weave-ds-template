// Drives the conformance cases in ./conformance/aria-mapping.json against this package's resolver.
//
// Same arrangement as packages/react/src/behavior/linear-navigation.test.ts: the cases are DATA, and
// this file is one adapter for them. A Dart or Swift backend reads the same JSON, writes its own
// resolver, and runs the same cases — which is the only thing that makes "build your own emitter"
// a checkable claim rather than an invitation.
//
// Nothing here is deferred to a browser, and that is worth stating: every case is a decision about
// which attribute to write, not about what the attribute then does. A case here that needed a
// rendered DOM would mean the decision had leaked into the emitter.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ariaFitsRole, ariaValueFor, channelFor, loadProfile } from './resolve.mjs';

const PROFILE = loadProfile();
const SUITE = JSON.parse(
  readFileSync(fileURLToPath(new URL('./conformance/aria-mapping.json', import.meta.url)), 'utf8'),
);

describe(`conformance: ${SUITE.primitive}`, () => {
  for (const c of SUITE.cases) {
    it(`${c.id} [aria: ${c.aria}]`, () => {
      // A value-word case asserts the contract vocabulary → ARIA vocabulary mapping only.
      if (c.given.values) {
        expect(c.given.values.map((v) => ariaValueFor(v, PROFILE))).toEqual(c.expect.ariaValues);
        return;
      }

      const decision = channelFor(
        {
          state: c.given.state,
          element: c.given.element,
          role: c.given.role ?? null,
          hasValues: c.given.hasValues,
          hasValueType: c.given.hasValueType,
          mustStayFocusable: c.given.mustStayFocusable,
        },
        PROFILE,
      );

      expect(decision.channel, 'channel').toBe(c.expect.channel);
      expect(decision.attribute, 'attribute').toBe(c.expect.attribute ?? null);
      if (c.expect.rendersFalse !== undefined) {
        expect(decision.rendersFalse, 'rendersFalse').toBe(c.expect.rendersFalse);
      }
    });
  }
});

describe('the profile is internally consistent', () => {
  it('every ARIA attribute a state names has an entry in the aria table', () => {
    for (const [state, def] of Object.entries(PROFILE.states)) {
      if (state.startsWith('_') || !def.aria) continue;
      expect(PROFILE.aria, `${state} names ${def.aria}`).toHaveProperty(def.aria);
    }
  });

  it('every native attribute a state names is offered by at least one element', () => {
    const offered = new Set(
      Object.values(PROFILE.elements).flatMap((e) => e.nativeAttributes ?? []),
    );
    for (const [state, def] of Object.entries(PROFILE.states)) {
      if (state.startsWith('_') || !def.native) continue;
      expect(offered, `${state} names ${def.native}`).toContain(def.native);
    }
  });

  it('an attribute with no declared roles is unrestricted; a null role fails one that has them', () => {
    // The two halves of the rule that keeps aria-expanded off a roleless wrapper while still
    // letting aria-disabled onto one.
    expect(ariaFitsRole('aria-disabled', null, PROFILE), 'unrestricted').toBe(true);
    expect(ariaFitsRole('aria-expanded', null, PROFILE), 'restricted, no role').toBe(false);
    expect(ariaFitsRole('aria-expanded', 'button', PROFILE), 'restricted, fitting role').toBe(true);
    expect(ariaFitsRole('aria-selected', 'tabpanel', PROFILE), 'restricted, wrong role').toBe(
      false,
    );
  });

  it('every element that offers a native attribute also declares what it is', () => {
    for (const [name, facts] of Object.entries(PROFILE.elements)) {
      if (name.startsWith('_') || !facts.nativeAttributes) continue;
      expect(facts.nativeAttributes, `${name}`).toBeInstanceOf(Array);
      expect(facts.nativeAttributes.length, `${name}`).toBeGreaterThan(0);
    }
  });
});
