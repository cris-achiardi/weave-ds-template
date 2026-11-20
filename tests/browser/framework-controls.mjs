import { expect, test } from '@playwright/test';

// Form contribution for the custom controls (Checkbox, Switch, Slider, RadioGroup) in the framework
// backends. They render no native form control, so each contributes through a hidden, validatable
// proxy input (packages/wc/forms.md). Fixture: apps/<backend>-sandbox/controls-tests.html.
// The WC equivalents are in forms.mjs and stay there.

async function entries(page) {
  return page.locator('#form').evaluate((form) => [...new FormData(form).entries()]);
}
const INITIAL = [
  ['consent', 'on'],
  ['setting', 'on'],
  ['amount', '25'],
  ['choice', 'b'],
];
const act = (page, name) => page.getByRole('button', { name, exact: true }).click();
const consent = (page) => page.getByRole('checkbox', { name: 'Consent' });
const slider = (page) => page.getByRole('slider', { name: 'Amount' });
const radio = (page, name) => page.getByRole('radio', { name });

// Live MutationObservers and capture-phase document `reset` listeners, counted by identity.
function spyOnLifecycle() {
  const observers = new Set();
  const resets = new Set();
  const observe = MutationObserver.prototype.observe;
  const disconnect = MutationObserver.prototype.disconnect;
  MutationObserver.prototype.observe = function (...args) {
    observers.add(this);
    return observe.apply(this, args);
  };
  MutationObserver.prototype.disconnect = function () {
    observers.delete(this);
    return disconnect.call(this);
  };
  const add = Document.prototype.addEventListener;
  const remove = Document.prototype.removeEventListener;
  Document.prototype.addEventListener = function (type, listener, options) {
    if (type === 'reset') resets.add(listener);
    return add.call(this, type, listener, options);
  };
  Document.prototype.removeEventListener = function (type, listener, options) {
    if (type === 'reset') resets.delete(listener);
    return remove.call(this, type, listener, options);
  };
  window.__lifecycle = () => ({ observers: observers.size, resets: resets.size });
}

