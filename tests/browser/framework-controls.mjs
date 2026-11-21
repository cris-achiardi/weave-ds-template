import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { formDisabledKey } from '../../packages/emit-web/form-disabled.mjs';

// The shared observer's registry key, derived from the data prefix exactly as the emitters do, so
// a branded repository (pnpm init-ds) tests its own key rather than the template's.
const REGISTRY_KEY = formDisabledKey(
  JSON.parse(readFileSync(new URL('../../ds.config.json', import.meta.url), 'utf8')).dataPrefix,
);

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

  test('moving a control into or out of a disabled fieldset refreshes effective disabled', async ({
    page,
  }) => {
    await page.goto('/controls-tests.html');
    const choice = page.getByRole('radiogroup', { name: 'Choice' });
    // A disabled fieldset already in the form; the mounted controls are moved into it.
    await page.locator('#form').evaluate((form) => {
      const parked = document.createElement('fieldset');
      parked.id = 'parked';
      parked.disabled = true;
      form.append(parked);
    });
    await slider(page).evaluate((root) => document.querySelector('#parked').append(root));
    await choice.evaluate((root) => document.querySelector('#parked').append(root));
    await expect(slider(page)).toHaveAttribute('aria-disabled', 'true');
    await slider(page).dispatchEvent('keydown', { key: 'ArrowRight' });
    await expect(slider(page)).toHaveAttribute('aria-valuenow', '25');
    await radio(page, 'Alpha').dispatchEvent('click');
    await expect(radio(page, 'Beta')).toHaveAttribute('aria-checked', 'true');
    expect((await entries(page)).some(([k]) => k === 'amount' || k === 'choice')).toBe(false);
    // And back out: re-enabled, interactive, contributing.
    await slider(page).evaluate((root) => document.querySelector('#form-fields').append(root));
    await expect(slider(page)).not.toHaveAttribute('aria-disabled', 'true');
    await slider(page).press('ArrowRight');
    await expect(slider(page)).toHaveAttribute('aria-valuenow', '26');
    await expect.poll(() => entries(page)).toContainEqual(['amount', '26']);
  });

  // The first <legend> of a disabled fieldset exempts its contents. Which legend is first can change
  // without the control moving, so a child-list change on the fieldset itself must re-ask.
  test('a legend prepended to a disabled fieldset disables the controls in the old first legend', async ({
    page,
  }) => {
    await page.goto('/controls-tests.html');
    await page.locator('#form').evaluate((form, usurped) => {
      const fieldset = document.createElement('fieldset');
      fieldset.id = 'legendary';
      fieldset.disabled = true;
      const holder = document.createElement('legend');
      holder.id = 'holder';
      fieldset.append(holder);
      if (usurped) {
        const first = document.createElement('legend');
        first.id = 'usurper';
        fieldset.prepend(first);
      }
      form.append(fieldset);
    }, false);
    await slider(page).evaluate((root) => document.querySelector('#holder').append(root));
    await expect(slider(page)).not.toHaveAttribute('aria-disabled', 'true');
    await page.locator('#legendary').evaluate((fieldset) => {
      fieldset.prepend(document.createElement('legend'));
    });
    await expect(slider(page)).toHaveAttribute('aria-disabled', 'true');
    await slider(page).dispatchEvent('keydown', { key: 'ArrowRight' });
    await expect(slider(page)).toHaveAttribute('aria-valuenow', '25');
  });

  test('removing the first legend of a disabled fieldset re-enables the controls in the next one', async ({
    page,
  }) => {
    await page.goto('/controls-tests.html');
    await page.locator('#form').evaluate((form, usurped) => {
      const fieldset = document.createElement('fieldset');
      fieldset.id = 'legendary';
      fieldset.disabled = true;
      const holder = document.createElement('legend');
      holder.id = 'holder';
      fieldset.append(holder);
      if (usurped) {
        const first = document.createElement('legend');
        first.id = 'usurper';
        fieldset.prepend(first);
      }
      form.append(fieldset);
    }, true);
    await slider(page).evaluate((root) => document.querySelector('#holder').append(root));
    await expect(slider(page)).toHaveAttribute('aria-disabled', 'true');
    await page.locator('#usurper').evaluate((legend) => legend.remove());
    await expect(slider(page)).not.toHaveAttribute('aria-disabled', 'true');
    await slider(page).press('ArrowRight');
    await expect(slider(page)).toHaveAttribute('aria-valuenow', '26');
  });

  // Supported: a control MOUNTED in another document binds to that document. (Moving an already
  // mounted control there is the recorded cross-document-adoption gap, not tested as working.)
  test("a control mounted in a same-origin iframe follows that document's fieldset", async ({
    page,
  }) => {
    await page.goto('/controls-tests.html');
    await act(page, 'Mount in frame');
    const frame = page.frameLocator('#frame');
    const framed = frame.getByRole('slider', { name: 'Framed' });
    // Unstyled in the frame (no stylesheet there), so zero-sized: attached, not "visible".
    await expect(framed).toBeAttached();
    const frameEntries = () =>
      frame.locator('#frame-form').evaluate((form) => [...new FormData(form).entries()]);
    await expect.poll(frameEntries).toEqual([['framed', '25']]);
    await frame.locator('#frame-fields').evaluate((fieldset) => {
      fieldset.disabled = true;
    });
    await expect(framed).toHaveAttribute('aria-disabled', 'true');
    expect(await frameEntries()).toEqual([]);
    await frame.locator('#frame-fields').evaluate((fieldset) => {
      fieldset.disabled = false;
    });
    await expect(framed).not.toHaveAttribute('aria-disabled', 'true');
  });

  test('a read-only switch keeps submitting but is barred from validation', async ({ page }) => {
    await page.goto('/controls-tests.html');
    const form = page.locator('#form');
    await form.evaluate((f) => f.elements.namedItem('setting').setCustomValidity('Nope'));
    expect(await form.evaluate((f) => f.checkValidity())).toBe(false);
    await act(page, 'Toggle read-only setting');
    await expect.poll(() => form.evaluate((f) => f.checkValidity())).toBe(true);
    expect(await form.evaluate((f) => f.elements.namedItem('setting').willValidate)).toBe(false);
    expect(await entries(page)).toContainEqual(['setting', 'on']);
    await act(page, 'Toggle read-only setting');
    await expect.poll(() => form.evaluate((f) => f.checkValidity())).toBe(false);
  });

  test('a read-only switch named _charset_ still submits its own value', async ({ page }) => {
    await page.goto('/controls-tests.html');
    await act(page, 'Name setting _charset_');
    await expect.poll(() => entries(page)).toContainEqual(['_charset_', 'on']);
    await act(page, 'Toggle read-only setting');
    // Wait for read-only to land (Angular applies it after the click returns).
    await expect(page.getByRole('switch', { name: 'Setting' })).toHaveAttribute(
      'aria-readonly',
      'true',
    );
    expect(await entries(page)).toContainEqual(['_charset_', 'on']);
    expect((await entries(page)).some(([, v]) => v === 'UTF-8')).toBe(false);
  });

  test('unmounting releases the reset listener and the shared fieldset observer', async ({
    page,
  }) => {
    await page.addInitScript(spyOnLifecycle);
    await page.goto('/controls-tests.html');
    // Five form controls: Consent, Setting, Amount, Choice, Remote — ONE shared observer.
    const watchers = () =>
      page.evaluate((key) => document[Symbol.for(key)]?.watchers.size ?? 0, REGISTRY_KEY);
    await expect.poll(watchers).toBe(5);
    await expect.poll(async () => (await page.evaluate(() => window.__lifecycle())).resets).toBe(5);
    const mounted = await page.evaluate(() => window.__lifecycle());
    await act(page, 'Remove remote');
    await expect(page.getByRole('checkbox', { name: 'Remote' })).toHaveCount(0);
    // One subscription and one listener fewer; the shared observer stays connected.
    await expect.poll(watchers).toBe(4);
    await expect
      .poll(() => page.evaluate(() => window.__lifecycle()))
      .toEqual({
        observers: mounted.observers,
        resets: 4,
      });
    // The last subscriber disconnects it and removes the registry.
    await act(page, 'Unmount controls');
    await expect(slider(page)).toHaveCount(0);
    await expect
      .poll(() => page.evaluate(() => window.__lifecycle()))
      .toEqual({
        observers: mounted.observers - 1,
        resets: 0,
      });
    expect(await page.evaluate((key) => Symbol.for(key) in document, REGISTRY_KEY)).toBe(false);
  });
}
