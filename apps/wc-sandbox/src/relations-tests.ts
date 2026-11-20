// Fixtures for tests/browser/relations.mjs: relations written on the element a consumer supplies
// to Field's `control` and Tooltip's `trigger` (#35, #46). Same DOM in all four sandboxes.
import './components/Field';
import './components/Tooltip';

const root = document.getElementById('fixtures')!;
root.innerHTML = `
  <ds-field id="field-a">
    <span slot="label">Account</span>
    <input slot="control" />
    <span slot="description">Use your account name</span>
    <span slot="error">Required</span>
  </ds-field>
  <span id="consumer-hint">Consumer hint</span>
  <ds-field id="field-b">
    <span slot="label">Account B</span>
    <input slot="control" id="own-id" aria-describedby="consumer-hint" />
    <span slot="description">Help B</span>
  </ds-field>
  <span id="tip-extra">Extra</span>
  <ds-tooltip id="tip">
    <button slot="trigger" type="button" aria-describedby="tip-extra">Info</button>
    <span slot="content">Helpful text</span>
  </ds-tooltip>
  <button type="button" id="toggle-invalid">Toggle invalid</button>
  <button type="button" id="swap-control">Swap control</button>
  <button type="button" id="toggle-tooltip">Toggle tooltip</button>
`;
const field = root.querySelector('ds-field')!;
const tip = root.querySelector('ds-tooltip')!;
root.querySelector('#toggle-invalid')!.addEventListener('click', () => {
  field.invalid = !field.invalid;
});
root.querySelector('#swap-control')!.addEventListener('click', () => {
  const current = field.querySelector('[slot="control"]')!;
  const next = document.createElement(current.localName === 'input' ? 'textarea' : 'input');
  next.slot = 'control';
  // Kept so the test can check the replaced element was handed back clean.
  (window as unknown as { replaced: Element }).replaced = current;
  current.replaceWith(next);
});
root.querySelector('#toggle-tooltip')!.addEventListener('click', () => {
  tip.open = !tip.open;
});
