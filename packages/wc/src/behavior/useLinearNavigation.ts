import { intentFor, navigable, resolve, tabStop } from '@ds/behavior/linear-navigation';
import type { Member, NavigationOptions } from '@ds/behavior/linear-navigation';

export type {
  DisabledItems,
  Intent,
  Member,
  NavigationOptions,
  Orientation,
} from '@ds/behavior/linear-navigation';

export interface MemberRegistration {
  element: HTMLElement | null;
  disabled: boolean;
}

export interface LinearNavigation {
  register: (value: string, entry: MemberRegistration) => void;
  unregister: (value: string) => void;
  isTabStop: (value: string) => boolean;
  onKeyDown: (event: KeyboardEvent) => void;
}

/**
 * Moving between the members of a collection with the arrow keys, and keeping exactly one of them
 * in the page's tab sequence.
 *
 * The decision logic is in @ds/behavior as pure functions. This is the vanilla binding: a Map, a
 * document-order sort, and `focus()`.
 *
 * NO VERSION COUNTER. The React, Vue and Angular bindings each keep one so their reactivity system
 * knows the member list moved; nothing here needs telling, because the collection recomputes on
 * read and announces to its members itself. That is the smallest of the four and the only one where
 * the registry is just a Map.
 *
 * FINDING FOCUS CROSSES A SHADOW BOUNDARY, and `document.activeElement` does not. When focus is
 * inside a shadow root, `document.activeElement` reports the HOST, not the focused node — so the
 * walk below follows `shadowRoot.activeElement` down until it stops moving. The other three
 * backends never meet this because their members are in the light DOM.
 */
export function useLinearNavigation(
  options: NavigationOptions,
  selection: () => string | readonly string[] | null,
  onSelect: (value: string) => void,
): LinearNavigation {
  const registry = new Map<string, MemberRegistration>();

  const members = (): Member[] =>
    [...registry.entries()]
      .filter(([, entry]) => entry.element)
      .sort(([, a], [, b]) => {
        if (!a.element || !b.element) return 0;
        const rel = a.element.compareDocumentPosition(b.element);
        if (rel & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
        if (rel & Node.DOCUMENT_POSITION_PRECEDING) return 1;
        return 0;
      })
      .map(([value, entry]) => ({ value, disabled: entry.disabled }));

  /** The deepest focused node, following every shadow root on the way down. */
  const deepActiveElement = (): Element | null => {
    let node: Element | null = document.activeElement;
    while (node?.shadowRoot?.activeElement) node = node.shadowRoot.activeElement;
    return node;
  };

  return {
    register(value, entry) {
      registry.set(value, entry);
    },
    unregister(value) {
      registry.delete(value);
    },
    isTabStop(value) {
      return value === tabStop(selection(), members(), options);
    },
    onKeyDown(event) {
      const intent = intentFor(event.key, options);
      // NOT ours. This is the branch that keeps a horizontal tab list from swallowing ArrowDown.
      if (intent === null) return;
      // Someone else already claimed it: a text field inside a member, say.
      if (event.defaultPrevented) return;

      const focused = deepActiveElement();
      let from: string | null = null;
      for (const [value, entry] of registry) {
        if (entry.element && focused && entry.element.contains(focused)) {
          from = value;
          break;
        }
      }
      // Focus is not on a member at all — the event bubbled from something the collection wraps.
      if (from === null) return;

      const target = resolve(intent, from, members(), options);
      if (!target) return;

      event.preventDefault();
      registry.get(target.value)?.element?.focus();

      // A disabled member can be the focus target under `focusable`, and must not become the
      // selection: the APG keeps it discoverable, not choosable.
      if (options.followsFocus && !target.disabled) onSelect(target.value);
    },
  };
}

export { intentFor as navigationIntentFor, navigable, resolve, tabStop };
