import { expect, test } from '@playwright/test';

// Regression for #44: Tabs emitted an EMPTY tablist and rendered its tabs and panels as siblings
// of it, with the consumer's name on the generic root. Every `role="tab"` must be owned by the
// `role="tablist"`, every panel must sit outside it, and the tablist must carry the name.
//
// Ownership is checked on the FLAT tree — through slot assignment and shadow hosts — because that is
// the tree the browser builds its accessibility tree from. A light-DOM descendant check would
// miss the web-component case entirely, where the tab is a slotted child of the host and never a
// DOM descendant of the shadow tablist.
export function tablistOwnershipRegressions(backend) {
  test('Tabs: the named tablist owns every tab, in order, and no panel (#44)', async ({
    page,
    browserName,
  }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');
    // Wait for the framework to mount before reading the DOM.
    await expect(page.getByRole('tab', { name: 'Settings' })).toBeVisible();

    const report = await page.evaluate(() => {
      const deep = (root, out = []) => {
        for (const el of root.querySelectorAll('*')) {
          out.push(el);
          if (el.shadowRoot) deep(el.shadowRoot, out);
        }
        return out;
      };
      const flatParent = (n) =>
        n.assignedSlot ??
        (n.parentNode instanceof ShadowRoot ? n.parentNode.host : n.parentElement);
      const ownerOf = (el) => {
        for (let n = flatParent(el); n; n = flatParent(n))
          if (n.getAttribute?.('role') === 'tablist') return n;
        return null;
      };
      // Flat-tree pre-order, so a slotted tab is visited where it RENDERS, not where it is written.
      const flatOrder = (node, out = []) => {
        const kids =
          node instanceof HTMLSlotElement
            ? node.assignedElements()
            : [...(node.shadowRoot ?? node).children];
        for (const k of kids) {
          out.push(k);
          flatOrder(k, out);
        }
        return out;
      };
      const all = deep(document);
      const lists = all.filter((el) => el.getAttribute('role') === 'tablist');
      const tabs = all.filter((el) => el.getAttribute('role') === 'tab');
      const panels = all.filter((el) => el.getAttribute('role') === 'tabpanel');
      const list = lists[0];
      const inList = list ? flatOrder(list).filter((el) => el.getAttribute('role') === 'tab') : [];
      const label = (t) => (t.getRootNode().host ?? t).textContent.trim();
      const root = document.querySelector('[data-ds-component="Tabs"]');
      return {
        lists: lists.length,
        listName: list?.getAttribute('aria-label') ?? null,
        tabs: tabs.length,
        unowned: tabs.filter((t) => ownerOf(t) !== list).length,
        panelsInList: panels.filter((p) => ownerOf(p) !== null).length,
        panels: panels.length,
        orderInList: inList.map(label),
        rootName: root?.getAttribute('aria-label') ?? null,
      };
    });

    expect(report.lists).toBe(1);
    expect(report.listName).toBe('Project sections');
    expect(report.tabs).toBe(3);
    expect(report.unowned).toBe(0);
    expect(report.orderInList).toEqual(['Overview', 'Activity', 'Settings']);
    expect(report.panels).toBe(3);
    expect(report.panelsInList).toBe(0);
    // The light-DOM backends must not ALSO name the generic wrapper. The WC host keeps the
    // attribute because it is the input the component reads; the name lands on the shadow tablist.
    if (backend !== 'wc') expect(report.rootName).toBeNull();

    const list = page.getByRole('tablist', { name: 'Project sections' });
    await expect(list).toBeVisible();

    if (browserName === 'chromium') {
      // The browser's OWN accessibility tree, not a DOM reading of it: each tab's nearest
      // non-ignored tablist ancestor is the named strip, in document order. This is the
      // relationship "tab 1 of 3" is computed from, and the empty tablist could not produce it.
      const cdp = await page.context().newCDPSession(page);
      const { nodes } = await cdp.send('Accessibility.getFullAXTree');
      const byId = new Map(nodes.map((n) => [n.nodeId, n]));
      const axList = nodes.find((n) => n.role?.value === 'tablist' && !n.ignored);
      expect(axList?.name?.value).toBe('Project sections');
      const ownerOf = (n) => {
        for (let p = byId.get(n.parentId); p; p = byId.get(p.parentId))
          if (p.role?.value === 'tablist') return p.nodeId;
        return null;
      };
      const axTabs = nodes.filter((n) => n.role?.value === 'tab' && !n.ignored);
      expect(axTabs.map((n) => [n.name?.value, ownerOf(n)])).toEqual([
        ['Overview', axList.nodeId],
        ['Activity', axList.nodeId],
        ['Settings', axList.nodeId],
      ]);
    }

    // Moving the tabs must not cost the keyboard: arrows still rove and select across them.
    const overview = page.getByRole('tab', { name: 'Overview' });
    const activity = page.getByRole('tab', { name: 'Activity' });
    const settings = page.getByRole('tab', { name: 'Settings' });
    await overview.focus();
    await page.keyboard.press('ArrowRight');
    await expect(activity).toBeFocused();
    await expect(activity).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('ArrowRight');
    await expect(settings).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(overview).toBeFocused();
    await page.keyboard.press('End');
    await expect(settings).toBeFocused();
    await page.keyboard.press('Home');
    await expect(overview).toBeFocused();
    await expect(overview).toHaveAttribute('aria-selected', 'true');
    expect(errors).toEqual([]);
  });
}
