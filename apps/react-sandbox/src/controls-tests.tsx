import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button } from './components/Button';
import { Checkbox } from './components/Checkbox';
import { RadioGroup } from './components/RadioGroup';
import { RadioItem } from './components/RadioItem';
import { Slider } from './components/Slider';
import { Switch } from './components/Switch';

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
function Fixture() {
  const [consent, setConsent] = useState<Check>('checked');
  const [remote, setRemote] = useState<Check>('unchecked');
  const [count, setCount] = useState(0);
  const [invalid, setInvalid] = useState(false);
  const [required, setRequired] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [amountName, setAmountName] = useState('amount');
  const [consentDisabled, setConsentDisabled] = useState(false);
  const [showRemote, setShowRemote] = useState(true);
  const [settingReadOnly, setSettingReadOnly] = useState(false);
  const [showFields, setShowFields] = useState(true);
  const [settingName, setSettingName] = useState('setting');
  const keep = (event: { preventDefault(): void }) => event.preventDefault();
  const act = (label: string, run: () => void) => (
    <button onMouseDown={keep} onClick={run}>
      {label}
    </button>
  );
  return (
    <>
      <form
        id="form"
        onSubmit={(event) => {
          event.preventDefault();
          event.currentTarget.dataset.submitted = 'true';
        }}
      >
        <fieldset id="form-fields">
          {showFields && (
            <>
              <Checkbox
                label="Consent"
                name="consent"
                checked={consent}
                invalid={invalid}
                required={required}
                disabled={consentDisabled}
                value={accepted ? 'accepted' : undefined}
                onCheckedChange={(next) => {
                  setConsent(next);
                  setCount((n) => n + 1);
                }}
              />
              <Switch
                aria-label="Setting"
                name={settingName}
                defaultChecked
                readOnly={settingReadOnly}
              />
              <Slider aria-label="Amount" name={amountName} defaultValue={25} />
              <RadioGroup aria-label="Choice" name="choice" defaultValue="b">
                <RadioItem value="a" label="Alpha" />
                <RadioItem value="b" label="Beta" />
              </RadioGroup>
              <Button>Action</Button>
            </>
          )}
        </fieldset>
        <button type="submit">Submit answers</button>
        <button type="reset">Reset answers</button>
      </form>
      {showRemote && (
        <Checkbox
          label="Remote"
          name="remote"
          form="form"
          checked={remote}
          onCheckedChange={setRemote}
        />
      )}
      <output data-testid="consent-model">{consent}</output>
      <output data-testid="remote-model">{remote}</output>
      <output data-testid="count">{count}</output>
      {act('Mix consent', () => setConsent('mixed'))}
      {act('Check consent', () => setConsent('checked'))}
      {act('Toggle invalid', () => setInvalid(!invalid))}
      {act('Require consent', () => setRequired(true))}
      {act('Accept value', () => setAccepted(true))}
      {act('Clear amount name', () => setAmountName(''))}
      {act('Disable consent', () => setConsentDisabled(true))}
      {act('Remove remote', () => setShowRemote(false))}
      {act('Toggle read-only setting', () => setSettingReadOnly(!settingReadOnly))}
      {act('Unmount controls', () => setShowFields(false))}
      {act('Name setting _charset_', () => setSettingName('_charset_'))}
      {act('Mount in frame', () =>
        createRoot(frameMountPoint()).render(
          <Slider aria-label="Framed" name="framed" defaultValue={25} />,
        ),
      )}
    </>
  );
}
createRoot(document.getElementById('fixtures')!).render(<Fixture />);
