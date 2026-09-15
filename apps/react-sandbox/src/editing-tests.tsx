import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { TextField as Live } from './components/TextField';
import { CommittedTextField as Committed } from './browser-generated/CommittedTextField/CommittedTextField';
const Field = new URLSearchParams(location.search).get('mode') === 'commit' ? Committed : Live;
function Fixture() {
  const [value, setValue] = useState('');
  const [count, setCount] = useState(0);
  const [tick, setTick] = useState(0);
  const [invalid, setInvalid] = useState(false);
  return (
    <>
      <Field
        aria-label="Edit probe"
        value={value}
        invalid={invalid}
        onValueChange={(next) => {
          setValue(next);
          setCount((n) => n + 1);
        }}
      />
      <output data-testid="value">{value}</output>
      <output data-testid="count">{count}</output>
      <output data-testid="tick">{tick}</output>
      <button
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          setTick((n) => n + 1);
          setInvalid(!invalid);
        }}
      >
        Rerender
      </button>
      <button onMouseDown={(event) => event.preventDefault()} onClick={() => setValue('external')}>
        Set external
      </button>
      <button>Finish</button>
    </>
  );
}
createRoot(document.getElementById('fixtures')!).render(<Fixture />);
