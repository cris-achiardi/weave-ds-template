// GENERATED from TabPanel.contract.json + TabPanel.react.json. Do not edit by hand.
// Regenerate: node packages/react/src/emit/emit.mjs TabPanel --out <dir>
//
// The content one tab reveals. It exists so the strip has something real to control: a tab announcing that it opens a panel, with no panel wired to it, describes an interaction that does not happen.

import { forwardRef, useContext } from 'react';
import type { HTMLAttributes } from 'react';
import { TabsContext } from '../Tabs/Tabs';
import './TabPanel.structure.css';
import './TabPanel.theme.css';

export interface TabPanelProps extends Omit<HTMLAttributes<HTMLDivElement>, 'value'> {
  /** Distinguishes this TabPanel from its siblings. The ancestor Tabs compares against it to decide whether this one is in the selection. */
  value: string;
}

export const TabPanel = forwardRef<HTMLDivElement, TabPanelProps>(function TabPanel(
  { value, children, className, ...rest },
  ref,
) {
  const ctx = useContext(TabsContext);
  if (!ctx) {
    throw new Error(
      'TabPanel must be rendered inside a Tabs. There is no selection to compare against, and looking unselected would hide the mistake.',
    );
  }
  const selected = ctx.selection === value;
  const baseId = `${ctx.baseId}-TabPanel-${value}`;

  return (
    <div
      {...rest}
      ref={ref}
      role="tabpanel"
      id={baseId}
      data-ds-state-selected={selected || undefined}
      tabIndex={0}
      hidden={!selected}
      aria-labelledby={`${ctx.baseId}-TabItem-${value}`}
      data-ds-component="TabPanel"
      data-ds-part="root"
      className={className}
    ></div>
  );
});
