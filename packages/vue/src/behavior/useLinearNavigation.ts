import { computed, shallowRef, triggerRef } from 'vue';
import { intentFor, navigable, resolve, tabStop } from './linear-navigation.js';
import type { Member, NavigationOptions } from './linear-navigation.js';

export type {
  DisabledItems,
  Intent,
  Member,
  NavigationOptions,
  Orientation,
} from './linear-navigation.js';

/** What a member hands the collection when it mounts. */
export interface MemberRegistration {
  element: HTMLElement | null;
  disabled: boolean;
}

export interface LinearNavigation {
  /** A member announces its DOM node, and re-announces it when its disabled state changes. */
  register: (value: string, entry: MemberRegistration) => void;
  unregister: (value: string) => void;
  /** True for the one member that sits in the page's tab sequence. */
  isTabStop: (value: string) => boolean;
  /** Goes on the collection's root. */
  onKeyDown: (event: KeyboardEvent) => void;
}

/**
 * Moving between the members of a collection with the arrow keys, and keeping exactly one of them
 * in the page's tab sequence.
 *
 * The decision logic is in ./linear-navigation.ts as pure functions, so the cases in
 * `@ds/contracts/conformance/linear-navigation.json` execute against it. This composable is the Vue
 * binding: the registry, document order, and moving focus.
 *
 * `selection` IS A GETTER for the reason useDismissal explains.
 *
 * @param options   the contract's `collection.navigation` block
 * @param selection getter: the current selection
 * @param onSelect  called when `followsFocus` says arrowing also selects
 */
export function useLinearNavigation(
  options: NavigationOptions,
  selection: () => string | readonly string[] | null,
  onSelect: (value: string) => void,
): LinearNavigation {
  // A plain Map behind a shallowRef, bumped by hand. The React binding needs a ref plus a version
  // counter plus a useMemo to get the same effect; here the manual trigger IS the version counter,
  // and there is one fewer moving part rather than a different idea.
  const registry = shallowRef(new Map<string, MemberRegistration>());

  const register = (value: string, entry: MemberRegistration) => {
    const previous = registry.value.get(value);
    registry.value.set(value, entry);
    // Only recompute when something the tab stop depends on actually moved.
    if (!previous || previous.element !== entry.element || previous.disabled !== entry.disabled) {
      triggerRef(registry);
    }
  };

  const unregister = (value: string) => {
    if (registry.value.delete(value)) triggerRef(registry);
  };

  // Registration order is mount order, which no framework promises matches the document. Members
  // are therefore sorted by document position on read — the arrow keys must follow what a person
  // sees, not what mounted first.
  const members = computed<Member[]>(() =>
    [...registry.value.entries()]
      .filter(([, entry]) => entry.element)
      .sort(([, a], [, b]) => {
        if (!a.element || !b.element) return 0;
        const rel = a.element.compareDocumentPosition(b.element);
        if (rel & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
        if (rel & Node.DOCUMENT_POSITION_PRECEDING) return 1;
        return 0;
      })
      .map(([value, entry]) => ({ value, disabled: entry.disabled })),
  );

  const isTabStop = (value: string) => value === tabStop(selection(), members.value, options);

  const onKeyDown = (event: KeyboardEvent) => {
    const intent = intentFor(event.key, options);

    // NOT ours. Leave the event alone — this is the branch that keeps a horizontal tab list from
    // swallowing ArrowDown and breaking page scrolling for a keyboard user.
    if (intent === null) return;

    // Someone else already claimed it: a text field inside a member, say.
    if (event.defaultPrevented) return;

    const active = registry.value;

    // Which member holds focus? `contains` rather than `===` because a member's root may have
    // focusable content of its own, and the arrow keys still belong to the collection there.
    let from: string | null = null;
    const focused = document.activeElement;
    for (const [value, entry] of active) {
      if (entry.element && focused && entry.element.contains(focused)) {
        from = value;
        break;
      }
    }

    // Focus is not on a member at all. The event reached this root by bubbling from somewhere else
    // the collection wraps — the content of a tab PANEL, say. Arrowing inside a panel must not move
    // the tabs, so the collection declines the event and lets it carry on up.
    if (from === null) return;

    const target = resolve(intent, from, members.value, options);
    if (!target) return;

    event.preventDefault();
    active.get(target.value)?.element?.focus();

    // A disabled member can be the focus target under `focusable`, and must not become the
    // selection: the APG keeps it discoverable, not choosable.
    if (options.followsFocus && !target.disabled) onSelect(target.value);
  };

  return { register, unregister, isTabStop, onKeyDown };
}

export { intentFor as navigationIntentFor, navigable, resolve, tabStop };
