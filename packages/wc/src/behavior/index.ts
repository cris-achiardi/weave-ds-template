// Public barrel for @ds/wc/behavior — the interaction primitives emitted components import.
//
// THE SAME THREE PRIMITIVES AS EVERY OTHER BACKEND, WITH THE SAME NAMES, wrapping the same shared
// decision logic in @ds/behavior. `pnpm verify:parity` asserts this list matches the others, because
// a barrel that drifts makes an emitted component compile against one backend and not another.
//
// This is the shortest of the four bindings, and the reason is worth stating: there is no reactivity
// system to satisfy. Two of the three are a closure over a `let` and a couple of functions. The one
// place that costs something is `useRangeControl`, which takes an `onDirty` callback — the component
// has to be told when internal state changed, which is what a reactivity system does for the other
// three.
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
