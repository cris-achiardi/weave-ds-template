// Public barrel for @ds/angular/behavior — the interaction primitives emitted components import.
//
// This is the ONE place this package ships runtime JavaScript, and the one place the "you own your
// generated component" rule bends. In short: what you can see, you own — markup, structure, theme.
// What must be correct, you depend on — focus, keyboard, selection.
//
// THE SAME THREE PRIMITIVES AS @ds/react/behavior AND @ds/vue/behavior, WITH THE SAME NAMES. The
// names come from the contract's behaviour vocabulary, and each maps to a behaviour the W3C ARIA
// APG defines normatively. The decision logic underneath is literally the same code (see the banner
// on dismissal.ts), and all three packages run it against the same conformance cases in
// @ds/contracts/conformance/.
//
// What differs is the binding, and it differs the same way Vue's does: every reactive input is a
// GETTER rather than a value, because an Angular class body runs once. There is one Angular-only
// addition — `useRangeControl` takes a getter for the TRACK ELEMENT too, because Angular resolves
// it with a `viewChild` query instead of handing the primitive a ref to attach.
//
// Keep this list alphabetical by primitive.

// --- dismissal: closing a region with a key or a press that is not activation
export { dismissesOnKey, dismissesOnPress, useDismissal } from './useDismissal.js';
export type { Dismissal, DismissalCause, DismissalOptions, PressTarget } from './useDismissal.js';

// --- linear navigation: moving between the members of a collection
export {
  navigable,
  navigationIntentFor,
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
  rangeIntentFor,
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
