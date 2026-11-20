import { test, expect } from '@playwright/test';

// Relations a slot-filled part declares land on the element the consumer SUPPLIES — Field's
// `control` (#35) and Tooltip's `trigger` (#46) — in every backend and engine. Each assertion reads
// the accessible name/description the browser COMPUTES for the consumer's own element, not the
// attributes on any wrapper: a wrapper's labelled-by is exactly what passed before and named nothing.
//
// Fixtures: apps/<backend>-sandbox/relations-tests.html, the same DOM in all four sandboxes.
export function relationRegressions() {
  test('Field names and describes the supplied control, and tracks invalid', async ({ page }) => {
    await page.goto('/relations-tests.html');
    const control = page.locator('#field-a').getByRole('textbox');
    await expect(control).toHaveAccessibleName('Account');
    await expect(control).toHaveAccessibleDescription('Use your account name');
    await expect(control).not.toHaveAttribute('aria-invalid');

    await page.getByRole('button', { name: 'Toggle invalid' }).click();
    await expect(control).toHaveAccessibleDescription('Use your account name Required');
    await expect(control).toHaveAttribute('aria-invalid', 'true');

    await page.getByRole('button', { name: 'Toggle invalid' }).click();
    await expect(control).toHaveAccessibleDescription('Use your account name');
    await expect(control).not.toHaveAttribute('aria-invalid');
  });

  test('clicking the Field label focuses the supplied control', async ({ page }) => {
    await page.goto('/relations-tests.html');
    await page.locator('#field-a').getByText('Account', { exact: true }).click();
    await expect(page.locator('#field-a').getByRole('textbox')).toBeFocused();
  });

  test('a replaced control is wired in its place', async ({ page }) => {
    await page.goto('/relations-tests.html');
    await page.getByRole('button', { name: 'Toggle invalid' }).click();
    await page.getByRole('button', { name: 'Swap control' }).click();
    const control = page.locator('#field-a textarea');
    await expect(control).toHaveAccessibleName('Account');
    await expect(control).toHaveAccessibleDescription('Use your account name Required');
    await expect(control).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#field-a').getByRole('textbox')).toHaveCount(1);
  });

  test('consumer id and aria-describedby on the control are kept, not overwritten', async ({
    page,
  }) => {
    await page.goto('/relations-tests.html');
    const control = page.locator('#own-id');
    await expect(control).toHaveAccessibleName('Account B');
    await expect(control).toHaveAccessibleDescription('Consumer hint Help B');
    await page.locator('#field-b').getByText('Account B', { exact: true }).click();
    await expect(control).toBeFocused();
  });

  test('Tooltip describes the supplied trigger only while open, merged with its own', async ({
    page,
  }) => {
    await page.goto('/relations-tests.html');
    const trigger = page.getByRole('button', { name: 'Info' });
    await expect(trigger).toHaveAccessibleDescription('Extra');
    await page.getByRole('button', { name: 'Toggle tooltip' }).click();
    await expect(trigger).toHaveAccessibleDescription('Extra Helpful text');
    await page.getByRole('button', { name: 'Toggle tooltip' }).click();
    await expect(trigger).toHaveAccessibleDescription('Extra');
  });
}
