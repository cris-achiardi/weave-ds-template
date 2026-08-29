import { createContext, useContext } from 'react';

/**
 * What a TabItem or TabPanel needs to know, and nothing more.
 *
 * Selection lives here rather than on the items, so "two tabs selected at once" cannot be
 * expressed — see ADR 0006. The items read `value` and compare; they never hold it.
 */
export interface TabsContextValue {
  /** The selected value, or `undefined` when nothing is selected. */
  value: string | undefined;
  /** Select a value. No-op if it is already selected, so `onValueChange` does not re-fire. */
  select: (value: string) => void;
  /** Prefix for the generated ids that join a tab to its panel. */
  baseId: string;
}

export const TabsContext = createContext<TabsContextValue | null>(null);

/**
 * Read the surrounding Tabs.
 *
 * Throws rather than returning a default. An item with no selection to compare itself against
 * cannot decide whether it is selected, and rendering something that merely looks unselected would
 * hide the mistake behind a plausible result.
 */
export function useTabsContext(component: string): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (ctx === null) {
    throw new Error(`<${component}> must be rendered inside a <Tabs>. See ADR 0006.`);
  }
  return ctx;
}

/** The id joining a tab to the panel it controls. Both sides derive it, so they cannot disagree. */
export const tabId = (baseId: string, value: string) => `${baseId}-tab-${value}`;
export const panelId = (baseId: string, value: string) => `${baseId}-panel-${value}`;
