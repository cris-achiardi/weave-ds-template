import Button from './components/Button/Button.vue';
import { createApp, h, reactive } from 'vue';
import type { Component } from 'vue';
import Tabs from './components/Tabs/Tabs.vue';
import TabItem from './components/TabItem/TabItem.vue';
import RadioGroup from './components/RadioGroup/RadioGroup.vue';
import RadioItem from './components/RadioItem/RadioItem.vue';

const roster = () => reactive({ identity: 'a', value: 'a', disabled: false, visible: true });
const rosters = { tabs: roster(), radios: roster() };

export function updateRoster(kind: keyof typeof rosters, patch: Partial<typeof rosters.tabs>) {
  Object.assign(rosters[kind], patch);
}

createApp({
  setup() {
    return () =>
      (['tabs', 'radios'] as const).map((kind) => {
        const state = rosters[kind];
        const collection: Component = kind === 'tabs' ? Tabs : RadioGroup;
        const item: Component = kind === 'tabs' ? TabItem : RadioItem;
        return h(
          collection,
          {
            'data-testid': kind,
            value: state.value,
            'onUpdate:value': (value: string) => {
              state.value = value;
            },
          },
          () => [
            state.visible
              ? h(
                  item,
                  { key: 'first', value: state.identity, disabled: state.disabled },
                  () => `First ${kind}`,
                )
              : null,
            h(item, { key: 'second', value: 'b' }, () => `Second ${kind}`),
          ],
        );
      });
  },
}).mount('#fixtures');

const styleHost = document.createElement('div');
document.body.append(styleHost);
createApp({ setup: () => () => h(Button, {}, () => 'Style probe') }).mount(styleHost);
