import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
const prefix = JSON.parse(
  readFileSync(new URL('../../ds.config.json', import.meta.url), 'utf8'),
).dataPrefix;
export function stylingRegressions(backend) {
  test('semantic root, part handles, and default axes are reachable by consumer CSS', async ({
    page,
  }) => {
    await page.goto('/browser-tests.html');
    const button = page.getByRole('button', { name: 'Style probe', exact: true });
    await expect(button).toBeVisible();
    expect(await button.evaluate((el) => el.tagName)).toBe('BUTTON');
    if (backend === 'wc') {
      const host = page.locator(`${prefix}-button`).filter({ hasText: 'Style probe' });
      await expect(host).toHaveAttribute('hierarchy', 'secondary');
      await expect(host).toHaveAttribute('size', 'm');
      await expect(button).toHaveAttribute('part', 'root');
      await expect(host.locator('[part="label"]')).toBeVisible();
      await host.evaluate((el) => {
        const style = document.createElement('style');
        style.textContent =
          ':host([hierarchy="secondary"]) [part="label"] { color: rgb(12, 34, 56); }';
        el.shadowRoot.append(style);
      });
      await expect(host.locator('[part="label"]')).toHaveCSS('color', 'rgb(12, 34, 56)');
    } else {
      await expect(button).toHaveAttribute(`data-${prefix}-component`, 'Button');
      await expect(button).toHaveAttribute(`data-${prefix}-hierarchy`, 'secondary');
      await expect(button).toHaveAttribute(`data-${prefix}-size`, 'm');
      const selector = `[data-${prefix}-component="Button"][data-${prefix}-hierarchy="secondary"] [data-${prefix}-part="label"]`;
      await page.addStyleTag({ content: `${selector} { color: rgb(12, 34, 56); }` });
      await expect(button.locator(`[data-${prefix}-part="label"]`)).toHaveCSS(
        'color',
        'rgb(12, 34, 56)',
      );
    }
  });
}
