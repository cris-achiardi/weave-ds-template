import { expect, test } from '@playwright/test';
import { navigationRegressions } from './navigation.mjs';

navigationRegressions();

for (const [tag, role] of [
  ['ds-text-field', 'textbox'],
  ['ds-button', 'button'],
  ['ds-slider', 'slider'],
]) {
  test(`${tag} forwards a literal accessible name, updates, and removal`, async ({ page }) => {
    await page.goto('/browser-tests.html');
    await page.evaluate(async (tagName) => {
      await customElements.whenDefined(tagName);
      const host = document.createElement(tagName);
      host.id = 'named-control';
      host.setAttribute('aria-label', 'Initial name');
      document.body.append(host);
    }, tag);
    const host = page.locator('#named-control');
    const control = host.getByRole(role);
    await expect(control).toHaveAccessibleName('Initial name');
    await host.evaluate((node) => {
      node.ariaLabel = 'Updated name';
    });
    await expect(control).toHaveAccessibleName('Updated name');
    await host.evaluate((node) => node.removeAttribute('aria-label'));
    await expect(control).toHaveAccessibleName('');
    await expect(control).not.toHaveAttribute('aria-label');
  });
}

test('consumer labels preserve contract-owned dialog naming and control roles', async ({
  page,
}) => {
  await page.goto('/browser-tests.html');
  await page.evaluate(async () => {
    await customElements.whenDefined('ds-dialog');
    const host = document.createElement('ds-dialog');
    host.innerHTML = '<span slot="title">Contract title</span>';
    host.setAttribute('aria-label', 'Fallback name');
    host.setAttribute('role', 'alert');
    document.body.append(host);
    host.open = true;
  });
  await expect(page.locator('ds-dialog').getByRole('dialog')).toHaveAccessibleName(
    'Contract title',
  );
});

test('dialog accepts open state while detached and presents again after reconnection', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/browser-tests.html');
  await page.evaluate(async () => {
    await customElements.whenDefined('ds-dialog');
    const dialog = document.createElement('ds-dialog');
    dialog.id = 'dialog';
    dialog.innerHTML = '<span slot="title">Confirmation</span><button>Continue</button>';
    dialog.open = true;
    document.body.append(dialog);
  });
  const host = page.locator('#dialog');
  const modal = host.locator('dialog');
  await expect(modal).toBeVisible();
  expect(errors).toEqual([]);
  await expect(modal).toHaveJSProperty('open', true);
  expect(await modal.evaluate((node) => node.matches(':modal'))).toBe(true);

  await host.evaluate(async (node) => {
    node.remove();
    await new Promise((resolve) => setTimeout(resolve, 0));
    document.body.append(node);
  });
  await expect(host).toHaveJSProperty('open', true);
  expect(await modal.evaluate((node) => node.matches(':modal'))).toBe(true);

  await page.keyboard.press('Escape');
  await expect(host).toHaveJSProperty('open', false);
  await expect(modal).not.toBeVisible();
  await host.evaluate((node) => {
    node.remove();
    node.open = true;
    node.open = false;
    document.body.append(node);
  });
  await expect(modal).not.toBeVisible();
  await host.evaluate((node) => {
    node.open = true;
  });
  await expect(modal).toBeVisible();
  await host.evaluate((node) => {
    node.open = false;
  });
  await expect(modal).not.toBeVisible();
  expect(errors).toEqual([]);
});
