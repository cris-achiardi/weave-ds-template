import identity from '../../../ds.config.json';
const mode = new URLSearchParams(location.search).get('mode');
const Field =
  mode === 'commit'
    ? (await import('./browser-generated/CommittedTextField/CommittedTextField')).CommittedTextField
    : (await import('./components/TextField')).TextField;
const field = new Field();
field.setAttribute('aria-label', 'Edit probe');
const value = document.createElement('output'),
  count = document.createElement('output'),
  tick = document.createElement('output');
value.dataset.testid = 'value';
count.dataset.testid = 'count';
tick.dataset.testid = 'tick';
count.textContent = '0';
tick.textContent = '0';
field.addEventListener(`${identity.dataPrefix}-value-change`, () => {
  value.textContent = field.value;
  count.textContent = String(Number(count.textContent) + 1);
});
const rerender = document.createElement('button');
rerender.textContent = 'Rerender';
rerender.onmousedown = (event) => event.preventDefault();
rerender.onclick = () => {
  field.invalid = !field.invalid;
  tick.textContent = String(Number(tick.textContent) + 1);
};
const external = document.createElement('button');
external.textContent = 'Set external';
external.onmousedown = (event) => event.preventDefault();
external.onclick = () => {
  field.value = 'external';
  value.textContent = field.value;
};
const finish = document.createElement('button');
finish.textContent = 'Finish';
document.body.append(field, value, count, tick, rerender, external, finish);
export {};
