import { expect, test } from '@playwright/test';

// Form lifecycle for the framework backends (React, Vue, Angular). WC keeps its own suite in
// forms.mjs because its controls are form-associated custom elements; these render native
// inputs, so the platform supplies submission and the generated code supplies reset sync and
// authored-invalid constraint validity. Fixture: apps/<backend>-sandbox/forms-tests.html.

async function entries(page) {
  return page.locator('#form').evaluate((form) => [...new FormData(form).entries()]);
}
const field = (page, name) => page.getByRole('textbox', { name, exact: true });
const act = (page, name) => page.getByRole('button', { name, exact: true }).click();
const INITIAL = [
  ['controlled', 'initial'],
  ['uncontrolled', ''],
  ['required', ''],
  ['outside', 'out'],
];

export function frameworkFormRegressions() {
  test('reset restores DOM, model and submitted answer, and a rerender does not revert it', async ({
    page,
  }) => {
    await page.goto('/forms-tests.html');
    expect(await entries(page)).toEqual(INITIAL);
    await field(page, 'Controlled').fill('edited');
    await field(page, 'Uncontrolled').fill('typed');
    await field(page, 'Outside').fill('moved');
    await expect(page.getByTestId('model')).toHaveText('edited');
    await expect(page.getByTestId('outside-model')).toHaveText('moved');
    expect(await entries(page)).toEqual([
      ['controlled', 'edited'],
      ['uncontrolled', 'typed'],
      ['required', ''],
      ['outside', 'moved'],
    ]);
    const before = Number(await page.getByTestId('count').textContent());
    // A real reset button: the user-initiated path dispatches from native code, which is the
    // case a microtask-timed sync gets wrong.
    await page.getByRole('button', { name: 'Reset answers' }).click();
    await expect.poll(() => entries(page)).toEqual(INITIAL);
    await expect(field(page, 'Controlled')).toHaveValue('initial');
    await expect(field(page, 'Uncontrolled')).toHaveValue('');
    await expect(field(page, 'Outside')).toHaveValue('out');
    await expect(page.getByTestId('model')).toHaveText('initial');
    await expect(page.getByTestId('outside-model')).toHaveText('out');
    // The consumer's model is told once, because it differed from the reset answer.
    await expect(page.getByTestId('count')).toHaveText(String(before + 1));
    // Rerender the fields themselves (invalid is an input of the controlled one) and the parent.
    await page.getByRole('button', { name: 'Toggle invalid' }).click();
    await page.getByRole('button', { name: 'Toggle invalid' }).click();
    await page.getByRole('button', { name: 'Rerender' }).click();
    await expect(field(page, 'Controlled')).toHaveValue('initial');
    await expect(field(page, 'Uncontrolled')).toHaveValue('');
    expect(await entries(page)).toEqual(INITIAL);
  });

  test('reset targets the mounted answer after programmatic changes; a cancelled reset changes nothing', async ({
    page,
  }) => {
    await page.goto('/forms-tests.html');
    await page.getByRole('button', { name: 'Set external' }).click();
    await expect(field(page, 'Controlled')).toHaveValue('external');
    await page.locator('#form').evaluate(async (form) => {
      form.addEventListener('reset', (event) => event.preventDefault(), { once: true });
      form.reset();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    await expect(field(page, 'Controlled')).toHaveValue('external');
    await expect(page.getByTestId('model')).toHaveText('external');
    await page.locator('#form').evaluate((form) => form.reset());
    await expect(field(page, 'Controlled')).toHaveValue('initial');
    await expect(page.getByTestId('model')).toHaveText('initial');
    // Nothing differed for a field already at its answer, so nothing was reported for it.
    await page.locator('#form').evaluate((form) => form.reset());
    await page.waitForTimeout(50);
    await expect(page.getByTestId('count')).toHaveText('1');
  });

  test('authored invalid participates in constraint validation without clobbering consumer messages', async ({
    page,
  }) => {
    await page.goto('/forms-tests.html');
    const submit = page.getByRole('button', { name: 'Submit answers' });
    const controlled = field(page, 'Controlled');
    // Native required is preserved.
    await submit.click();
    await expect(page.locator('#form')).not.toHaveAttribute('data-submitted');
    await field(page, 'Required').fill('present');
    expect(await controlled.evaluate((input) => input.checkValidity())).toBe(true);
    await page.getByRole('button', { name: 'Toggle invalid' }).click();
    await expect(controlled).toHaveAttribute('aria-invalid', 'true');
    await expect.poll(() => controlled.evaluate((input) => input.checkValidity())).toBe(false);
    expect(await controlled.evaluate((input) => input.validity.customError)).toBe(true);
    await expect(controlled).toHaveJSProperty('validationMessage', 'Invalid value.');
    await submit.click();
    await expect(page.locator('#form')).not.toHaveAttribute('data-submitted');
    await page.getByRole('button', { name: 'Toggle invalid' }).click();
    await expect.poll(() => controlled.evaluate((input) => input.checkValidity())).toBe(true);
    await submit.click();
    await expect(page.locator('#form')).toHaveAttribute('data-submitted', 'true');
    // A consumer's own message is theirs: authored invalid neither replaces nor clears it.
    await controlled.evaluate((input) => input.setCustomValidity('Already taken'));
    await page.getByRole('button', { name: 'Toggle invalid' }).click();
    await page.getByRole('button', { name: 'Toggle invalid' }).click();
    await expect(controlled).toHaveJSProperty('validationMessage', 'Already taken');
    await controlled.evaluate((input) => input.setCustomValidity(''));
    expect(await controlled.evaluate((input) => input.checkValidity())).toBe(true);
    // Read-only answers still submit but are barred from validation, as in HTML.
    await page.getByRole('button', { name: 'Toggle invalid' }).click();
    expect(
      await controlled.evaluate((input) => {
        input.readOnly = true;
        return input.willValidate;
      }),
    ).toBe(false);
  });

  test('clearing authored invalid clears its error even while validation is barred', async ({
    page,
  }) => {
    await page.goto('/forms-tests.html');
    const controlled = field(page, 'Controlled');
    const valid = () => controlled.evaluate((input) => input.checkValidity());
    // Read-only: barred from validation, so validationMessage reads '' in between.
    await act(page, 'Toggle invalid');
    await expect.poll(valid).toBe(false);
    await act(page, 'Toggle read-only');
    await expect(controlled).toHaveJSProperty('readOnly', true);
    await act(page, 'Toggle invalid');
    await act(page, 'Toggle read-only');
    await expect(controlled).toHaveJSProperty('readOnly', false);
    await expect.poll(valid).toBe(true);
    expect(await controlled.evaluate((input) => input.validity.customError)).toBe(false);
    // Disabled by its fieldset: barred the same way.
    await act(page, 'Toggle invalid');
    await expect.poll(valid).toBe(false);
    await page.locator('#form-fields').evaluate((fieldset) => {
      fieldset.disabled = true;
    });
    await act(page, 'Toggle invalid');
    await page.locator('#form-fields').evaluate((fieldset) => {
      fieldset.disabled = false;
    });
    await expect.poll(valid).toBe(true);
  });

  test('a consumer error is tracked by writer, not by message text', async ({ page }) => {
    await page.goto('/forms-tests.html');
    const controlled = field(page, 'Controlled');
    await act(page, 'Toggle invalid');
    await expect.poll(() => controlled.evaluate((input) => input.validity.customError)).toBe(true);
    // The consumer writes the very same text the component uses. It is still theirs.
    await controlled.evaluate((input) => input.setCustomValidity('Invalid value.'));
    await act(page, 'Toggle invalid');
    await expect(controlled).not.toHaveAttribute('aria-invalid', 'true');
    expect(await controlled.evaluate((input) => input.validity.customError)).toBe(true);
    await expect(controlled).toHaveJSProperty('validationMessage', 'Invalid value.');
    await controlled.evaluate((input) => input.setCustomValidity(''));
    expect(await controlled.evaluate((input) => input.checkValidity())).toBe(true);
  });

  test('disabled fieldsets and explicit form owners keep native behavior', async ({ page }) => {
    await page.goto('/forms-tests.html');
    await page.locator('#form-fields').evaluate((fieldset) => {
      fieldset.disabled = true;
    });
    expect(await entries(page)).toEqual([['outside', 'out']]);
    await expect(field(page, 'Controlled')).toBeDisabled();
    await page.locator('#form-fields').evaluate((fieldset) => {
      fieldset.disabled = false;
    });
    expect(await entries(page)).toEqual(INITIAL);
    expect(await field(page, 'Outside').evaluate((input) => input.form?.id)).toBe('form');
  });

  test('unmounting removes the reset listener', async ({ page }) => {
    // Count capture-phase document `reset` listeners by identity, installed before the app.
    await page.addInitScript(() => {
      const live = new Set();
      const add = Document.prototype.addEventListener;
      const remove = Document.prototype.removeEventListener;
      Document.prototype.addEventListener = function (type, listener, options) {
        if (type === 'reset') live.add(listener);
        return add.call(this, type, listener, options);
      };
      Document.prototype.removeEventListener = function (type, listener, options) {
        if (type === 'reset') live.delete(listener);
        return remove.call(this, type, listener, options);
      };
      window.__resetListeners = () => live.size;
    });
    await page.goto('/forms-tests.html');
    // At least the four named fields; React's fixture also mounts ref probes.
    await expect
      .poll(() => page.evaluate(() => window.__resetListeners()))
      .toBeGreaterThanOrEqual(4);
    const mounted = await page.evaluate(() => window.__resetListeners());
    await page.getByRole('button', { name: 'Remove outside' }).click();
    await expect(field(page, 'Outside')).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => window.__resetListeners())).toBe(mounted - 1);
    await page.locator('#form').evaluate((form) => form.reset());
    expect(await entries(page)).toEqual(INITIAL.slice(0, 3));
  });

  test('reset discards an uncommitted draft without reporting an edit', async ({ page }) => {
    await page.goto('/editing-tests.html?mode=commit');
    const input = page.getByRole('textbox', { name: 'Edit probe' });
    await input.evaluate((control) => {
      const form = document.createElement('form');
      form.id = 'form';
      control.before(form);
      form.append(control);
    });
    await input.fill('uncommitted');
    await page.locator('#form').evaluate((form) => form.reset());
    await expect(input).toHaveValue('');
    expect(await entries(page)).toEqual([['draft', '']]);
    // Rerender: the field must not resurrect the discarded draft, and must not commit it.
    await page.getByRole('button', { name: 'Rerender' }).click();
    await expect(input).toHaveValue('');
    await input.blur();
    await expect(page.getByTestId('value')).toHaveText('');
    await expect(page.getByTestId('count')).toHaveText('0');
  });
}

// React only: the generated component composes its own ref with the consumer's. React 19 calls a
// callback ref's returned cleanup INSTEAD of calling it with null, so the composition must return
// the consumer's cleanup when there is one and fall back to ref(null) when there is not.
export function reactRefRegressions() {
  test('composed refs preserve React 19 callback-ref cleanup', async ({ page }) => {
    await page.goto('/forms-tests.html');
    await expect(field(page, 'Cleanup probe')).toBeVisible();
    await act(page, 'Remove probes');
    await expect(field(page, 'Cleanup probe')).toHaveCount(0);
    expect(await page.evaluate(() => window.__refCounts)).toEqual({
      cleanup: 1,
      cleanupNull: 0,
      nullCalls: 1,
    });
  });
}
