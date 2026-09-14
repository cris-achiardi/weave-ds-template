<!--
  The Vue sandbox page.

  SPIKE STATE, and a DELIBERATE MIRROR of apps/react-sandbox/src/App.tsx. Everything under
  ./components was GENERATED from the same fifteen contracts the React sandbox was generated from:

    node packages/vue/src/emit/emit.mjs <Name> --out apps/vue-sandbox/src/components

  Nothing is imported from @ds/vue, which exports no components and never will. The components live
  here, in the consumer's own tree, which is the architecture in one import path.

  WHAT THIS PAGE IS FOR, and it is not the same as what the React page is for. That page grades
  fifteen contracts against what they promised. This one asks ONE question: put the same contract
  through a different backend, and do you get the same component? So the specimens are the React
  page's specimens, in the same order, with the same content — differences you see here are the
  finding.

  THE THEME FILES ARE COPIED FROM THE REACT SANDBOX, byte for byte, and that is the point rather
  than a shortcut. `<Name>.theme.css` is the CONSUMER's file; it selects on data attributes the
  contract produced and contains no framework at all. If the two backends have really compiled one
  specification, one stylesheet has to dress both. It does.

  NO VERDICTS HERE. The React sandbox carries a status board because someone drove every component
  in a browser key by key. Nothing on this page has earned that yet, and copying its neighbour's
  verdicts would be inventing a measurement — the one thing this repo's rules forbid outright.
-->

<script setup lang="ts">
import { computed, ref } from 'vue';
import Specimen from './Specimen.vue';

import { Button } from './components/Button';
import { Checkbox } from './components/Checkbox';
import { TextField } from './components/TextField';
import { Slider } from './components/Slider';
import { Tabs } from './components/Tabs';
import { TabItem } from './components/TabItem';
import { TabPanel } from './components/TabPanel';
import { Dialog } from './components/Dialog';
import { Switch } from './components/Switch';
import { Accordion } from './components/Accordion';
import { AccordionItem } from './components/AccordionItem';
import { RadioGroup } from './components/RadioGroup';
import { RadioItem } from './components/RadioItem';
import { Tooltip } from './components/Tooltip';
import { Field } from './components/Field';

const wifi = ref(true);
const email = ref('');
const plan = ref('monthly');
const tipOpen = ref(false);
const terms = ref<'unchecked' | 'checked' | 'mixed'>('mixed');
const volume = ref(40);
const dialogOpen = ref(false);
const tab = ref('overview');
const openSections = ref(['what']);

const invalid = computed(() => email.value.length > 0 && !email.value.includes('@'));
</script>

