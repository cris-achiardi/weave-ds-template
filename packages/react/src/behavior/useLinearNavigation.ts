import { useCallback, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import {
  intentFor,
  navigable,
  resolve,
  tabStop,
  type Member,
  type NavigationOptions,
} from './linear-navigation.js';

export type { DisabledItems, Member, NavigationOptions, Orientation } from './linear-navigation.js';

/**
 * What a member registers about itself.
 *
 * `navigable` is false for a member that belongs to the collection but is not a place focus travels
 * to. A tab list has two kinds of member — the tab and its panel — and only the tab is in the arrow
 * path. That is derivable from the contract rather than guessed: a member whose root declares
 * `activates` is a thing you choose, and therefore a thing you arrow onto.
 */
export interface MemberRegistration {
  element: HTMLElement | null;
  disabled: boolean;
  navigable: boolean;
}

export interface LinearNavigation {
  /** Called by a member as it mounts, and again whenever its disabled state changes. */
  register: (value: string, entry: MemberRegistration) => void;
  /** Called by a member as it unmounts. */
  unregister: (value: string) => void;
  /** True for the one member that sits in the page's tab sequence. */
  isTabStop: (value: string) => boolean;
  /** Goes on the collection's root. Key events from a member bubble to it. */
  onKeyDown: (event: KeyboardEvent) => void;
}

/**
 * Linear navigation for a collection's members: the arrow keys, the single tab stop, and — where
 * the contract says so — selection following focus.
 *
 * The decision logic lives in ./linear-navigation.ts as pure functions, so it can be executed
 * against the conformance cases in `@ds/contracts/conformance/linear-navigation.json`. This hook is
 * the React binding around it: registration, document order, and moving focus.
 *
 * @param options  the contract's `collection.navigation` block, one field for one
 * @param selection  the collection's current selection
 * @param onSelect  called when `followsFocus` is true and focus moves to a new member
 */
export function useLinearNavigation(
  options: NavigationOptions,
  selection: string | readonly string[] | null,
  onSelect: (value: string) => void,
): LinearNavigation {
  const registry = useRef(new Map<string, MemberRegistration>());

  // Registration order is mount order, which React does not promise matches the document. Members
  // are therefore sorted by document position on read — the arrow keys must follow what a person
  // sees, not what mounted first.
  const [version, bump] = useState(0);

  const register = useCallback((value: string, entry: MemberRegistration) => {
    const previous = registry.current.get(value);
    registry.current.set(value, entry);
    // Only re-render when something the tab stop depends on actually moved.
    if (
      !previous ||
      previous.element !== entry.element ||
      previous.disabled !== entry.disabled ||
      previous.navigable !== entry.navigable
    ) {
      bump((n) => n + 1);
    }
  }, []);

  const unregister = useCallback((value: string) => {
    if (registry.current.delete(value)) bump((n) => n + 1);
  }, []);

  const members = useMemo<Member[]>(() => {
    void version;
    return [...registry.current.entries()]
      .filter(([, entry]) => entry.navigable && entry.element)
      .sort(([, a], [, b]) => {
        if (!a.element || !b.element) return 0;
        const rel = a.element.compareDocumentPosition(b.element);
        if (rel & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
        if (rel & Node.DOCUMENT_POSITION_PRECEDING) return 1;
        return 0;
      })
      .map(([value, entry]) => ({ value, disabled: entry.disabled }));
  }, [version]);

  const stop = useMemo(() => tabStop(selection, members, options), [selection, members, options]);

  const isTabStop = useCallback((value: string) => value === stop, [stop]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const intent = intentFor(event.key, options);

      // NOT ours. Leave the event alone — this is the branch that keeps a horizontal tab list from
      // swallowing ArrowDown and breaking page scrolling for a keyboard user.
      if (intent === null) return;

      // Someone else already claimed it: a text field inside a member, say.
      if (event.defaultPrevented) return;

      const active = registry.current;
      let from: string | null = null;
      for (const [value, entry] of active) {
        if (entry.element && entry.element === document.activeElement) {
          from = value;
          break;
        }
      }

      const target = resolve(intent, from, members, options);
      if (!target) return;

      event.preventDefault();
      active.get(target.value)?.element?.focus();

      // A disabled member can be the focus target under `focusable`, and must not become the
      // selection: the APG keeps it discoverable, not choosable.
      if (options.followsFocus && !target.disabled) onSelect(target.value);
    },
    [members, onSelect, options],
  );

  return useMemo(
    () => ({ register, unregister, isTabStop, onKeyDown }),
    [register, unregister, isTabStop, onKeyDown],
  );
}

export { intentFor, navigable, resolve, tabStop };
