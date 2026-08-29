import { clsx } from 'clsx';
import { forwardRef, type HTMLAttributes } from 'react';

import { panelId, tabId, useTabsContext } from '../Tabs/TabsContext';
import styles from './TabPanel.module.css';

export interface TabPanelProps extends HTMLAttributes<HTMLDivElement> {
  /** The TabItem `value` this panel belongs to. One panel per item, matched on this string. */
  value: string;
}

/**
 * The content revealed by one TabItem.
 *
 * Rendered but hidden when its tab is not selected, so its DOM position — and anything a consumer
 * has measured or scrolled — survives switching away and back.
 */
export const TabPanel = forwardRef<HTMLDivElement, TabPanelProps>(function TabPanel(
  { value, children, className, ...rest },
  ref,
) {
  const { value: selectedValue, baseId } = useTabsContext('TabPanel');
  const selected = selectedValue === value;

  return (
    <div
      ref={ref}
      {...rest}
      role="tabpanel"
      id={panelId(baseId, value)}
      aria-labelledby={tabId(baseId, value)}
      // The panel itself is focusable so that a keyboard user landing here from the tab has
      // somewhere to go, even when the panel holds nothing focusable of its own.
      tabIndex={0}
      hidden={!selected}
      data-ds-part="root"
      className={clsx(styles.root, className)}
    >
      {children}
    </div>
  );
});
