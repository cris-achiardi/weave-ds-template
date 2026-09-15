import { expect, test } from '@playwright/test';

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
