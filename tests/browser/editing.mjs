import { test, expect } from '@playwright/test';
export function editingRegressions() {
  for (const mode of ['live', 'commit'])
    test(`${mode} editing preserves drafts and respects external values`, async ({ page }) => {
      await page.goto(`/editing-tests.html?mode=${mode}`);
      const input = page.getByRole('textbox', { name: 'Edit probe' });
      await input.pressSequentially('abc');
      await expect(input).toHaveValue('abc');
      await expect(page.getByTestId('value')).toHaveText(mode === 'live' ? 'abc' : '');
      await expect(page.getByTestId('count')).toHaveText(mode === 'live' ? '3' : '0');
      await page.getByRole('button', { name: 'Rerender', exact: true }).click();
      await expect(page.getByTestId('tick')).toHaveText('1');
      await expect(input).toBeFocused();
      await expect(input).toHaveValue('abc');
      await page.getByRole('button', { name: 'Finish', exact: true }).click();
      await expect(page.getByTestId('value')).toHaveText('abc');
      await expect(page.getByTestId('count')).toHaveText(mode === 'live' ? '3' : '1');
      await input.focus();
      await page.getByRole('button', { name: 'Finish', exact: true }).click();
      await expect(page.getByTestId('count')).toHaveText(mode === 'live' ? '3' : '1');
      await input.fill('unfinished');
      await page.getByRole('button', { name: 'Set external', exact: true }).click();
      await expect(input).toHaveValue('external');
      await expect(page.getByTestId('value')).toHaveText('external');
    });
}
