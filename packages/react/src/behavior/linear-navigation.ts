// The pure core of linear navigation: no React, no DOM, no side effects.
//
// It is separated from the hook on purpose. Everything below is a function from (key, parameters,
// member list) to a decision, which means the conformance cases in
// packages/contracts/conformance/linear-navigation.json can be executed against it directly
// instead of being asserted by reading the code.
//
// The parameters are the contract's `collection.navigation` block, one for one. If a name here
// drifts from a name there, the schema is the authority.

/** Which arrow keys move between members. Vocabulary from `prop-canon.json`. */
export type Orientation = 'horizontal' | 'vertical' | 'both';

/** What arrow navigation does when it reaches a disabled member. */
export type DisabledItems = 'skip' | 'focusable';

export interface NavigationOptions {
  orientation: Orientation;
  wrap: boolean;
  followsFocus: boolean;
  disabledItems: DisabledItems;
  homeEnd?: boolean;
}

/** One member of the collection, in document order. */
export interface Member {
  value: string;
  disabled: boolean;
}

/**
 * What a key press means. `null` is load-bearing and not a failure case: it means "this key is not
 * ours", and the caller must NOT consume the event.
 *
 * A horizontal tab list that swallowed ArrowDown would stop the page scrolling while focus sat
 * inside it, which the APG forbids in as many words. Returning null is how that is honoured.
 */
export type Intent = 'next' | 'previous' | 'first' | 'last' | null;

/**
 * Map a key to an intent, given the declared orientation.
 *
 * `both` exists for radio groups: the APG groups "Right Arrow and Down Arrow" in one bullet, so all
 * four arrows are strict equivalents there regardless of visual layout. A tab list is the opposite —
 * it must answer one axis and ignore the other.
 */
export function intentFor(key: string, options: NavigationOptions): Intent {
  const { orientation, homeEnd } = options;
  const inlineAxis = orientation === 'horizontal' || orientation === 'both';
  const blockAxis = orientation === 'vertical' || orientation === 'both';

  if (inlineAxis && key === 'ArrowRight') return 'next';
  if (inlineAxis && key === 'ArrowLeft') return 'previous';
  if (blockAxis && key === 'ArrowDown') return 'next';
  if (blockAxis && key === 'ArrowUp') return 'previous';
  if (homeEnd && key === 'Home') return 'first';
  if (homeEnd && key === 'End') return 'last';
  return null;
}

/**
 * The members arrow navigation may land on.
 *
 * With `focusable` a disabled member keeps its place in the path — the APG's own convention for
 * tabs, on the grounds that moving focus is how screen-reader users discover things. With `skip`
 * it is passed over, which costs fewer key presses and hides the member's existence.
 */
export function navigable(members: readonly Member[], options: NavigationOptions): Member[] {
  if (options.disabledItems === 'focusable') return [...members];
  return members.filter((m) => !m.disabled);
}

/**
 * Resolve an intent to the member that should receive focus, or `null` when there is nowhere to go.
 *
 * `from` is the currently focused member's value, or null when focus is not on a member yet.
 */
export function resolve(
  intent: Exclude<Intent, null>,
  from: string | null,
  members: readonly Member[],
  options: NavigationOptions,
): Member | null {
  const path = navigable(members, options);
  if (path.length === 0) return null;

  if (intent === 'first') return path[0] ?? null;
  if (intent === 'last') return path[path.length - 1] ?? null;

  const at = from === null ? -1 : path.findIndex((m) => m.value === from);

  // Focus is not on a navigable member — a disabled one under `skip`, or nothing yet. Entering
  // from outside should land on an end rather than refuse to move.
  if (at === -1) return (intent === 'next' ? path[0] : path[path.length - 1]) ?? null;

  const step = intent === 'next' ? at + 1 : at - 1;

  if (step < 0 || step >= path.length) {
    if (!options.wrap) return null;
    return (intent === 'next' ? path[0] : path[path.length - 1]) ?? null;
  }
  return path[step] ?? null;
}

/**
 * Which member holds the collection's single tab stop.
 *
 * The APG is explicit for radio groups — "If a radio button is checked, focus is set on the checked
 * button. If none of the radio buttons are checked, focus is set on the first radio button" — and
 * says the equivalent for tabs, "places focus on the active tab element". One rule serves both.
 *
 * For tabs the empty case cannot arise per the APG, which assumes a tab list always has an active
 * tab. Falling back to the first member is therefore OUR decision for that pattern, and a harmless
 * one: it keeps the collection reachable rather than stranding it outside the tab order.
 */
export function tabStop(
  selection: string | readonly string[] | null,
  members: readonly Member[],
  options: NavigationOptions,
): string | null {
  const path = navigable(members, options);
  const selected = Array.isArray(selection) ? selection[0] : selection;
  // The selection holds the tab stop only if it is somewhere the arrows can also reach. Under
  // `skip` a disabled selection is NOT in the path, and giving it the stop would put Tab and the
  // arrows in disagreement: focus would enter on a member no arrow key can return to.
  if (selected != null && path.some((m) => m.value === selected)) return selected;
  return path[0]?.value ?? members[0]?.value ?? null;
}
