import { clsx } from 'clsx';
import { forwardRef, type ButtonHTMLAttributes, type MouseEvent } from 'react';

import { panelId, tabId, useTabsContext } from '../Tabs/TabsContext';
import styles from './TabItem.module.css';

export interface TabItemProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'value' | 'type'
> {
  /**
   * This tab's identity — what `onValueChange` reports, and what a TabPanel matches on. Must be
   * unique within one Tabs.
   */
  value: string;
  /**
   * Not selectable, and skipped when the arrow keys move through the list. Renders a native
   * disabled button, so it is also removed from the focus order entirely.
   */
  disabled?: boolean;
}

/**
 * One tab in a Tabs list.
 *
 * It does not hold whether it is selected — it compares its `value` against the selection on the
 * surrounding Tabs. See ADR 0006.
 */
export const TabItem = forwardRef<HTMLButtonElement, TabItemProps>(function TabItem(
  { value, disabled, children, className, onClick, ...rest },
  ref,
) {
  const { value: selectedValue, select, baseId } = useTabsContext('TabItem');
  const selected = selectedValue === value;

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    // A caller that calls preventDefault meant it. Selecting anyway would make their handler a
    // suggestion rather than a veto.
    if (!event.defaultPrevented) select(value);
  };

  return (
    <button
      ref={ref}
      {...rest}
      type="button"
      role="tab"
      id={tabId(baseId, value)}
      aria-selected={selected}
      aria-controls={panelId(baseId, value)}
      // Roving tabindex: exactly one tab is reachable with Tab, and the arrow keys move within.
      tabIndex={selected ? 0 : -1}
      disabled={disabled}
      onClick={handleClick}
      data-ds-part="root"
      className={clsx(styles.root, className)}
    >
      <span data-ds-part="label" className={styles.label}>
        {children}
      </span>
      {/*
        Rendered only when selected, rather than always present and faded. The indicator is
        absolutely positioned, so removing it shifts nothing — and the state then reaches the
        stylesheet as a literal `data-ds-state`, which is what the parts scanner behind
        `verify:contract` can actually see. A computed attribute value is invisible to it.
      */}
      {selected && (
        <span
          data-ds-part="indicator"
          data-ds-state="selected"
          className={styles.indicator}
          aria-hidden="true"
        />
      )}
    </button>
  );
});