export function frameworkControlRegressions() {
  test('custom controls serialize edits, checked state and a single selection', async ({
    page,
  }) => {
    await page.goto('/controls-tests.html');
    expect(await entries(page)).toEqual(INITIAL);
    await consent(page).click();
    await page.getByRole('switch', { name: 'Setting' }).click();
    await slider(page).press('ArrowRight');
    await radio(page, 'Alpha').click();
    await expect
      .poll(() => entries(page))
      .toEqual([
        ['amount', '26'],
        ['choice', 'a'],
      ]);
    await act(page, 'Mix consent');
    expect((await entries(page)).some(([key]) => key === 'consent')).toBe(false);
    await act(page, 'Accept value');
    await act(page, 'Check consent');
    await expect.poll(() => entries(page)).toContainEqual(['consent', 'accepted']);
    // Outside the form, owned through `form="form"`: one entry, after the form's own.
    await page.getByRole('checkbox', { name: 'Remote' }).click();
    await expect.poll(async () => (await entries(page)).at(-1)).toEqual(['remote', 'on']);
    await act(page, 'Clear amount name');
    await expect.poll(async () => (await entries(page)).some(([k]) => k === 'amount')).toBe(false);
    expect((await entries(page)).filter(([k]) => k === 'choice')).toEqual([['choice', 'a']]);
  });

  test('required and authored invalid block real submission; the proxy forwards focus', async ({
    page,
  }) => {
    await page.goto('/controls-tests.html');
    const form = page.locator('#form');
    const submit = page.getByRole('button', { name: 'Submit answers' });
    await act(page, 'Require consent');
    await act(page, 'Mix consent');
    await expect
      .poll(() => form.evaluate((f) => f.elements.namedItem('consent').validity.valueMissing))
      .toBe(true);
    await submit.click();
    await expect(form).not.toHaveAttribute('data-submitted');
    // Interactive validation focuses the first invalid control: the proxy hands it to the root.
    await expect(consent(page)).toBeFocused();
    await act(page, 'Check consent');
    await act(page, 'Toggle invalid');
    await expect
      .poll(() => form.evaluate((f) => f.elements.namedItem('consent').validationMessage))
      .toBe('Invalid value.');
    await submit.click();
    await expect(form).not.toHaveAttribute('data-submitted');
    await act(page, 'Toggle invalid');
    await expect.poll(() => form.evaluate((f) => f.checkValidity())).toBe(true);
    await submit.click();
    await expect(form).toHaveAttribute('data-submitted', 'true');
    // A consumer's own message is theirs: authored invalid neither replaces nor clears it.
    await form.evaluate((f) => f.elements.namedItem('consent').setCustomValidity('Nope'));
    await act(page, 'Toggle invalid');
    await act(page, 'Toggle invalid');
    expect(await form.evaluate((f) => f.elements.namedItem('consent').validationMessage)).toBe(
      'Nope',
    );
  });

  test('proxy validity is tracked by writer and survives a barred transition', async ({ page }) => {
    await page.goto('/controls-tests.html');
    const form = page.locator('#form');
    const proxy = (fn) =>
      form.evaluate((f, body) => new Function('p', body)(f.elements.namedItem('consent')), fn);
    // Barred while its fieldset is disabled: clearing authored invalid must still clear it.
    await act(page, 'Toggle invalid');
    await expect.poll(() => proxy('return p.validity.customError')).toBe(true);
    await page.locator('#form-fields').evaluate((fieldset) => {
      fieldset.disabled = true;
    });
    await act(page, 'Toggle invalid');
    await page.locator('#form-fields').evaluate((fieldset) => {
      fieldset.disabled = false;
    });
    await expect.poll(() => form.evaluate((f) => f.checkValidity())).toBe(true);
    // A consumer message with the very same text is the consumer's.
    await act(page, 'Toggle invalid');
    await expect.poll(() => proxy('return p.validity.customError')).toBe(true);
    await proxy("p.setCustomValidity('Invalid value.')");
    await act(page, 'Toggle invalid');
    await expect(consent(page)).not.toHaveAttribute('aria-invalid', 'true');
    expect(await proxy('return p.validity.customError')).toBe(true);
    await proxy("p.setCustomValidity('')");
    expect(await form.evaluate((f) => f.checkValidity())).toBe(true);
  });

  test('disabled fieldsets suppress answers and interaction without changing explicit disabled state', async ({
    page,
  }) => {
    await page.goto('/controls-tests.html');
    await page.locator('#form-fields').evaluate((fieldset) => {
      fieldset.disabled = true;
    });
    expect(await entries(page)).toEqual([]);
    await expect(consent(page)).toBeDisabled();
    await expect(slider(page)).toHaveAttribute('aria-disabled', 'true');
    await slider(page).dispatchEvent('keydown', { key: 'ArrowRight' });
    await expect(slider(page)).toHaveAttribute('aria-valuenow', '25');
    await radio(page, 'Alpha').dispatchEvent('click');
    await expect(radio(page, 'Beta')).toHaveAttribute('aria-checked', 'true');
    await page.locator('#form-fields').evaluate((fieldset) => {
      fieldset.disabled = false;
    });
    await expect(consent(page)).toBeEnabled();
    await expect(slider(page)).not.toHaveAttribute('aria-disabled', 'true');
    expect(await entries(page)).toEqual(INITIAL);
    await act(page, 'Disable consent');
    await expect.poll(async () => (await entries(page)).length).toBe(3);
  });

  test('reset restores the mounted answers, notifies a differing model once, and honours cancellation', async ({
    page,
  }) => {
    await page.goto('/controls-tests.html');
    await consent(page).click();
    await page.getByRole('switch', { name: 'Setting' }).click();
    await slider(page).press('End');
    await radio(page, 'Alpha').click();
    await page.getByRole('checkbox', { name: 'Remote' }).click();
    await expect(page.getByTestId('consent-model')).toHaveText('unchecked');
    const before = Number(await page.getByTestId('count').textContent());
    await page.locator('#form').evaluate(async (form) => {
      form.addEventListener('reset', (event) => event.preventDefault(), { once: true });
      form.reset();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    await expect(page.getByTestId('consent-model')).toHaveText('unchecked');
    await page.getByRole('button', { name: 'Reset answers' }).click();
    await expect.poll(() => entries(page)).toEqual(INITIAL);
    await expect(consent(page)).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByRole('switch', { name: 'Setting' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await expect(slider(page)).toHaveAttribute('aria-valuenow', '25');
    await expect(radio(page, 'Beta')).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByTestId('consent-model')).toHaveText('checked');
    await expect(page.getByTestId('remote-model')).toHaveText('unchecked');
    await expect(page.getByTestId('count')).toHaveText(String(before + 1));
  });

  test('releasing a proxy leaves a newer consumer override in place', async ({ page }) => {
    await page.goto('/controls-tests.html');
    await page.locator('#form').evaluate((form) => {
      const proxy = form.elements.namedItem('remote');
      const newer = function (message) {
        HTMLInputElement.prototype.setCustomValidity.call(this, message);
      };
      proxy.setCustomValidity = newer;
      window.__newer = { proxy, newer };
    });
    await act(page, 'Remove remote');
    await expect(page.getByRole('checkbox', { name: 'Remote' })).toHaveCount(0);
    expect(
      await page.evaluate(() => window.__newer.proxy.setCustomValidity === window.__newer.newer),
    ).toBe(true);
  });

  test('unmounting removes the reset listener and the fieldset observer', async ({ page }) => {
    await page.addInitScript(spyOnLifecycle);
    await page.goto('/controls-tests.html');
    // Five form controls: Consent, Setting, Amount, Choice, Remote. Other code may observe too,
    // so the assertion is the difference unmounting one control makes.
    await expect.poll(async () => (await page.evaluate(() => window.__lifecycle())).resets).toBe(5);
    const mounted = await page.evaluate(() => window.__lifecycle());
    expect(mounted.observers).toBeGreaterThanOrEqual(5);
    await act(page, 'Remove remote');
    await expect(page.getByRole('checkbox', { name: 'Remote' })).toHaveCount(0);
    await expect
      .poll(() => page.evaluate(() => window.__lifecycle()))
      .toEqual({
        observers: mounted.observers - 1,
        resets: 4,
      });
  });
}
