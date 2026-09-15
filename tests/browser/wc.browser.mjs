import { expect, test } from '@playwright/test';
import { navigationRegressions } from './navigation.mjs';
import { activationRegressions } from './activation.mjs';

navigationRegressions();
activationRegressions();

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

import { stylingRegressions } from './styling.mjs';
stylingRegressions('wc');

import { editingRegressions } from './editing.mjs';
editingRegressions();

test('known relationship gaps remain explicitly non-conforming (ADR 0005)', async ({ page }) => {
  await page.goto('/browser-tests.html');
  await page.evaluate(() => {
    const field = document.createElement('ds-field');
    field.id = 'relationship-field';
    field.innerHTML =
      '<span slot="label">Account</span><input slot="control"><span slot="description">Help</span>';
    document.body.append(field);
    const panel = document.createElement('ds-tab-panel');
    panel.value = 'a';
    panel.id = 'relationship-panel';
    document.querySelector('#tabs').append(panel);
  });
  await expect(page.locator('#relationship-field').getByRole('textbox')).toHaveAccessibleName('');
  await expect(page.locator('#relationship-field [part="control"]')).toHaveAttribute(
    'aria-labelledby',
    /label/,
  );
  await expect(page.locator('#tabs').getByRole('tab').first()).not.toHaveAttribute('aria-controls');
  await expect(page.locator('#relationship-panel').getByRole('tabpanel')).toHaveAccessibleName('');

  // Even element reflection rejects a sibling's internal semantic element.
  const scope = await page.evaluate(() => {
    const tabHost = document.querySelector('#tabs ds-tab-item');
    const panelHost = document.querySelector('#relationship-panel');
    const tab = tabHost.shadowRoot.querySelector('[part="root"]');
    const panel = panelHost.shadowRoot.querySelector('[part="root"]');
    const supported = 'ariaControlsElements' in tab;
    if (!supported) return { supported };
    tab.ariaControlsElements = [panel];
    const siblingCount = tab.ariaControlsElements.length;
    tab.ariaControlsElements = [panelHost];
    const hostCount = tab.ariaControlsElements.length;
    tab.ariaControlsElements = [];
    return { supported, siblingCount, hostCount };
  });
  if (scope.supported) expect(scope).toEqual({ supported: true, siblingCount: 0, hostCount: 1 });
});

import { formRegressions } from './forms.mjs';
formRegressions();
