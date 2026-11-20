import { expect, test } from '@playwright/test';

// #36: WC TabItem / TabPanel relations across component (shadow) boundaries.
//
// Each member realizes its ROOT on its host (role, states, focus as host attributes) and the tab
// and its panel reference each other with IDREFs between hosts in one tree — see ADR 0007's #36
// record. What is asserted where, and why:
//
//   - Chromium: the browser's OWN accessibility tree (CDP), so the relation and the name are
//     verified as assistive technology receives them.
//   - Firefox, WebKit: their accessibility trees are NOT observable from Playwright. These tests
//     assert DOM state there (role, IDREFs, ids) plus Playwright's own role/name engine. That is
//     a gap in the evidence, stated, not a claim that their trees are right.

async function fixture(page, html) {
  await page.goto('/browser-tests.html');
  await page.evaluate(async (markup) => {
    await import('/src/browser-tests.ts');
    await customElements.whenDefined('ds-tab-panel');
    const host = document.createElement('div');
    host.id = 'rel';
    host.innerHTML = markup;
    document.body.append(host);
  }, html);
}

const attrs = (page, selector, names) =>
  page
    .locator(selector)
    .evaluate((el, names) => Object.fromEntries(names.map((n) => [n, el.getAttribute(n)])), names);

/** Chromium only: tab/tabpanel nodes from the browser's accessibility tree. */
async function axTree(page) {
  const cdp = await page.context().newCDPSession(page);
  const { nodes } = await cdp.send('Accessibility.getFullAXTree');
  const of = (role) =>
    nodes
      .filter((n) => !n.ignored && n.role?.value === role)
      .map((n) => ({
        name: n.name?.value ?? '',
        controls:
          (n.properties ?? [])
            .find((p) => p.name === 'controls')
            ?.value.relatedNodes?.map((r) => r.idref ?? null) ?? [],
      }));
  return { tabs: of('tab'), panels: of('tabpanel'), lists: of('tablist') };
}

const TWO = `
  <ds-tabs value="a" aria-label="Sections">
    <ds-tab-item slot="tabs" value="a">Alpha</ds-tab-item>
    <ds-tab-item slot="tabs" value="b">Beta</ds-tab-item>
    <ds-tab-panel value="a">Alpha body</ds-tab-panel>
    <ds-tab-panel value="b">Beta body</ds-tab-panel>
  </ds-tabs>`;

