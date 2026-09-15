import { expect, test } from '@playwright/test';
import { navigationRegressions } from './navigation.mjs';

navigationRegressions();

test('accordion relationships resolve before and after a member identity changes', async ({
  page,
}) => {
  await page.goto('/browser-tests.html');
  const trigger = page.getByRole('button', { name: 'Section heading' });
  const panel = page.locator('[data-ds-component="AccordionItem"] [data-ds-part="panel"]');

  async function expectRelationships() {
    await expect(trigger).toHaveAttribute('aria-controls', await panel.getAttribute('id'));
    await expect(panel).toHaveAttribute('aria-labelledby', await trigger.getAttribute('id'));
    await trigger.click();
    await expect(page.getByRole('region', { name: 'Section heading' })).toBeVisible();
    await trigger.click();
  }

  await expect(trigger).toBeVisible();
  await expectRelationships();
  const originalId = await trigger.getAttribute('id');
  await page.locator('#rename-accordion').click();
  await expect(trigger).not.toHaveAttribute('id', originalId);
  await expectRelationships();
});

import { stylingRegressions } from './styling.mjs';
stylingRegressions('angular');
