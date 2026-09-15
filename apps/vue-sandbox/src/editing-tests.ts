import { createApp, h, ref } from 'vue';
import Live from './components/TextField/TextField.vue';
import Committed from './browser-generated/CommittedTextField/CommittedTextField.vue';
const Field = new URLSearchParams(location.search).get('mode') === 'commit' ? Committed : Live;
createApp({
  setup() {
    const value = ref(''),
      count = ref(0),
      tick = ref(0),
      invalid = ref(false);
    const prevent = (event: MouseEvent) => event.preventDefault();
    return () => [
      h(Field, {
        'aria-label': 'Edit probe',
        value: value.value,
        invalid: invalid.value,
        'onUpdate:value': (next: string) => {
          value.value = next;
          count.value++;
        },
      }),
      h('output', { 'data-testid': 'value' }, value.value),
      h('output', { 'data-testid': 'count' }, count.value),
      h('output', { 'data-testid': 'tick' }, tick.value),
      h(
        'button',
        {
          onMousedown: prevent,
          onClick: () => {
            tick.value++;
            invalid.value = !invalid.value;
          },
        },
        'Rerender',
      ),
      h(
        'button',
        {
          onMousedown: prevent,
          onClick: () => {
            value.value = 'external';
          },
        },
        'Set external',
      ),
      h('button', {}, 'Finish'),
    ];
  },
}).mount('#fixtures');
