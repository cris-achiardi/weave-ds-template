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
    // A native control is wired now (tests/browser/relations.mjs). What remains is a supplied
    // control that is ITSELF a shadow host: the relations land on ds-text-field's host, and its
    // focusable <input> is inside its own shadow root, out of reach of an IDREF.
    field.innerHTML =
      '<span slot="label">Account</span><ds-text-field slot="control"></ds-text-field><span slot="description">Help</span>';
    document.body.append(field);
    const panel = document.createElement('ds-tab-panel');
    panel.value = 'a';
    panel.id = 'relationship-panel';
    document.querySelector('#tabs').append(panel);
  });
  await expect(page.locator('#relationship-field').getByRole('textbox')).toHaveAccessibleName('');
  await expect(page.locator('#relationship-field ds-text-field')).toHaveAttribute(
    'aria-labelledby',
    /label/,
  );
  // The tab <-> panel gap this test used to characterize is closed (#36): see tab-relations.mjs.

  // The platform fact that forced the host-root design, kept as a characterization: element
  // reflection rejects a target inside a SIBLING's shadow root and keeps one on its host.
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

test('a replaced slotted control is handed back clean', async ({ page }) => {
  await page.goto('/relations-tests.html');
  await page.getByRole('button', { name: 'Toggle invalid' }).click();
  await page.getByRole('button', { name: 'Swap control' }).click();
  const leftovers = await page.evaluate(() =>
    window.replaced.getAttributeNames().filter((n) => n !== 'slot'),
  );
  expect(leftovers).toEqual([]);
});

// PR #53 review findings: consumer values survive detach, and a queued slotchange after detach
// does not re-wire a released element.
test('detaching a Field keeps consumer relation tokens and a consumer-changed aria-invalid', async ({
  page,
}) => {
  await page.goto('/relations-tests.html');
  const result = await page.evaluate(async () => {
    const field = document.createElement('ds-field');
    field.innerHTML =
      '<span slot="label" id="consumer-label">Account</span>' +
      '<input slot="control" aria-labelledby="consumer-label" aria-invalid="grammar">' +
      '<span slot="error">Required</span>';
    field.invalid = true;
    document.body.append(field);
    await new Promise((r) => setTimeout(r));
    const input = field.querySelector('input');
    const attached = {
      labelledBy: input.getAttribute('aria-labelledby'),
      invalid: input.getAttribute('aria-invalid'),
    };
    input.setAttribute('aria-invalid', 'spelling');
    field.remove();
    await new Promise((r) => setTimeout(r));
    return {
      attached,
      detached: {
        labelledBy: input.getAttribute('aria-labelledby'),
        invalid: input.getAttribute('aria-invalid'),
      },
    };
  });
  expect(result).toEqual({
    attached: { labelledBy: 'consumer-label', invalid: 'true' },
    detached: { labelledBy: 'consumer-label', invalid: 'spelling' },
  });
});

test('attach and detach in one task leaves nothing behind; reconnect re-wires', async ({
  page,
}) => {
  await page.goto('/relations-tests.html');
  const result = await page.evaluate(async () => {
    const tick = () => new Promise((r) => setTimeout(r));
    const field = document.createElement('ds-field');
    field.innerHTML =
      '<span slot="label">Account</span><input slot="control"><span slot="description">Help</span>';
    const input = field.querySelector('input');
    const names = () => input.getAttributeNames().filter((n) => n !== 'slot');
    document.body.append(field);
    field.remove();
    await tick();
    const afterRapid = [...names(), ...field.querySelector('span').getAttributeNames()];
    document.body.append(field);
    await tick();
    const reconnected = names().sort();
    field.remove();
    await tick();
    return {
      afterRapid,
      reconnected,
      afterDetach: [...names(), ...field.querySelector('span').getAttributeNames()],
    };
  });
  expect(result).toEqual({
    afterRapid: ['slot'],
    reconnected: ['aria-describedby', 'aria-labelledby'],
    afterDetach: ['slot'],
  });
});

import { relationRegressions } from './relations.mjs';
relationRegressions();

import { formRegressions } from './forms.mjs';
formRegressions();

import { browserConformance } from './conformance.mjs';
browserConformance();

import { tablistOwnershipRegressions } from './tablist.mjs';
tablistOwnershipRegressions('wc');

import { tabRelationRegressions } from './tab-relations.mjs';
tabRelationRegressions();
