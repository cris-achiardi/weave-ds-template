// The whole script for this page.
//
// Importing a component DEFINES it: each generated module ends in `customElements.define`, so a
// side-effect import is the entire registration story. There is no provider, no plugin, no
// `imports:` array and no root to mount — the markup in index.html was already parsed and upgrades
// in place the moment these run.
//
// Everything below the imports is the three readouts the page shows, wired with
// `addEventListener`. That is also the demonstration: a consumer of these components writes plain
// DOM code, and the events are CustomEvents that crossed the shadow boundary because the emitter
// marked them `composed`.

import '@ds/tokens/css';
import './sandbox.css';

import './components/Button';
import './components/Checkbox';
import './components/TextField';
import './components/Slider';
import './components/Tabs';
import './components/TabItem';
import './components/TabPanel';
import './components/Dialog';
import './components/Switch';
import './components/Accordion';
import './components/AccordionItem';
import './components/RadioGroup';
import './components/RadioItem';
import './components/Tooltip';
import './components/Field';

import type { Slider } from './components/Slider/Slider';
import type { RadioGroup } from './components/RadioGroup/RadioGroup';
import type { Switch } from './components/Switch/Switch';
import type { Dialog } from './components/Dialog/Dialog';
import type { Tooltip } from './components/Tooltip/Tooltip';
import type { TextField } from './components/TextField/TextField';
import type { Field } from './components/Field/Field';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

// --- Slider ------------------------------------------------------------------------------
const volume = $<Slider>('volume');
const volumeReadout = $('volume-readout');
const showVolume = () => (volumeReadout.textContent = `value: ${volume.value}`);
volume.addEventListener('ds-value-change', showVolume);
$('volume-down').addEventListener('click', () => {
  volume.value = Math.max(0, volume.value - 10);
  showVolume();
});
$('volume-up').addEventListener('click', () => {
  volume.value = Math.min(100, volume.value + 10);
  showVolume();
});

// --- RadioGroup --------------------------------------------------------------------------
const plan = $<RadioGroup>('plan');
const planReadout = $('plan-readout');
plan.addEventListener('ds-value-change', () => {
  planReadout.textContent = `chosen: ${plan.value}`;
});

// --- Switch ------------------------------------------------------------------------------
const wifi = $<Switch>('s2');
$('toggle-wifi').addEventListener('click', () => {
  wifi.checked = !wifi.checked;
});

// --- Dialog ------------------------------------------------------------------------------
const dialog = $<Dialog>('dialog');
$('open-dialog').addEventListener('click', () => {
  dialog.open = true;
});
// The buttons inside are slotted, so they are in THIS document rather than the dialog's shadow
// root — an ordinary querySelectorAll finds them.
for (const button of document.querySelectorAll('[data-close]')) {
  button.addEventListener('click', () => {
    dialog.open = false;
  });
}

// --- Tooltip -----------------------------------------------------------------------------
const tip = $<Tooltip>('tip');
$('toggle-tip').addEventListener('click', () => {
  tip.open = !tip.open;
});

// --- Field -------------------------------------------------------------------------------
const email = $<TextField>('email');
const field = $<Field>('field');
email.addEventListener('ds-value-change', () => {
  field.invalid = email.value.length > 0 && !email.value.includes('@');
});
