import { clsx } from 'clsx';
import {
  Children,
  forwardRef,
  isValidElement,
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactElement,
} from 'react';

import { TabItem, type TabItemProps } from '../TabItem/TabItem';
import { TabPanel, type TabPanelProps } from '../TabPanel/TabPanel';
import styles from './Tabs.module.css';
import { TabsContext, tabId, type TabsContextValue } from './TabsContext';

export interface TabsProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'onChange' | 'defaultValue'
> {
  /**
   * The selected tab's value. Pass it together with `onValueChange` for a controlled component.
   * Leave it out to let Tabs hold the selection itself.
   */
  value?: string;
  /**
   * The starting selection when uncontrolled. Defaults to the first TabItem that is not disabled.
   * Ignored entirely when `value` is passed.
   */
  defaultValue?: string;
  /**
   * Fires when a different tab is chosen, by click or by arrow key. Never fires for the tab that
   * is already selected.
   */
  onValueChange?: (value: string) => void;
}

const isItem = (c: unknown): c is ReactElement<TabItemProps> =>
  isValidElement(c) && c.type === TabItem;
const isPanel = (c: unknown): c is ReactElement<TabPanelProps> =>
  isValidElement(c) && c.type === TabPanel;

/**
 * A tab list and its panels.
 *
 * Holds the selection and the keyboard model; the items and panels read from it. See ADR 0006 for
 * why selection is not a prop on the item.
 */
export const Tabs = forwardRef<HTMLDivElement, TabsProps>(function Tabs(
  { value, defaultValue, onValueChange, children, className, ...rest },
  ref,
) {
  const baseId = useId();
  const listRef = useRef<HTMLDivElement>(null);

  // Items are read straight off `children`, which is what gives us DOM order without a
  // registration protocol. The cost is recorded in ADR 0006: a TabItem wrapped in another element
  // still renders, but drops out of the keyboard order with no error.
  const kids = Children.toArray(children);
  const items = useMemo(
    () =>
      kids
        .filter(isItem)
        .map((c) => ({ value: c.props.value, disabled: c.props.disabled === true })),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `kids` is rebuilt every render by design
    [children],
  );

  const firstEnabled = items.find((i) => !i.disabled)?.value;
  const [uncontrolled, setUncontrolled] = useState<string | undefined>(
    defaultValue ?? firstEnabled,
  );

  const controlled = value !== undefined;
  const current = controlled ? value : uncontrolled;

  const select = useCallback(
    (next: string) => {
      if (next === current) return;
      if (!controlled) setUncontrolled(next);
      onValueChange?.(next);
    },
    [controlled, current, onValueChange],
  );

  const ctx = useMemo<TabsContextValue>(
    () => ({ value: current, select, baseId }),
    [current, select, baseId],
  );

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const enabled = items.filter((i) => !i.disabled);
    if (enabled.length === 0) return;

    const from = enabled.findIndex((i) => i.value === current);
    let to: number;
    switch (event.key) {
      case 'ArrowRight':
        to = (from + 1) % enabled.length;
        break;
      case 'ArrowLeft':
        to = (from - 1 + enabled.length) % enabled.length;
        break;
      case 'Home':
        to = 0;
        break;
      case 'End':
        to = enabled.length - 1;
        break;
      default:
        return;
    }

    const target = enabled[to];
    if (target === undefined) return;

    event.preventDefault();
    const next = target.value;
    select(next);
    // Activation follows focus, so the focus move and the selection are one action.
    listRef.current?.ownerDocument.getElementById(tabId(baseId, next))?.focus();
  };

  return (
    <TabsContext.Provider value={ctx}>
      <div ref={ref} {...rest} data-ds-part="root" className={clsx(styles.root, className)}>
        {/* Only tabs may sit inside a tablist, so the panels are rendered as siblings of it. */}
        <div
          ref={listRef}
          role="tablist"
          onKeyDown={onKeyDown}
          data-ds-part="list"
          className={styles.list}
        >
          {kids.filter(isItem)}
        </div>
        {kids.filter(isPanel)}
      </div>
    </TabsContext.Provider>
  );
});
