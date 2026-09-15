import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
const suite = (name) =>
  JSON.parse(
    readFileSync(
      new URL(`../../packages/contracts/conformance/${name}.json`, import.meta.url),
      'utf8',
    ),
  ).cases.filter((c) => c.needsARenderedDOM);

export function browserConformance() {
  for (const c of suite('linear-navigation'))
    for (const pattern of c.patterns) {
      test(`conformance: ${c.id} (${pattern})`, async ({ page }) => {
        const params = new URLSearchParams({ pattern, selected: c.given.selected ?? '' });
        await page.goto(`/conformance-tests.html?${params}`);
        const role = pattern === 'radio' ? 'radio' : 'tab';
        const member = (id) => page.getByRole(role, { name: id, exact: true });
        await expect(page.getByRole(role)).toHaveCount(c.given.items.length);
        switch (c.id) {
          case 'entry-lands-on-the-selected-member':
          case 'entry-with-nothing-selected-lands-on-first':
            await page.locator('#before').focus();
            await page.keyboard.press('Tab');
            await expect(member(c.expect.focused)).toBeFocused();
            await page.keyboard.press('Tab');
            await expect(page.locator('#after')).toBeFocused();
            await page.keyboard.press('Shift+Tab');
            await expect(member(c.expect.focused)).toBeFocused();
            break;
          case 'exactly-one-member-in-the-tab-sequence':
            for (const id of c.given.items)
              await expect(member(id)).toHaveAttribute(
                'tabindex',
                c.expect.tabbable.includes(id) ? '0' : '-1',
              );
            await page.locator('#before').focus();
            await page.keyboard.press('Tab');
            await expect(member(c.expect.tabbable[0])).toBeFocused();
            await page.keyboard.press('Tab');
            await expect(page.locator('#after')).toBeFocused();
            break;
          case 'tabs-space-activates-when-focus-does-not':
            await member(c.given.selected).focus();
            await page.keyboard.press('ArrowRight');
            await expect(member(c.given.focused)).toBeFocused();
            await expect(page.getByTestId('selected')).toHaveText(c.given.selected);
            await page.keyboard.press('Space');
            await expect(member(c.expect.focused)).toBeFocused();
            await expect(page.getByTestId('selected')).toHaveText(c.expect.selected);
            await expect(page.getByTestId('changes')).toHaveText('1');
            break;
          case 'reselecting-the-selected-member-is-inert':
            await member(c.given.focused).focus();
            await page.keyboard.press('Space');
            await expect(page.getByTestId('selected')).toHaveText(c.expect.selected);
            await expect(page.getByTestId('changes')).toHaveText('0');
            // Confirm actual activation is wired: selecting a different member reports exactly once.
            await member('b').click();
            await expect(page.getByTestId('changes')).toHaveText('1');
            break;
          default:
            throw new Error(`Missing browser implementation for ${c.id}`);
        }
      });
    }
  for (const c of suite('dismissal'))
    test(`conformance: ${c.id}`, async ({ page }) => {
      await page.goto('/conformance-tests.html?kind=dismissal');
      // Test pointer drags, not native HTML text drag-and-drop, which can consume the next click.
      await page.evaluate(() => {
        document.addEventListener('dragstart', (event) => event.preventDefault());
        document.addEventListener('click', (event) => {
          document.body.dataset.clickHandled = String(event.defaultPrevented);
        });
      });
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await dialog.evaluate((node) =>
        Object.assign(node.style, {
          position: 'fixed',
          left: '150px',
          top: '100px',
          margin: '0',
          width: '300px',
          height: '220px',
          maxWidth: 'none',
          padding: '40px',
          boxSizing: 'border-box',
          overflow: 'visible',
        }),
      );
      const box = await dialog.boundingBox();
      expect(box).not.toBeNull();
      const backdrop = { x: box.x - 30, y: box.y + box.height / 2 };
      switch (c.id) {
        case 'a-press-on-the-regions-own-padding-does-not-dismiss':
          await page.mouse.click(box.x + 10, box.y + 10);
          break;
        case 'a-press-on-a-child-outside-the-regions-box-does-not-dismiss':
          await page
            .locator('#overflow')
            .evaluate(
              (node, { x, y }) =>
                Object.assign(node.style, { position: 'fixed', left: `${x}px`, top: `${y}px` }),
              { x: box.x + box.width + 30, y: box.y + 80 },
            );
          expect((await page.locator('#overflow').boundingBox()).x).toBeGreaterThan(
            box.x + box.width,
          );
          await page.locator('#overflow').click();
          break;
        case 'a-press-beginning-on-the-backdrop-and-released-inside-does-not-dismiss': {
          const inside = await page.locator('#inside').boundingBox();
          await page.mouse.move(backdrop.x, backdrop.y);
          await page.mouse.down();
          await page.mouse.move(inside.x + inside.width / 2, inside.y + inside.height / 2);
          await page.mouse.up();
          await expect(dialog).toBeVisible();
          await page.mouse.down();
          await page.mouse.move(backdrop.x, backdrop.y);
          await page.mouse.up();
          break;
        }
        default:
          throw new Error(`Missing browser implementation for ${c.id}`);
      }
      await expect(dialog).toBeVisible();
      await expect(page.getByTestId('open')).toHaveText(String(!c.expect.dismissed));
      await expect(page.locator('body')).toHaveAttribute(
        'data-click-handled',
        String(c.expect.handled),
      );
      // Positive control: a complete backdrop click must close this very same rendered dialog.
      await page.mouse.click(backdrop.x, backdrop.y);
      await expect(dialog).not.toBeVisible();
      await expect(page.getByTestId('open')).toHaveText('false');
      await expect(page.locator('body')).toHaveAttribute('data-click-handled', 'true');
    });
}
