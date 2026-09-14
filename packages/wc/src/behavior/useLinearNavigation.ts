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
  /**
   * Record a member, and report whether anything a reader depends on actually MOVED.
   *
   * THE RETURN VALUE IS LOAD-BEARING AND WAS MISSING. The React, Vue and Angular bindings each make
   * this comparison to decide whether to bump their reactivity counter; this one has no counter, so
   * the comparison was dropped — and the collection announced on every call instead. A member
   * re-registers from its own update, an announcement makes every member update, and every one of
   * them re-registers: an infinite loop that froze the tab it was rendered in.
   */
  register: (value: string, entry: MemberRegistration) => boolean;
  /** Returns whether the member was actually present. */
  unregister: (value: string) => boolean;
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

  /** The deepest focused node, following every shadow root on the way DOWN. */
  const deepActiveElement = (): Element | null => {
    let node: Element | null = document.activeElement;
    while (node?.shadowRoot?.activeElement) node = node.shadowRoot.activeElement;
    return node;
  };

  /**
   * Which registered member owns this node, following every shadow root on the way UP.
   *
   * `element.contains(focused)` is what the other three bindings use, and it is WRONG HERE for the
   * same reason `document.activeElement` is: neither crosses a shadow boundary. A member registers
   * its HOST, and the focused node is the button inside that host's own shadow root — so
   * `contains()` answers false for every member and the arrow keys do nothing at all.
   *
   * Climbing needs both moves, because they are different edges: `parentNode` walks the tree a node
   * is in, and a ShadowRoot's `parentNode` is null — its `host` is how you leave it.
   */
  const ownerOf = (node: Node | null): string | null => {
    let current: Node | null = node;
    while (current) {
      for (const [value, entry] of registry) {
        if (entry.element === current) return value;
      }
      current =
        current.parentNode ?? (current instanceof ShadowRoot ? (current.host as Node) : null);
    }
    return null;
  };

  return {
    register(value, entry) {
      const previous = registry.get(value);
      registry.set(value, entry);
      // Only report a change when something a reader depends on moved. Registration happens on
      // every update, so answering `true` unconditionally is an announcement per update — and an
      // announcement causes an update.
      return (
        !previous || previous.element !== entry.element || previous.disabled !== entry.disabled
      );
    },
    unregister(value) {
      return registry.delete(value);
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

      // Focus is not on a member at all — the event bubbled from something the collection wraps,
      // like the content of a panel. Arrowing there must not move the strip.
      const from = ownerOf(deepActiveElement());
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
