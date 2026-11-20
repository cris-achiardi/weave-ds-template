// Fixtures for tests/browser/relations.mjs: relations written on the element a consumer supplies
// to Field's `control` and Tooltip's `trigger` (#35, #46). Same DOM in all four sandboxes.
import { createApp, h, ref } from 'vue';
import Field from './components/Field/Field.vue';
import Tooltip from './components/Tooltip/Tooltip.vue';

createApp({
  setup() {
    const invalid = ref(false),
      swapped = ref(false),
      open = ref(false);
    return () => [
      h('div', { id: 'field-a' }, [
        h(
          Field,
          { invalid: invalid.value },
          {
            label: () => h('span', 'Account'),
            control: () => (swapped.value ? h('textarea') : h('input')),
            description: () => h('span', 'Use your account name'),
            error: () => h('span', 'Required'),
          },
        ),
      ]),
      h('span', { id: 'consumer-hint' }, 'Consumer hint'),
      h('div', { id: 'field-b' }, [
        h(
          Field,
          {},
          {
            label: () => h('span', 'Account B'),
            control: () => h('input', { id: 'own-id', 'aria-describedby': 'consumer-hint' }),
            description: () => h('span', 'Help B'),
          },
        ),
      ]),
      h('span', { id: 'tip-extra' }, 'Extra'),
      h(
        Tooltip,
        {
          open: open.value,
          'onUpdate:open': (next: boolean) => (open.value = next),
        },
        {
          trigger: () => h('button', { type: 'button', 'aria-describedby': 'tip-extra' }, 'Info'),
          content: () => h('span', 'Helpful text'),
        },
      ),
      h(
        'button',
        { type: 'button', onClick: () => (invalid.value = !invalid.value) },
        'Toggle invalid',
      ),
      h(
        'button',
        { type: 'button', onClick: () => (swapped.value = !swapped.value) },
        'Swap control',
      ),
      h('button', { type: 'button', onClick: () => (open.value = !open.value) }, 'Toggle tooltip'),
    ];
  },
}).mount('#fixtures');
