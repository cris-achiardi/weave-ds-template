import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { TextField } from './components/TextField';

// Form participation fixture. tests/browser/framework-forms.mjs drives the same page in every
// framework backend; keep labels, names and test ids identical across the three fixtures.
function Fixture() {
  const [model, setModel] = useState('initial');
  const [outside, setOutside] = useState('out');
  const [count, setCount] = useState(0);
  const [tick, setTick] = useState(0);
  const [invalid, setInvalid] = useState(false);
  const [showOutside, setShowOutside] = useState(true);
  const keep = (event: { preventDefault(): void }) => event.preventDefault();
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
          <TextField
            aria-label="Controlled"
            name="controlled"
            value={model}
            invalid={invalid}
            onValueChange={(next) => {
              setModel(next);
              setCount((n) => n + 1);
            }}
          />
          <TextField aria-label="Uncontrolled" name="uncontrolled" />
          <TextField aria-label="Required" name="required" required />
        </fieldset>
        <button type="submit">Submit answers</button>
        <button type="reset">Reset answers</button>
      </form>
      {showOutside && (
        <TextField
          aria-label="Outside"
          name="outside"
          form="form"
          value={outside}
          onValueChange={setOutside}
        />
      )}
      <output data-testid="model">{model}</output>
      <output data-testid="outside-model">{outside}</output>
      <output data-testid="count">{count}</output>
      <output data-testid="tick">{tick}</output>
      <button onMouseDown={keep} onClick={() => setInvalid(!invalid)}>
        Toggle invalid
      </button>
      <button onMouseDown={keep} onClick={() => setTick((n) => n + 1)}>
        Rerender
      </button>
      <button onMouseDown={keep} onClick={() => setModel('external')}>
        Set external
      </button>
      <button onMouseDown={keep} onClick={() => setShowOutside(false)}>
        Remove outside
      </button>
    </>
  );
}
createRoot(document.getElementById('fixtures')!).render(<Fixture />);
