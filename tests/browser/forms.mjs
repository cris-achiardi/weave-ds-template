import { expect, test } from '@playwright/test';

async function entries(page) {
  return page.locator('#form').evaluate((form) => [...new FormData(form).entries()]);
}
async function setup(page) {
  await page.goto('/browser-tests.html');
  await page.evaluate(() => {
    const form = document.createElement('form');
    form.id = 'form';
    form.innerHTML = `<fieldset id="form-fields">
      <ds-text-field id="answer" name="answer" value="initial" aria-label="Answer"></ds-text-field>
      <ds-checkbox id="consent" name="consent" checked="checked"><span slot="label">Consent</span></ds-checkbox>
      <ds-switch id="setting" name="setting" checked><span slot="label">Setting</span></ds-switch>
      <ds-slider id="amount" name="amount" value="25" aria-label="Amount"></ds-slider>
      <ds-radio-group id="choice" name="choice" value="b" aria-label="Choice">
        <ds-radio-item value="a">Alpha</ds-radio-item><ds-radio-item value="b">Beta</ds-radio-item>
      </ds-radio-group>
      <ds-button>Action</ds-button>
    </fieldset><button type="submit">Submit answers</button>`;
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      form.dataset.submitted = 'true';
    });
    document.body.append(form);
  });
}
export function formRegressions() {
  test('named form answers serialize actual edits, checked state and single selection', async ({
    page,
  }) => {
    await setup(page);
    expect(await entries(page)).toEqual([
      ['answer', 'initial'],
      ['consent', 'on'],
      ['setting', 'on'],
      ['amount', '25'],
      ['choice', 'b'],
    ]);
    await page.locator('#answer').getByRole('textbox').fill('updated');
    await page.locator('#consent').getByRole('checkbox').click();
    await page.locator('#setting').getByRole('switch').click();
    await page.locator('#amount').getByRole('slider').press('ArrowRight');
    await page.locator('#choice').getByRole('radio', { name: 'Alpha' }).click();
    await expect
      .poll(() => entries(page))
      .toEqual([
        ['answer', 'updated'],
        ['amount', '26'],
        ['choice', 'a'],
      ]);
    await page.locator('#consent').evaluate((control) => {
      control.checked = 'mixed';
    });
    expect((await entries(page)).some(([key]) => key === 'consent')).toBe(false);
    await page.locator('#consent').evaluate((control) => {
      control.value = 'accepted';
      control.checked = 'checked';
    });
    await expect.poll(() => entries(page)).toContainEqual(['consent', 'accepted']);
    await page.locator('#answer').evaluate((control) => {
      control.name = '';
    });
    expect((await entries(page)).some(([key]) => key === 'answer')).toBe(false);
  });
  test('required and custom validity block real submission and update the semantic control', async ({
    page,
  }) => {
    await setup(page);
    const host = page.locator('#answer');
    await host.evaluate((control) => {
      control.required = true;
      control.value = '';
    });
    await expect(host.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    expect(await host.evaluate((control) => control.validity.valueMissing)).toBe(true);
    await page.getByRole('button', { name: 'Submit answers' }).click();
    await expect(page.locator('#form')).not.toHaveAttribute('data-submitted');
    await host.getByRole('textbox').fill('valid');
    await host.evaluate((control) => control.setCustomValidity('Already taken'));
    expect(await host.evaluate((control) => control.checkValidity())).toBe(false);
    await expect(host).toHaveJSProperty('validationMessage', 'Already taken');
    await host.evaluate((control) => control.setCustomValidity(''));
    await page.getByRole('button', { name: 'Submit answers' }).click();
    await expect(page.locator('#form')).toHaveAttribute('data-submitted', 'true');
    await page.locator('#consent').evaluate((control) => {
      control.required = true;
      control.checked = 'mixed';
    });
    expect(
      await page.locator('#consent').evaluate((control) => control.validity.valueMissing),
    ).toBe(true);
    await host.evaluate((control) => {
      control.value = '';
      control.readOnly = true;
    });
    expect(await host.evaluate((control) => control.willValidate)).toBe(false);
  });
  test('disabled fieldsets suppress answers and interaction without changing explicit disabled state', async ({
    page,
  }) => {
    await setup(page);
    await page.locator('#form-fields').evaluate((fieldset) => {
      fieldset.disabled = true;
    });
    expect(await entries(page)).toEqual([]);
    await expect(page.locator('#answer').getByRole('textbox')).toBeDisabled();
    await expect(page.locator('#consent').getByRole('checkbox')).toBeDisabled();
    const slider = page.locator('#amount').getByRole('slider');
    await slider.dispatchEvent('keydown', { key: 'ArrowRight' });
    await expect(page.locator('#amount')).toHaveJSProperty('value', 25);
    await page.locator('#choice').getByRole('radio', { name: 'Alpha' }).dispatchEvent('click');
    await expect(page.locator('#choice')).toHaveJSProperty('value', 'b');
    await expect(page.locator('#answer')).toHaveJSProperty('disabled', false);
    await page.locator('#form-fields').evaluate((fieldset) => {
      fieldset.disabled = false;
    });
    await expect(page.locator('#answer').getByRole('textbox')).toBeEnabled();
    expect(await entries(page)).toHaveLength(5);
    await page.locator('#consent').evaluate((control) => {
      control.disabled = true;
    });
    expect(await entries(page)).toHaveLength(4);
  });
  test('reset restores initial answers; state restoration validates serialized input without user events', async ({
    page,
  }) => {
    await setup(page);
    await page.locator('#answer').getByRole('textbox').fill('draft');
    await page.locator('#consent').getByRole('checkbox').click();
    await page.locator('#amount').getByRole('slider').press('End');
    await page.locator('#choice').getByRole('radio', { name: 'Alpha' }).click();
    await page.locator('#form').evaluate((form) => form.reset());
    await expect
      .poll(() => entries(page))
      .toEqual([
        ['answer', 'initial'],
        ['consent', 'on'],
        ['setting', 'on'],
        ['amount', '25'],
        ['choice', 'b'],
      ]);
    // Browser history/autofill timing is not deterministic; exercise the specified lifecycle callback directly.
    await page.evaluate(() => {
      document.querySelector('#answer').formStateRestoreCallback('restored', 'restore');
      document.querySelector('#consent').formStateRestoreCallback('mixed', 'restore');
      document.querySelector('#setting').formStateRestoreCallback('false', 'restore');
      document.querySelector('#amount').formStateRestoreCallback('42', 'restore');
      document.querySelector('#choice').formStateRestoreCallback('a', 'restore');
      document.querySelector('#amount').formStateRestoreCallback('bad', 'restore');
    });
    expect(await entries(page)).toEqual([
      ['answer', 'restored'],
      ['amount', '42'],
      ['choice', 'a'],
    ]);
    await expect(page.locator('#answer').getByRole('textbox')).toHaveValue('restored');
    await page.locator('#answer').evaluate((control) => {
      control.remove();
      document.querySelector('#form-fields').append(control);
    });
    await page.locator('#form').evaluate((form) => form.reset());
    await expect(page.locator('#answer').getByRole('textbox')).toHaveValue('initial');
  });
  test('reset cancels queued checkbox and radio activation', async ({ page }) => {
    await setup(page);
    await page.evaluate(async () => {
      document.querySelector('#consent').shadowRoot.querySelector('[part="root"]').click();
      document
        .querySelector('#choice ds-radio-item')
        .shadowRoot.querySelector('[part="root"]')
        .click();
      document.querySelector('#form').reset();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    await expect(page.locator('#consent')).toHaveJSProperty('checked', 'checked');
    await expect(page.locator('#choice')).toHaveJSProperty('value', 'b');
  });
  test('reset discards an uncommitted text draft without reporting a user edit', async ({
    page,
  }) => {
    await page.goto('/editing-tests.html?mode=commit');
    const input = page.getByRole('textbox', { name: 'Edit probe' });
    await input.evaluate((control) => {
      const host = control.getRootNode().host;
      const form = document.createElement('form');
      form.id = 'form';
      document.body.append(form);
      form.append(host);
      host.name = 'draft';
    });
    await input.fill('uncommitted');
    expect(await entries(page)).toEqual([['draft', '']]);
    await page.locator('#form').evaluate((form) => form.reset());
    await expect(input).toHaveValue('');
    await expect(page.getByTestId('count')).toHaveText('0');
  });
  test('explicit form ownership works outside the form and does not duplicate shadow inputs', async ({
    page,
  }) => {
    await setup(page);
    await page.locator('#answer').evaluate((control) => {
      control.setAttribute('form', 'form');
      document.body.append(control);
    });
    expect((await entries(page)).filter(([key]) => key === 'answer')).toEqual([
      ['answer', 'initial'],
    ]);
    expect(await page.locator('#answer').evaluate((control) => control.form?.id)).toBe('form');
  });
}
