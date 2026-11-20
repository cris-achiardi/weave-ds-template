import { createApp, h, ref } from 'vue';
import TextField from './components/TextField/TextField.vue';

// Form participation fixture. tests/browser/framework-forms.mjs drives the same page in every
// framework backend; keep labels, names and test ids identical across the three fixtures.
createApp({
  setup() {
    const model = ref('initial'),
      outside = ref('out'),
      count = ref(0),
      tick = ref(0),
      invalid = ref(false),
      showOutside = ref(true),
      readOnly = ref(false);
    const keep = (event: MouseEvent) => event.preventDefault();
    return () => [
      h(
        'form',
        {
          id: 'form',
          onSubmit: (event: SubmitEvent) => {
            event.preventDefault();
            (event.currentTarget as HTMLFormElement).dataset.submitted = 'true';
          },
        },
        [
          h('fieldset', { id: 'form-fields', 'data-tick': tick.value }, [
            h(TextField, {
              'aria-label': 'Controlled',
              name: 'controlled',
              value: model.value,
              invalid: invalid.value,
              readOnly: readOnly.value,
              'onUpdate:value': (next: string) => {
                model.value = next;
                count.value++;
              },
            }),
            h(TextField, { 'aria-label': 'Uncontrolled', name: 'uncontrolled' }),
            h(TextField, { 'aria-label': 'Required', name: 'required', required: true }),
          ]),
          h('button', { type: 'submit' }, 'Submit answers'),
          h('button', { type: 'reset' }, 'Reset answers'),
        ],
      ),
      showOutside.value
        ? h(TextField, {
            'aria-label': 'Outside',
            name: 'outside',
            form: 'form',
            value: outside.value,
            'onUpdate:value': (next: string) => {
              outside.value = next;
            },
          })
        : null,
      h('output', { 'data-testid': 'model' }, model.value),
      h('output', { 'data-testid': 'outside-model' }, outside.value),
      h('output', { 'data-testid': 'count' }, count.value),
      h('output', { 'data-testid': 'tick' }, tick.value),
      h(
        'button',
        { onMousedown: keep, onClick: () => (invalid.value = !invalid.value) },
        'Toggle invalid',
      ),
      h('button', { onMousedown: keep, onClick: () => tick.value++ }, 'Rerender'),
      h('button', { onMousedown: keep, onClick: () => (model.value = 'external') }, 'Set external'),
      h(
        'button',
        { onMousedown: keep, onClick: () => (showOutside.value = false) },
        'Remove outside',
      ),
      h(
        'button',
        { onMousedown: keep, onClick: () => (readOnly.value = !readOnly.value) },
        'Toggle read-only',
      ),
    ];
  },
}).mount('#fixtures');
