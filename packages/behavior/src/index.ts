// The decision logic behind the interaction primitives. No framework, no DOM, no side effects.
//
// WHY THIS PACKAGE EXISTS, and it is a correction rather than a design.
//
// These three modules lived in `packages/react/src/behavior/` and were COPIED into the Vue and
// Angular packages when those backends were built. The copying was deliberate: the experiment was
// to measure what a second backend costs, and moving shared code into a shared place while building
// the thing that proves it is shared destroys the measurement. `pnpm verify:parity` gated the
// copies against drift in the meantime.
//
// That measurement is taken — docs/research/0004 and 0005 — and at three copies the reason had run
// out. This is the move those reports named.
//
// WHY NOT `@ds/platform-web`. That package's rule is "if it would still be true in a Vue, Svelte or
// Lit backend rendering the same DOM, it belongs here". These pass that test and then keep going:
// what Escape means, which member an arrow key moves to, where a number lands when you step it —
// none of that needs a DOM at all, and all of it would be true in React Native. They are MORE
// agnostic than the web profile, so a home inside it would have been a demotion.
//
// WHY NOT `@ds/contracts`. That package is the specification and ships JSON. The conformance cases
// these satisfy already live there, in `conformance/`. This is the executable reference
// implementation of those cases — a different kind of artifact, and keeping it out is what lets a
// consumer hold the contract set without holding any code at all.
//
// Each framework package wraps these in its own binding and re-exports them under the same names,
// so an emitted component imports `@ds/react/behavior` rather than reaching in here.
//
// `intentFor` EXISTS TWICE and is exported under two names. Two primitives may be used by one
// component, and a bare `intentFor` would then be ambiguous at the import site rather than at the
// definition. The subpath exports (`@ds/behavior/linear-navigation`) expose the original names for
// anyone who wants them.

// --- dismissal: closing a region with a key or a press that is not activation
export { dismissesOnKey, dismissesOnPress } from './dismissal.js';
export type { DismissalCause, DismissalOptions, PressTarget } from './dismissal.js';

// --- linear navigation: moving between the members of a collection
export {
  intentFor as navigationIntentFor,
  navigable,
  resolve,
  tabStop,
} from './linear-navigation.js';
export type {
  DisabledItems,
  Intent,
  Member,
  NavigationOptions,
  Orientation,
} from './linear-navigation.js';

// --- range stepping: moving a number within a bounded, stepped range
export { apply, fractionOf, intentFor as rangeIntentFor, snap, valueAt } from './range-stepping.js';
export type { RangeIntent, RangeOptions, RangeOrientation } from './range-stepping.js';
