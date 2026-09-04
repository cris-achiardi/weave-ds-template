// Public barrel for @ds/react/behavior — the interaction primitives emitted components import.
//
// This is the ONE place this package ships runtime JavaScript, and the one place the "you own your
// generated component" rule bends. The reasoning, including the honest objection to it, is in
// ./README.md. In short: what you can see, you own — markup, structure, theme. What must be
// correct, you depend on — focus, keyboard, selection.
//
// A primitive lands here only when a contract can declare it. Each one corresponds to a named
// entry in the contract layer's behaviour vocabulary, and each maps to a behaviour the W3C ARIA
// APG defines normatively, so the specification work is citation rather than invention.
//
// Every primitive answers "what does this key mean" with a function that may return null, and each
// of those is called `intentFor` inside its own module. They are exported here under distinct
// names: two primitives may be used by one component, and a bare `intentFor` would then be
// ambiguous at the import site rather than at the definition.
//
// Keep this list alphabetical by primitive.

// --- dismissal: closing a region with a key or a press that is not activation
export { dismissesOnKey, dismissesOnPress, useDismissal } from './useDismissal.js';
export type { Dismissal, DismissalCause, DismissalOptions, PressTarget } from './useDismissal.js';

// --- linear navigation: moving between the members of a collection
export {
  intentFor as navigationIntentFor,
  navigable,
  resolve,
  tabStop,
  useLinearNavigation,
} from './useLinearNavigation.js';
export type {
  DisabledItems,
  LinearNavigation,
  Member,
  MemberRegistration,
  NavigationOptions,
  Orientation,
} from './useLinearNavigation.js';

// --- range stepping: moving a number within a bounded, stepped range
export {
  apply,
  fractionOf,
  intentFor as rangeIntentFor,
  snap,
  useRangeControl,
  valueAt,
} from './useRangeControl.js';
export type {
  RangeControl,
  RangeIntent,
  RangeOptions,
  RangeOrientation,
} from './useRangeControl.js';
