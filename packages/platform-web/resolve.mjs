// Pure functions over profile.json. No framework, no DOM, no side effects.
//
// Split from the data for the same reason `packages/react/src/behavior/linear-navigation.ts` is
// split from its hook: everything below is a function from (situation, profile) to a decision, so
// the cases in ./conformance/aria-mapping.json can be executed against it directly rather than
// asserted by reading an emitter.
//
// The DATA is the specification. This file is a convenience for JavaScript backends — a Dart or
// Swift emitter reads the same profile.json and writes its own resolver, then runs the same cases.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** The only I/O in this module, kept at the top so the rest is provably pure. */
export function loadProfile() {
  return JSON.parse(
    readFileSync(fileURLToPath(new URL('./profile.json', import.meta.url)), 'utf8'),
  );
}

// ---------------------------------------------------------------------------------------
// element facts
// ---------------------------------------------------------------------------------------

/** Never null: an element this profile does not describe simply has no capabilities. */
export const elementFacts = (element, profile) => profile.elements[element] ?? {};

/** The ARIA role this element already announces, so a backend does not restate it. */
export const implicitRole = (element, profile) =>
  elementFacts(element, profile).implicitRole ?? null;

/**
 * Whether an ARIA STATE attribute may attach to this element when the contract names no role.
 *
 * Deliberately NOT derived from `implicitRole`, though they look like the same fact. They answer
 * opposite questions — one suppresses a `role` attribute, the other admits an ARIA state — and the
 * profile records two elements where they disagree. See the `_note` on `textarea`.
 */
export const bearsRole = (element, profile) => elementFacts(element, profile).bearsRole === true;

export const isNativelyFocusable = (element, profile) =>
  elementFacts(element, profile).focusable === true;

export const isVoid = (element, profile) => elementFacts(element, profile).void === true;

export const editsOwnValue = (element, profile) =>
  elementFacts(element, profile).editsOwnValue === true;

export const submitsByDefault = (element, profile) =>
  elementFacts(element, profile).submitsByDefault === true;

/** How this element is shown and hidden. `mode: 'attribute'` is the default for everything else. */
export const visibilityOf = (element, profile) =>
  elementFacts(element, profile).visibility ?? { mode: 'attribute' };

/** @param kind {'container' | 'activatable'} */
export const defaultElement = (kind, profile) => profile.defaults[kind];

// ---------------------------------------------------------------------------------------
// vocabulary: a contract's word, and the platform's
// ---------------------------------------------------------------------------------------

export const ariaAttributeFor = (state, profile) => profile.states[state]?.aria ?? null;

export const pseudoClassFor = (state, profile) => profile.states[state]?.pseudo ?? null;

export const relationAttribute = (relation, profile) => profile.relations[relation] ?? null;

/** A value word the profile does not map passes through unchanged rather than being dropped. */
export const ariaValueFor = (word, profile) => profile.valueWords[word] ?? word;

/** The native attribute for a state, but only where THIS element actually has one. */
export function nativeAttributeFor(state, element, profile) {
  const attribute = profile.states[state]?.native;
  if (!attribute) return null;
  return (elementFacts(element, profile).nativeAttributes ?? []).includes(attribute)
    ? attribute
    : null;
}

// ---------------------------------------------------------------------------------------
// the ARIA specification
// ---------------------------------------------------------------------------------------

/**
 * Whether this ARIA attribute is defined for this role.
 *
 * An attribute with no declared roles is unrestricted. A role of `null` fails any attribute that
 * DOES declare roles — which is what keeps `aria-expanded` off a roleless wrapper.
 */
export function ariaFitsRole(attribute, role, profile) {
  const roles = profile.aria[attribute]?.roles;
  if (!roles) return true;
  return role !== null && role !== undefined && roles.includes(role);
}

/**
 * Whether this attribute's `false` is meaningful and must be rendered rather than omitted.
 *
 * A switch that drops `aria-checked` when off is announced as having no on/off state at all,
 * which is worse than being announced as off.
 */
export const rendersFalse = (attribute, profile) => profile.aria[attribute]?.rendersFalse === true;

// ---------------------------------------------------------------------------------------
// the one decision
// ---------------------------------------------------------------------------------------

/**
 * Which channel a contract state reaches the DOM through.
 *
 * The BRANCH ORDER is load-bearing in three places and is the thing the conformance cases exist to
 * pin down:
 *   - a valued state resolves to ARIA before the native attribute is considered;
 *   - `mustStayFocusable` outranks the native attribute, because a natively disabled element cannot
 *     be focused by any means and the APG requires some disabled members to stay reachable;
 *   - a `valueType` state resolves to NOTHING before the data fallback, because free text is
 *     content and mirroring it into an attribute leaks whatever the person typed.
 *
 * @typedef {object} Situation
 * @property {string} state
 * @property {string} element
 * @property {string|null} role
 * @property {boolean} [hasValues]           the state is an enumeration
 * @property {boolean} [hasValueType]        the state is free text or a number
 * @property {boolean} [mustStayFocusable]   arrows must still land here
 *
 * @typedef {object} Decision
 * @property {'native'|'aria'|'data'|'none'} channel
 * @property {string|null} attribute
 * @property {boolean|null} rendersFalse
 *
 * @returns {Decision}
 */
export function channelFor(situation, profile) {
  const { state, element, role = null, hasValues, hasValueType, mustStayFocusable } = situation;
  const aria = ariaAttributeFor(state, profile);

  // `disabled` is the single state allowed to reach ARIA with no role at all. It is an exception,
  // recorded as one rather than generalised away.
  const ariaOk =
    Boolean(aria) &&
    (Boolean(role) || bearsRole(element, profile) || state === 'disabled') &&
    ariaFitsRole(aria, role, profile);

  if (hasValues && ariaOk) return { channel: 'aria', attribute: aria, rendersFalse: null };
  if (state === 'disabled' && mustStayFocusable && ariaOk) {
    return { channel: 'aria', attribute: aria, rendersFalse: false };
  }

  const native = nativeAttributeFor(state, element, profile);
  if (native) return { channel: 'native', attribute: native, rendersFalse: true };

  if (ariaOk)
    return { channel: 'aria', attribute: aria, rendersFalse: rendersFalse(aria, profile) };
  if (hasValueType) return { channel: 'none', attribute: null, rendersFalse: null };
  return { channel: 'data', attribute: null, rendersFalse: Boolean(hasValues) };
}
