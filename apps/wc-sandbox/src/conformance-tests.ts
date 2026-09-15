import identity from '../../../ds.config.json';
import { Tabs } from './browser-generated/Tabs/Tabs';
import { TabItem } from './browser-generated/TabItem/TabItem';
import { RadioGroup } from './components/RadioGroup';
import { RadioItem } from './components/RadioItem';
import { Dialog } from './components/Dialog';
const params = new URLSearchParams(location.search);
if (params.get('kind') === 'dismissal') {
  const dialog = new Dialog();
  dialog.innerHTML =
    '<span slot="title">Conformance dialog</span><div slot="body"><button id="inside">Inside</button><button id="overflow">Overflow child</button></div>';
  const open = document.createElement('output');
  open.dataset.testid = 'open';
  open.textContent = 'true';
  dialog.addEventListener(
    `${identity.dataPrefix}-open-change`,
    () => (open.textContent = String(dialog.open)),
  );
  document.body.append(dialog, open);
  dialog.open = true;
} else {
  const radio = params.get('pattern') === 'radio';
  const collection = radio ? new RadioGroup() : new Tabs();
  collection.value = params.get('selected') ?? 'a';
  const before = document.createElement('button'),
    after = document.createElement('button');
  before.id = 'before';
  before.textContent = 'Before';
  after.id = 'after';
  after.textContent = 'After';
  const selected = document.createElement('output'),
    changes = document.createElement('output');
  selected.dataset.testid = 'selected';
  selected.textContent = collection.value;
  changes.dataset.testid = 'changes';
  changes.textContent = '0';
  collection.addEventListener(`${identity.dataPrefix}-value-change`, () => {
    selected.textContent = collection.value;
    changes.textContent = String(Number(changes.textContent) + 1);
  });
  for (const id of ['a', 'b', 'c']) {
    const item = radio ? new RadioItem() : new TabItem();
    item.value = id;
    item.innerHTML = `<span slot="label">${id}</span>`;
    collection.append(item);
  }
  document.body.append(before, collection, after, selected, changes);
}
