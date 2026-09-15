import { expect, test } from '@playwright/test';

export function navigationRegressions() {
  for (const [kind, role, selected] of [
    ['tabs', 'tab', 'aria-selected'],
    ['radios', 'radio', 'aria-checked'],
  ]) {
    test(`${kind} navigation survives identity changes, disabled updates, and removal`, async ({
      page,
    }) => {
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto('/browser-tests.html');
      const first = page.getByTestId(kind).getByRole(role, { name: `First ${kind}` });
      const second = page.getByTestId(kind).getByRole(role, { name: `Second ${kind}` });
      const update = (patch) =>
        page.evaluate(
          async ({ kind, patch }) => {
            const { updateRoster } = await import('/src/browser-tests.ts');
            updateRoster(kind, patch);
          },
          { kind, patch },
        );

      await expect(first).toHaveAttribute(selected, 'true');
      await first.focus();
      await page.keyboard.press('ArrowRight');
      await expect(second).toBeFocused();
      await expect(second).toHaveAttribute(selected, 'true');

      for (const identity of ['renamed', 'final']) {
        await update({ identity, value: identity });
        await expect(first).toHaveAttribute(selected, 'true');
        await first.focus();
        await page.keyboard.press('ArrowRight');
        await expect(second).toBeFocused();
        await expect(second).toHaveAttribute(selected, 'true');
      }

      await update({ disabled: true });
      await expect(first).toHaveAttribute('aria-disabled', 'true');
      await second.focus();
      await page.keyboard.press(kind === 'tabs' ? 'Home' : 'ArrowRight');
      await expect(kind === 'tabs' ? first : second).toBeFocused();
      await expect(second).toHaveAttribute(selected, 'true');
      await update({ disabled: false });
      await expect(first).not.toHaveAttribute('aria-disabled');
      await update({ visible: false, value: '' });
      await expect(first).toHaveCount(0);
      await expect(second).toHaveAttribute('tabindex', '0');
      await second.focus();
      await page.keyboard.press(kind === 'tabs' ? 'Home' : 'ArrowRight');
      await expect(second).toBeFocused();
      await expect(second).toHaveAttribute(selected, 'true');
      await update({ identity: 'returned', visible: true, value: 'returned' });
      await expect(first).toHaveAttribute('tabindex', '0');
      await first.focus();
      await page.keyboard.press('ArrowRight');
      await expect(second).toBeFocused();
      await expect(second).toHaveAttribute(selected, 'true');
      expect(errors).toEqual([]);
    });
  }
}
