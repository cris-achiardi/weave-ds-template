// The pure core of dismissal: no React, no DOM, no side effects.
//
// Split from the hook for the same reason the other two primitives are: everything below is a
// function from (event facts, declared causes, current state) to a decision, so the cases in
// packages/contracts/conformance/dismissal.json execute against it directly rather than being
// asserted by reading a component.
//
// NOTHING HERE NEEDS A BROWSER, and that is the test of whether the split is right. Dismissal is
// two questions — is this key Escape, and did this press land on the region itself — and both are
// answerable from plain values. A case that needed a rendered DOM would mean the decision had
// leaked into the hook.
//
// The parameters are the contract's `dismisses` block, one for one. If a name here drifts from a
// name there, the schema is the authority.

/** What may close a region. A SET, not a choice: declaring both does not make either conditional. */
export type DismissalCause = 'escape' | 'outside-press';

export interface DismissalOptions {
  on: readonly DismissalCause[];
}

/**
 * Where a press landed, relative to the region that declared the dismissal.
 *
 * `region` means the press reported the region ITSELF as its target — which is what a backdrop
 * press looks like from inside the component, because a native `<dialog>`'s backdrop is a
 * pseudo-element and is never an event target. `inside` means it landed on a descendant, at any
 * depth: the text inside a button inside the actions row is still inside the dialog.
 */
export type PressTarget = 'region' | 'inside';

/**
 * Whether a key press should dismiss.
 *
 * Returns false for every key that is not a declared cause, which is the same rule the other two
 * primitives follow: consuming an event the pattern does not define breaks whatever else would
 * have used it. `Enter` in particular is activation and belongs to `activates`, never here.
 *
 * `isOpen` is not a formality. A closed component must consume nothing — otherwise it becomes a
 * keyboard black hole while invisible, swallowing Escape from whatever else on the page wanted it.
 */
export function dismissesOnKey(key: string, isOpen: boolean, options: DismissalOptions): boolean {
  if (!isOpen) return false;
  if (!options.on.includes('escape')) return false;
  return key === 'Escape';
}

/**
 * Whether a press should dismiss.
 *
 * The whole content of `outside-press` is the `target === 'region'` test, and the case that gives
 * it meaning is the negative one: a press on a DESCENDANT must not dismiss. A backend that checks
 * only one direction produces a dialog that closes on every click inside itself.
 *
 * `primary` is required because a right-click opens a context menu, and closing the thing
 * underneath it loses whatever the person was aiming at.
 */
export function dismissesOnPress(
  target: PressTarget,
  isPrimaryButton: boolean,
  isOpen: boolean,
  options: DismissalOptions,
): boolean {
  if (!isOpen) return false;
  if (!options.on.includes('outside-press')) return false;
  if (!isPrimaryButton) return false;
  return target === 'region';
}
