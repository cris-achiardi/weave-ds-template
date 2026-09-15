import { createApp, h, ref } from 'vue';
import type { Component } from 'vue';
import Tabs from './browser-generated/Tabs/Tabs.vue';
import TabItem from './browser-generated/TabItem/TabItem.vue';
import RadioGroup from './components/RadioGroup/RadioGroup.vue';
import RadioItem from './components/RadioItem/RadioItem.vue';
import Dialog from './components/Dialog/Dialog.vue';
const params = new URLSearchParams(location.search);
createApp({
  setup() {
    const value = ref(params.get('selected') ?? 'a'),
      count = ref(0),
      open = ref(true);
    const collection: Component = params.get('pattern') === 'radio' ? RadioGroup : Tabs;
    const item: Component = params.get('pattern') === 'radio' ? RadioItem : TabItem;
    return () =>
      params.get('kind') === 'dismissal'
        ? [
            h(
              Dialog,
              { open: open.value, 'onUpdate:open': (next: boolean) => (open.value = next) },
              {
                title: () => 'Conformance dialog',
                body: () => [
                  h('button', { id: 'inside' }, 'Inside'),
                  h('button', { id: 'overflow' }, 'Overflow child'),
                ],
              },
            ),
            h('output', { 'data-testid': 'open' }, String(open.value)),
          ]
        : [
            h('button', { id: 'before' }, 'Before'),
            h(
              collection,
              {
                value: value.value,
                'onUpdate:value': (next: string) => {
                  value.value = next;
                  count.value++;
                },
              },
              () => ['a', 'b', 'c'].map((id) => h(item, { value: id }, { label: () => id })),
            ),
            h('button', { id: 'after' }, 'After'),
            h('output', { 'data-testid': 'selected' }, value.value),
            h('output', { 'data-testid': 'changes' }, String(count.value)),
          ];
  },
}).mount('#fixtures');
