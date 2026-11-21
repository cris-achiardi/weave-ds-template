import { createApp, h, ref } from 'vue';
import Button from './components/Button/Button.vue';
import Checkbox from './components/Checkbox/Checkbox.vue';
import RadioGroup from './components/RadioGroup/RadioGroup.vue';
import RadioItem from './components/RadioItem/RadioItem.vue';
import Slider from './components/Slider/Slider.vue';
import Switch from './components/Switch/Switch.vue';

type Check = 'unchecked' | 'checked' | 'mixed';

// A same-origin iframe with an empty form; a control is MOUNTED into it (not moved there).
function frameMountPoint(): HTMLElement {
  const frame = document.createElement('iframe');
  frame.id = 'frame';
  document.body.append(frame);
  const doc = frame.contentDocument!;
  doc.body.innerHTML = '<form id="frame-form"><fieldset id="frame-fields"></fieldset></form>';
  return doc.getElementById('frame-fields')!;
}

// Form contribution fixture for the custom controls. tests/browser/framework-controls.mjs drives
// the same page in every framework backend; keep labels, names and test ids identical.
createApp({
  setup() {
    const consent = ref<Check>('checked'),
      remote = ref<Check>('unchecked'),
      count = ref(0),
      invalid = ref(false),
      required = ref(false),
      accepted = ref(false),
      amountName = ref('amount'),
      consentDisabled = ref(false),
      showRemote = ref(true),
      settingReadOnly = ref(false),
      showFields = ref(true),
      settingName = ref('setting');
    const keep = (event: MouseEvent) => event.preventDefault();
    const act = (label: string, run: () => void) =>
      h('button', { onMousedown: keep, onClick: run }, label);
    const label = (text: string) => ({ label: () => text });
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
          h(
            'fieldset',
            { id: 'form-fields' },
            !showFields.value
              ? []
              : [
                  h(
                    Checkbox,
                    {
                      name: 'consent',
                      checked: consent.value,
                      invalid: invalid.value,
                      required: required.value,
                      disabled: consentDisabled.value,
                      value: accepted.value ? 'accepted' : undefined,
                      'onUpdate:checked': (next: Check) => {
                        consent.value = next;
                        count.value++;
                      },
                    },
                    label('Consent'),
                  ),
                  h(Switch, {
                    'aria-label': 'Setting',
                    name: settingName.value,
                    checked: true,
                    readOnly: settingReadOnly.value,
                  }),
                  h(Slider, { 'aria-label': 'Amount', name: amountName.value, value: 25 }),
                  h(RadioGroup, { 'aria-label': 'Choice', name: 'choice', value: 'b' }, () => [
                    h(RadioItem, { value: 'a' }, label('Alpha')),
                    h(RadioItem, { value: 'b' }, label('Beta')),
                  ]),
                  h(Button, null, () => 'Action'),
                ],
          ),
          h('button', { type: 'submit' }, 'Submit answers'),
          h('button', { type: 'reset' }, 'Reset answers'),
        ],
      ),
      showRemote.value
        ? h(
            Checkbox,
            {
              name: 'remote',
              form: 'form',
              checked: remote.value,
              'onUpdate:checked': (next: Check) => {
                remote.value = next;
              },
            },
            label('Remote'),
          )
        : null,
      h('output', { 'data-testid': 'consent-model' }, consent.value),
      h('output', { 'data-testid': 'remote-model' }, remote.value),
      h('output', { 'data-testid': 'count' }, count.value),
      act('Mix consent', () => (consent.value = 'mixed')),
      act('Check consent', () => (consent.value = 'checked')),
      act('Toggle invalid', () => (invalid.value = !invalid.value)),
      act('Require consent', () => (required.value = true)),
      act('Accept value', () => (accepted.value = true)),
      act('Clear amount name', () => (amountName.value = '')),
      act('Disable consent', () => (consentDisabled.value = true)),
      act('Remove remote', () => (showRemote.value = false)),
      act('Toggle read-only setting', () => (settingReadOnly.value = !settingReadOnly.value)),
      act('Unmount controls', () => (showFields.value = false)),
      act('Name setting _charset_', () => (settingName.value = '_charset_')),
      act('Mount in frame', () => {
        createApp({
          render: () => h(Slider, { 'aria-label': 'Framed', name: 'framed', value: 25 }),
        }).mount(frameMountPoint());
      }),
    ];
  },
}).mount('#fixtures');
