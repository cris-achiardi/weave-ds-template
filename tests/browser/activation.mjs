import { expect, test } from '@playwright/test';

export function activationRegressions() {
  for (const [tag, role, initial, changed] of [
    ['ds-switch', 'switch', false, true],
    ['ds-checkbox', 'checkbox', 'unchecked', 'checked'],
  ]) {
    for (const input of ['mouse', 'Enter', 'Space']) {
      test(`${tag} host can veto ${input} activation before state and notification`, async ({
        page,
      }) => {
        await page.goto('/browser-tests.html');
        await page.evaluate(async (tagName) => {
          await customElements.whenDefined(tagName);
          const host = document.createElement(tagName);
          host.id = 'activation';
          host.ariaLabel = 'Activation control';
          host.dataset.veto = 'true';
          host.dataset.changes = '0';
          host.addEventListener('ds-checked-change', () => {
            host.dataset.changes = String(Number(host.dataset.changes) + 1);
          });
          host.addEventListener('click', (event) => {
            host.dataset.during = String(host.checked);
            if (host.dataset.veto === 'true') event.preventDefault();
            // Runs after any default action queued by the internal listener.
            setTimeout(() => {
              host.dataset.settled = 'true';
            }, 0);
          });
          document.body.append(host);
        }, tag);
        const host = page.locator('#activation');
        const control = host.getByRole(role);
        const activate = () => (input === 'mouse' ? control.click() : control.press(input));
        await activate();
        await expect(host).toHaveAttribute('data-settled', 'true');
        await expect(host).toHaveAttribute('data-during', String(initial));
        await expect(host).toHaveJSProperty('checked', initial);
        await expect(host).toHaveAttribute('data-changes', '0');
        await host.evaluate((node) => {
          node.dataset.veto = 'false';
          node.dataset.settled = 'false';
        });
        await activate();
        await expect(host).toHaveAttribute('data-settled', 'true');
        await expect(host).toHaveAttribute('data-during', String(initial));
        await expect(host).toHaveJSProperty('checked', changed);
        await expect(host).toHaveAttribute('data-changes', '1');
      });
    }
  }

  test('collection members honor host click cancellation', async ({ page }) => {
    await page.goto('/browser-tests.html');
    await page.evaluate(async () => {
      await import('/src/browser-tests.ts');
      for (const collection of [
        document.querySelector('ds-tabs'),
        document.querySelector('ds-radio-group'),
      ]) {
        const member = collection.lastElementChild;
        member.addEventListener('click', (event) => {
          event.preventDefault();
          setTimeout(() => {
            collection.dataset.settled = 'true';
          }, 0);
        });
      }
      const accordion = document.createElement('ds-accordion');
      accordion.id = 'accordion-activation';
      accordion.innerHTML =
        '<ds-accordion-item value="a"><span slot="heading">Section</span></ds-accordion-item>';
      accordion.firstElementChild.addEventListener('click', (event) => {
        event.preventDefault();
        setTimeout(() => {
          accordion.dataset.settled = 'true';
        }, 0);
      });
      document.body.append(accordion);
    });
    for (const [kind, role] of [
      ['tabs', 'tab'],
      ['radios', 'radio'],
    ]) {
      const group = page.getByTestId(kind);
      await group.getByRole(role, { name: `Second ${kind}` }).click();
      await expect(group).toHaveAttribute('data-settled', 'true');
      await expect(group).toHaveJSProperty('value', 'a');
    }
    const accordion = page.locator('#accordion-activation');
    await accordion.getByRole('button', { name: 'Section' }).click();
    await expect(accordion).toHaveAttribute('data-settled', 'true');
    await expect(accordion).toHaveJSProperty('value', []);
  });

  test('queued activation is discarded on disable, disconnect, or member identity change', async ({
    page,
  }) => {
    await page.goto('/browser-tests.html');
    const result = await page.evaluate(async () => {
      await import('/src/browser-tests.ts');
      const disabled = document.createElement('ds-switch');
      const readOnly = document.createElement('ds-switch');
      const removed = document.createElement('ds-switch');
      document.body.append(disabled, readOnly, removed);
      disabled.shadowRoot.querySelector('button').click();
      disabled.disabled = true;
      readOnly.shadowRoot.querySelector('button').click();
      readOnly.readOnly = true;
      removed.shadowRoot.querySelector('button').click();
      removed.remove();
      document.body.append(removed);
      const tabs = document.querySelector('ds-tabs');
      const member = tabs.lastElementChild;
      member.shadowRoot.querySelector('button').click();
      member.value = 'replaced';
      await new Promise((resolve) => setTimeout(resolve, 0));
      return {
        disabled: disabled.checked,
        readOnly: readOnly.checked,
        reconnected: removed.checked,
        selection: tabs.value,
      };
    });
    expect(result).toEqual({
      disabled: false,
      readOnly: false,
      reconnected: false,
      selection: 'a',
    });
  });

  test('multiple queued clicks commit once each and preserve notification order', async ({
    page,
  }) => {
    await page.goto('/browser-tests.html');
    const result = await page.evaluate(async () => {
      await customElements.whenDefined('ds-switch');
      const host = document.createElement('ds-switch');
      document.body.append(host);
      const changes = [];
      host.addEventListener('ds-checked-change', (event) => changes.push(event.detail));
      host.shadowRoot.querySelector('button').click();
      host.shadowRoot.querySelector('button').click();
      const during = host.checked;
      await new Promise((resolve) => setTimeout(resolve, 0));
      return { during, after: host.checked, changes };
    });
    expect(result).toEqual({ during: false, after: false, changes: [true, false] });
  });

  test('synchronous keyboard primitives honor capturing host cancellation', async ({ page }) => {
    await page.goto('/browser-tests.html');
    await page.evaluate(async () => {
      await import('/src/browser-tests.ts');
      const slider = document.createElement('ds-slider');
      slider.id = 'keyboard-slider';
      slider.ariaLabel = 'Keyboard range';
      slider.value = 20;
      document.body.append(slider);
      const tooltip = document.createElement('ds-tooltip');
      tooltip.id = 'keyboard-tooltip';
      tooltip.innerHTML =
        '<button slot="trigger">Tooltip trigger</button><span slot="content">Help</span>';
      document.body.append(tooltip);
      tooltip.open = true;
      for (const host of [slider, document.querySelector('ds-tabs'), tooltip]) {
        host.addEventListener('keydown', (event) => event.preventDefault(), {
          capture: true,
          once: true,
        });
      }
    });
    const slider = page.locator('#keyboard-slider');
    await slider.getByRole('slider').press('ArrowRight');
    await expect(slider).toHaveJSProperty('value', 20);
    await slider.getByRole('slider').press('ArrowRight');
    await expect(slider).toHaveJSProperty('value', 21);
    const tabs = page.getByTestId('tabs');
    const first = tabs.getByRole('tab', { name: 'First tabs' });
    await first.press('ArrowRight');
    await expect(first).toBeFocused();
    await expect(tabs).toHaveJSProperty('value', 'a');
    await first.press('ArrowRight');
    await expect(tabs.getByRole('tab', { name: 'Second tabs' })).toBeFocused();
    await expect(tabs).toHaveJSProperty('value', 'b');
    const tooltip = page.locator('#keyboard-tooltip');
    await tooltip.getByRole('button', { name: 'Tooltip trigger' }).press('Escape');
    await expect(tooltip).toHaveJSProperty('open', true);
    await tooltip.getByRole('button', { name: 'Tooltip trigger' }).press('Escape');
    await expect(tooltip).toHaveJSProperty('open', false);
  });
}
