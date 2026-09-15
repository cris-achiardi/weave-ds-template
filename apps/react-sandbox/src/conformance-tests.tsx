import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import { Tabs } from './browser-generated/Tabs/Tabs';
import { TabItem } from './browser-generated/TabItem/TabItem';
import { RadioGroup } from './components/RadioGroup';
import { RadioItem } from './components/RadioItem';
import { Dialog } from './components/Dialog';
const params = new URLSearchParams(location.search);
function Fixture() {
  const [value, setValue] = useState(params.get('selected') ?? 'a');
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(true);
  const change = (next: string) => {
    setValue(next);
    setCount((n) => n + 1);
  };
  if (params.get('kind') === 'dismissal')
    return (
      <>
        <Dialog
          open={open}
          onOpenChange={setOpen}
          title="Conformance dialog"
          body={
            <>
              <button id="inside">Inside</button>
              <button id="overflow">Overflow child</button>
            </>
          }
        />
        <output data-testid="open">{String(open)}</output>
      </>
    );
  return (
    <>
      <button id="before">Before</button>
      {params.get('pattern') === 'radio' ? (
        <RadioGroup value={value} onValueChange={change}>
          {['a', 'b', 'c'].map((id) => (
            <RadioItem key={id} value={id} label={id} />
          ))}
        </RadioGroup>
      ) : (
        <Tabs value={value} onValueChange={change}>
          {['a', 'b', 'c'].map((id) => (
            <TabItem key={id} value={id} label={id} />
          ))}
        </Tabs>
      )}
      <button id="after">After</button>
      <output data-testid="selected">{value}</output>
      <output data-testid="changes">{count}</output>
    </>
  );
}
createRoot(document.getElementById('fixtures')!).render(<Fixture />);
