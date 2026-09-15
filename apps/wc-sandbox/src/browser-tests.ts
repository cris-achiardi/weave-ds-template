import './components/Dialog';
import './components/TextField';
import './components/Button';
import './components/Slider';
import './components/Tabs';
import './components/TabItem';
import './components/RadioGroup';
import './components/RadioItem';

const rosters = {
  tabs: {
    collection: document.createElement('ds-tabs'),
    first: document.createElement('ds-tab-item'),
    second: document.createElement('ds-tab-item'),
  },
  radios: {
    collection: document.createElement('ds-radio-group'),
    first: document.createElement('ds-radio-item'),
    second: document.createElement('ds-radio-item'),
  },
};
for (const [kind, { collection, first, second }] of Object.entries(rosters)) {
  collection.id = kind;
  collection.dataset.testid = kind;
  collection.value = 'a';
  first.value = 'a';
  first.textContent = `First ${kind}`;
  second.value = 'b';
  second.textContent = `Second ${kind}`;
  collection.append(first, second);
  document.body.append(collection);
}

export function updateRoster(
  kind: keyof typeof rosters,
  patch: Partial<{ identity: string; value: string; disabled: boolean; visible: boolean }>,
) {
  const { collection, first, second } = rosters[kind];
  if (patch.identity !== undefined) first.value = patch.identity;
  if (patch.value !== undefined) collection.value = patch.value;
  if (patch.disabled !== undefined) first.disabled = patch.disabled;
  if (patch.visible === false) first.remove();
  else if (patch.visible === true && !first.isConnected) collection.insertBefore(first, second);
}