export function tabRelationRegressions() {
  test('#36: each tab controls its panel and each panel is named by its tab', async ({
    page,
    browserName,
  }) => {
    await fixture(page, TWO);
    const [tabA, tabB] = ['a', 'b'].map((v) => `#rel ds-tab-item[value="${v}"]`);
    const [panelA, panelB] = ['a', 'b'].map((v) => `#rel ds-tab-panel[value="${v}"]`);
    const ids = await page.evaluate(() =>
      [...document.querySelectorAll('#rel ds-tab-item, #rel ds-tab-panel')].map((el) => el.id),
    );
    expect(ids.every(Boolean)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);

    // DOM state, every engine: the relation is between the two HOSTS, which carry the roles.
    const a = await attrs(page, tabA, ['role', 'aria-selected', 'aria-controls', 'id']);
    const pa = await attrs(page, panelA, ['role', 'aria-labelledby', 'id']);
    expect(a).toMatchObject({ role: 'tab', 'aria-selected': 'true', 'aria-controls': pa.id });
    expect(pa).toMatchObject({ role: 'tabpanel', 'aria-labelledby': a.id });
    const b = await attrs(page, tabB, ['aria-selected', 'aria-controls', 'id']);
    const pb = await attrs(page, panelB, ['aria-labelledby', 'id']);
    expect(b).toMatchObject({ 'aria-selected': 'false', 'aria-controls': pb.id });
    expect(pb['aria-labelledby']).toBe(b.id);

    // Playwright's role/name engine, every engine (the tooling A was chosen for).
    await expect(page.locator('#rel').getByRole('tabpanel', { name: 'Alpha' })).toHaveCount(1);
    await expect(
      page.locator('#rel').getByRole('tab', { name: 'Alpha', selected: true }),
    ).toHaveCount(1);

    if (browserName === 'chromium') {
      const ax = await axTree(page);
      const tab = ax.tabs.find((t) => t.name === 'Alpha');
      expect(tab?.controls).toEqual([pa.id]);
      expect(ax.panels.map((p) => p.name)).toContain('Alpha');
    }
  });

  test('#36: consumer ids and IDREF tokens on the hosts are kept, and only ours are removed', async ({
    page,
  }) => {
    await fixture(
      page,
      `<span id="extra">Extra</span><div id="theirs">Theirs</div>
       <ds-tabs value="a" aria-label="Sections">
         <ds-tab-item slot="tabs" value="a" id="my-tab" aria-controls="theirs">Alpha</ds-tab-item>
         <ds-tab-panel value="a" id="my-panel" aria-labelledby="extra">Body</ds-tab-panel>
       </ds-tabs>`,
    );
    const tab = '#rel ds-tab-item';
    const panel = '#rel ds-tab-panel';
    expect(await attrs(page, tab, ['id', 'aria-controls'])).toEqual({
      id: 'my-tab',
      'aria-controls': 'theirs my-panel',
    });
    expect(await attrs(page, panel, ['id', 'aria-labelledby'])).toEqual({
      id: 'my-panel',
      'aria-labelledby': 'extra my-tab',
    });

    // The tab leaves: it gets back exactly what it had; the panel drops only our token.
    const left = await page.locator(tab).evaluate((el) => {
      el.remove();
      const names = ['id', 'aria-controls', 'role', 'aria-selected', 'tabindex'];
      return Object.fromEntries(names.map((n) => [n, el.getAttribute(n)]));
    });
    expect(left).toEqual({
      id: 'my-tab',
      'aria-controls': 'theirs',
      role: null,
      'aria-selected': null,
      tabindex: null,
    });
    expect(await attrs(page, panel, ['aria-labelledby'])).toEqual({ 'aria-labelledby': 'extra' });
  });

  test('#36: a detached member writes nothing onto its host, and releases everything on leaving', async ({
    page,
  }) => {
    await fixture(page, TWO);
    const result = await page.evaluate(() => {
      const names = ['role', 'id', 'aria-selected', 'aria-controls', 'tabindex'];
      const read = (el) => Object.fromEntries(names.map((n) => [n, el.getAttribute(n)]));
      const tab = document.createElement('ds-tab-item');
      tab.value = 'a';
      tab.slot = 'tabs';
      const detached = read(tab);
      const tabs = document.querySelector('#rel ds-tabs');
      tabs.prepend(tab);
      const wired = read(tab);
      tab.remove();
      return { detached, wired, released: read(tab) };
    });
    const none = {
      role: null,
      id: null,
      'aria-selected': null,
      'aria-controls': null,
      tabindex: null,
    };
    expect(result.detached).toEqual(none);
    expect(result.wired.role).toBe('tab');
    expect(result.released).toEqual(none);
  });

  test('#36: identity changes, insertion, removal, duplicates and missing panels re-pair', async ({
    page,
    browserName,
  }) => {
    await fixture(
      page,
      `<ds-tabs value="a" aria-label="Sections">
         <ds-tab-item slot="tabs" value="a">Alpha</ds-tab-item>
         <ds-tab-item slot="tabs" value="b">Beta</ds-tab-item>
         <ds-tab-item slot="tabs" value="a">Alpha twin</ds-tab-item>
         <ds-tab-panel value="a">Alpha body</ds-tab-panel>
         <ds-tab-panel value="a">Alpha twin body</ds-tab-panel>
       </ds-tabs>`,
    );
    const state = () =>
      page.evaluate(() => {
        const q = (s) => [...document.querySelectorAll(s)];
        return {
          tabs: q('#rel ds-tab-item').map((t) => [
            t.textContent.trim(),
            t.getAttribute('aria-controls'),
          ]),
          panels: q('#rel ds-tab-panel').map((p) => [
            p.textContent.trim(),
            p.id,
            p.getAttribute('aria-labelledby'),
          ]),
          ids: Object.fromEntries(q('#rel ds-tab-item').map((t) => [t.textContent.trim(), t.id])),
        };
      });

    let s = await state();
    const [firstPanel, twinPanel] = s.panels;
    // Missing counterpart: Beta has no panel, so it controls nothing.
    // Duplicates: only the FIRST tab and FIRST panel of identity "a" pair.
    expect(s.tabs).toEqual([
      ['Alpha', firstPanel[1]],
      ['Beta', null],
      ['Alpha twin', null],
    ]);
    expect(firstPanel[2]).toBe(s.ids.Alpha);
    expect(twinPanel[2]).toBeNull();

    // Insertion: a panel for "b" arrives later; Beta picks it up.
    await page.evaluate(() => {
      const p = document.createElement('ds-tab-panel');
      p.value = 'b';
      p.textContent = 'Beta body';
      document.querySelector('#rel ds-tabs').append(p);
    });
    s = await state();
    const betaPanel = s.panels.find(([text]) => text === 'Beta body');
    expect(s.tabs[1]).toEqual(['Beta', betaPanel[1]]);
    expect(betaPanel[2]).toBe(s.ids.Beta);

    // Identity change: the first "a" panel becomes "c"; the twin is now the first "a" panel.
    await page.evaluate(() => {
      document.querySelector('#rel ds-tab-panel').value = 'c';
    });
    s = await state();
    expect(s.tabs[0]).toEqual(['Alpha', twinPanel[1]]);
    expect(s.panels.find(([t]) => t === 'Alpha twin body')[2]).toBe(s.ids.Alpha);
    expect(s.panels.find(([t]) => t === 'Alpha body')[2]).toBeNull();

    // Removal: the first "a" tab leaves; the duplicate "a" tab now pairs.
    await page.evaluate(() => document.querySelector('#rel ds-tab-item').remove());
    s = await state();
    expect(s.tabs).toEqual([
      ['Beta', betaPanel[1]],
      ['Alpha twin', twinPanel[1]],
    ]);
    expect(s.panels.find(([t]) => t === 'Alpha twin body')[2]).toBe(s.ids['Alpha twin']);

    // Label edit: the panel's name follows its tab's label, live.
    await page.evaluate(() => {
      document.querySelectorAll('#rel ds-tab-item')[1].textContent = 'Renamed';
    });
    await page.evaluate(() => (document.querySelector('#rel ds-tabs').value = 'a'));
    await expect(page.locator('#rel').getByRole('tabpanel', { name: 'Renamed' })).toHaveCount(1);
    if (browserName === 'chromium') {
      const ax = await axTree(page);
      expect(ax.panels.map((p) => p.name)).toContain('Renamed');
      expect(ax.tabs.find((t) => t.name === 'Renamed')?.controls).toEqual([twinPanel[1]]);
    }
  });

  test('#36: the tablist takes its name from aria-labelledby across the shadow boundary (ADR 0007)', async ({
    page,
    browserName,
  }) => {
    await fixture(
      page,
      `<h3 id="sections-heading">Project sections</h3>
       <ds-tabs value="a" aria-labelledby="sections-heading">
         <ds-tab-item slot="tabs" value="a">Alpha</ds-tab-item>
         <ds-tab-panel value="a">Body</ds-tab-panel>
       </ds-tabs>`,
    );
    // The list is inside Tabs' shadow root, so the link is an element reference (no attribute).
    const linked = await page.evaluate(() => {
      const list = document.querySelector('#rel ds-tabs').shadowRoot.querySelector('[part="list"]');
      return {
        supported: 'ariaLabelledByElements' in list,
        targets: (list.ariaLabelledByElements ?? []).map((el) => el.id),
      };
    });
    expect(linked).toEqual({ supported: true, targets: ['sections-heading'] });
    if (browserName === 'chromium') {
      const ax = await axTree(page);
      expect(ax.lists.map((l) => l.name)).toContain('Project sections');
    }
  });
}