<template>
  <main class="sandbox">
    <header>
      <h1>Design system sandbox — Vue</h1>
      <p>
        The same fifteen contracts the React sandbox renders, compiled by
        <code>packages/vue/src/emit/emit.mjs</code> instead. Open both at once —
        <code>:4300</code> and <code>:4301</code> — and the comparison is the whole experiment. See
        <code>docs/research/0004-a-second-backend-reading-the-same-contracts.md</code>.
      </p>
      <p>
        <strong>Not graded.</strong> The React page labels every specimen with how far its contract
        got, because someone drove each one in a browser. Nothing here has been through that, so
        nothing here claims it.
      </p>
    </header>

    <Specimen
      name="Button"
      of="Button"
      note="Three axes become three typed props with defaults, each value reaching the DOM as its own data attribute — identical output to the React backend, because an axis is a contract fact and a data attribute is a platform one. hierarchy is the RANK of the action; variant is its colour."
    >
      <Button hierarchy="primary">Save changes</Button>
      <Button hierarchy="secondary">Cancel</Button>
      <Button hierarchy="tertiary">Learn more</Button>
      <Button hierarchy="primary" variant="danger">Delete project</Button>
      <Button hierarchy="secondary" variant="danger">Delete</Button>
      <Button hierarchy="secondary" variant="brand">Upgrade</Button>
    </Specimen>

    <Specimen
      name="Button — size and state"
      of="Button-size"
      note="The icon slots are the first visible divergence, and it is a spelling rather than a difference in kind: React passes `iconStart` as a prop typed ReactNode, Vue fills a named template slot. The contract said `slot`, and that one word is what left both backends room."
    >
      <Button size="s">Small</Button>
      <Button size="m">Medium</Button>
      <Button size="l">Large</Button>
      <Button hierarchy="primary" loading>Saving</Button>
      <Button disabled>Disabled</Button>
      <Button hierarchy="primary">
        <template #iconStart><span>+</span></template>
        With icon
      </Button>
    </Specimen>

    <Specimen
      name="Checkbox"
      of="Checkbox"
      note="A state with THREE values rather than two, carried by a single v-model. `mixed` is not a third click target: activates.between names the two a user may reach, so a mixed checkbox resolves to checked."
    >
      <Checkbox v-model:checked="terms">
        <template #label>Select all (currently {{ terms }})</template>
      </Checkbox>
      <Checkbox :checked="'checked'"><template #label>Marketing email</template></Checkbox>
      <Checkbox><template #label>Product updates</template></Checkbox>
      <Checkbox :checked="'mixed'"><template #label>Partly chosen</template></Checkbox>
      <Checkbox invalid><template #label>Required, and unanswered</template></Checkbox>
      <Checkbox disabled :checked="'checked'"><template #label>Disabled</template></Checkbox>
    </Specimen>

    <Specimen
      name="TextField"
      of="TextField"
      note="THE ONE PLACE THE TWO BACKENDS WIRE A DIFFERENT EVENT. React uses onChange, which is React's synthetic per-keystroke event; the DOM's own change event fires on blur, so Vue must use @input to get the same behaviour. The contract says only that the element edits its own value — correctly, because naming either event would have put one framework's runtime into the specification."
    >
      <TextField placeholder="Uncontrolled" />
      <TextField size="s" placeholder="Small" />
      <TextField size="l" placeholder="Large" />
      <TextField invalid :value="'not an email'" />
      <TextField read-only :value="'Read-only'" />
      <TextField disabled placeholder="Disabled" />
    </Specimen>

    <Specimen
      name="Slider"
      of="Slider"
      note="Arrow keys, Page Up/Down, Home/End and pointer drag, all from the same pure range-stepping core the React build runs — literally the same file, duplicated with a banner saying so. The fill and the thumb are positioned from --ds-fraction, published on the component's own root."
    >
      <Slider v-model:value="volume" aria-label="Volume" />
      <span class="readout">value: {{ volume }}</span>
      <button type="button" class="ghost" @click="volume = Math.max(0, volume - 10)">−10</button>
      <button type="button" class="ghost" @click="volume = Math.min(100, volume + 10)">+10</button>
    </Specimen>

    <Specimen
      name="Tabs + TabItem + TabPanel"
      of="Tabs"
      note="A collection with two kinds of member. React publishes the selection over context; this publishes it over provide/inject, with the injection key exported from the SFC's non-setup script block because a setup block cannot export a binding. The keyboard model is transcribed field for field from collection.navigation in both."
    >
      <Tabs v-model:value="tab" aria-label="Project sections">
        <TabItem value="overview"><template #label>Overview</template></TabItem>
        <TabItem value="activity"><template #label>Activity</template></TabItem>
        <TabItem value="settings" disabled><template #label>Settings</template></TabItem>
        <TabPanel value="overview">
          A collection with two kinds of member. This panel and its tab compare against the same
          value; neither holds it.
        </TabPanel>
        <TabPanel value="activity">
          Selection follows focus in this pattern, which suits panels already in memory and is the
          wrong default for one that fetches. The contract cannot say which was chosen.
        </TabPanel>
        <TabPanel value="settings">
          A panel for the disabled tab. It exists so the tab&rsquo;s aria-controls resolves to
          something.
        </TabPanel>
      </Tabs>
    </Specimen>

    <Specimen
      name="Dialog"
      of="Dialog"
      note="A native <dialog> opened with showModal(). React needs its first useEffect here; Vue needs its first flush: 'post' watcher — the framework primitive differs, the platform obligation does not. Both learn from @ds/platform-web that the element supplies focus containment, inertness and Escape, and both sync the open state back from the element's own attribute with a MutationObserver."
    >
      <Button hierarchy="primary" @click="dialogOpen = true">Open the dialog</Button>
      <Dialog v-model:open="dialogOpen">
        <template #title>Delete this project?</template>
        <template #body>
          Everything in it goes with it. Escape and the backdrop both close this, and neither is
          code either emitter wrote by choice — one comes from the platform, one from the contract.
        </template>
        <template #actions>
          <Button hierarchy="secondary" @click="dialogOpen = false">Cancel</Button>
          <Button hierarchy="primary" variant="danger" @click="dialogOpen = false">Delete</Button>
        </template>
      </Dialog>
    </Specimen>

    <Specimen
      name="Switch"
      of="Switch"
      note="THE CLEAREST EVIDENCE ON THE PAGE. `checked` is control: shared, and that compiles to three React props — checked, defaultChecked, onCheckedChange — and to ONE Vue defineModel. Same sentence in the contract, because it says who may set the state and not how many props that costs."
    >
      <span class="labelled">
        <Switch id="s1" :checked="true" />
        <label for="s1">Notifications</label>
      </span>
      <span class="labelled">
        <Switch id="s2" v-model:checked="wifi" />
        <label for="s2">Wi-Fi (two-way bound)</label>
      </span>
      <button type="button" class="ghost" @click="wifi = !wifi">Toggle from outside</button>
      <span class="labelled">
        <Switch id="s3" disabled :checked="true" />
        <label for="s3">Disabled</label>
      </span>
      <span class="labelled">
        <Switch id="s4" read-only :checked="true" />
        <label for="s4">Read-only</label>
      </span>
    </Specimen>

    <Specimen
      name="Accordion + AccordionItem"
      of="Accordion"
      note="cardinality: many, so the selection is a list rather than a string — and the model is still one binding. The aria-expanded/controls/labelledby triangle and the hidden panel are generated from the contract's anatomy in both backends."
    >
      <Accordion v-model:value="openSections">
        <AccordionItem value="what">
          <template #heading>What is a contract?</template>
          <template #panel>
            The agnostic specification a component is generated from. It is the thing this library
            ships; the component is output.
          </template>
        </AccordionItem>
        <AccordionItem value="why">
          <template #heading>Why does this one open?</template>
          <template #panel>
            Because the contract says what opening means: the accordion holds a selection, this item
            is a member of it, and the trigger toggles that membership.
          </template>
        </AccordionItem>
        <AccordionItem value="disabled" disabled>
          <template #heading>This one is disabled</template>
          <template #panel>You should not be able to read this.</template>
        </AccordionItem>
      </Accordion>
    </Specimen>

    <Specimen
      name="RadioGroup + RadioItem"
      of="RadioGroup"
      note="cardinality: one, and the sold-out option is skipped by the arrows rather than kept focusable — the one place these contracts disagree with the tabs, declared in collection.navigation and read identically by both backends."
    >
      <RadioGroup v-model:value="plan" aria-label="Billing period" class="radio-row">
        <RadioItem value="monthly"><template #label>Monthly</template></RadioItem>
        <RadioItem value="yearly"><template #label>Yearly (2 months free)</template></RadioItem>
        <RadioItem value="lifetime" disabled>
          <template #label>Lifetime (sold out)</template>
        </RadioItem>
      </RadioGroup>
      <span class="readout">chosen: {{ plan }}</span>
    </Specimen>

    <Specimen
      name="Tooltip"
      of="Tooltip"
      note="Correct structure, and nothing opens it — exactly as in React. The contract says hover-after-a-delay and focus in prose; `activates` covers clicks only. A gap in the CONTRACT reproduces identically in a second backend, which is how you tell it apart from a gap in an emitter."
    >
      <Tooltip v-model:open="tipOpen">
        <template #trigger>
          <button type="button" class="ghost" @click="tipOpen = !tipOpen">
            Toggle the tooltip from outside
          </button>
        </template>
        <template #content>
          A contract can describe this bubble. It cannot yet say what opens it, or where it goes.
        </template>
      </Tooltip>
    </Specimen>

    <Specimen
      name="Field"
      of="Field"
      note="A generated component composing another generated component — and in Vue the composition is a template slot rather than a prop, which is the second and last place the two surfaces differ in kind. The ARIA wiring is identical: named by the label, described by the description and the error, error hidden until invalid."
    >
      <Field :invalid="invalid">
        <template #label>Email address</template>
        <template #description>We only use this to send receipts.</template>
        <template v-if="invalid" #error>That does not look like an email address.</template>
        <template #control>
          <TextField v-model:value="email" placeholder="you@example.com" :invalid="invalid" />
        </template>
      </Field>
    </Specimen>
  </main>
</template>
