// Fixtures for tests/browser/relations.mjs: relations written on the element a consumer supplies
// to Field's `control` and Tooltip's `trigger` (#35, #46). Same DOM in all four sandboxes.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Field } from './components/Field';
import { Tooltip } from './components/Tooltip';

function Fixture() {
  const [invalid, setInvalid] = useState(false);
  const [swapped, setSwapped] = useState(false);
  const [open, setOpen] = useState(false);
  return (
    <>
      <div id="field-a">
        <Field
          invalid={invalid}
          label={<span>Account</span>}
          control={swapped ? <textarea /> : <input />}
          description={<span>Use your account name</span>}
          error={<span>Required</span>}
        />
      </div>
      <span id="consumer-hint">Consumer hint</span>
      <div id="field-b">
        <Field
          label={<span>Account B</span>}
          control={<input id="own-id" aria-describedby="consumer-hint" />}
          description={<span>Help B</span>}
        />
      </div>
      <span id="tip-extra">Extra</span>
      <Tooltip
        open={open}
        onOpenChange={setOpen}
        trigger={
          <button type="button" aria-describedby="tip-extra">
            Info
          </button>
        }
        content={<span>Helpful text</span>}
      />
      <button type="button" onClick={() => setInvalid(!invalid)}>
        Toggle invalid
      </button>
      <button type="button" onClick={() => setSwapped(!swapped)}>
        Swap control
      </button>
      <button type="button" onClick={() => setOpen(!open)}>
        Toggle tooltip
      </button>
    </>
  );
}
createRoot(document.getElementById('fixtures')!).render(<Fixture />);
