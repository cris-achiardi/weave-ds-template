import { it, expect } from 'vitest';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import prettier from 'prettier';
import { loadPair } from '../packages/emit-web/contract.mjs';
import { readJson, REPO_ROOT } from '../scripts/contract-lib.mjs';
import { emitTsx } from '../packages/react/src/emit/emit.mjs';
import { emitSfc } from '../packages/vue/src/emit/emit.mjs';
import { emitComponent } from '../packages/wc/src/emit/emit.mjs';
import { createElement } from '../apps/react-sandbox/node_modules/react/index.js';
import { renderToStaticMarkup } from '../apps/react-sandbox/node_modules/react-dom/server.js';
import { Tabs } from '../apps/react-sandbox/src/components/Tabs/index.ts';
import { TabPanel } from '../apps/react-sandbox/src/components/TabPanel/index.ts';

// A root part that declares `composition.children` must place the consumer content inside the
// root element in every backend. Regression for #45: the root was skipped by the children outlet.
const prefix = readJson(join(REPO_ROOT, 'ds.config.json')).dataPrefix;
const contractsDir = join(REPO_ROOT, 'packages/contracts');
const load = (bindingsDir, suffix) =>
  loadPair({ name: 'TabPanel', contractsDir, bindingsDir: join(REPO_ROOT, bindingsDir), suffix });
const sandbox = (rel) => readFileSync(join(REPO_ROOT, rel), 'utf8');

it('TabPanel renders its consumer content inside the root in React, Vue and WC', () => {
  const react = load('packages/react/bindings', '.react.json');
  const reactOut = emitTsx('TabPanel', react.contract, react.binding, prefix);
  expect(reactOut).toMatch(/\{children\}\s*\n\s*<\/div>/);

  const vue = load('packages/vue/bindings', '.vue.json');
  const vueOut = emitSfc('TabPanel', vue.contract, vue.binding, prefix);
  expect(vueOut).toMatch(/<slot \/>\s*\n\s*<\/div>/);

  const wc = load('packages/wc/bindings', '.wc.json');
  const wcOut = emitComponent('TabPanel', wc.contract, wc.binding, prefix);
  expect(wcOut).toMatch(/<slot><\/slot>\s*\n\s*<\/div>/);
});

// Drift guard: the sandbox files must be the emitter's output, formatted. Without this the DOM test
// below could pass against hand-edited sandbox code while the emitter still drops the content.
it('the React and Vue sandbox TabPanel files are the formatted emitter output', async () => {
  const react = load('packages/react/bindings', '.react.json');
  const reactOut = emitTsx('TabPanel', react.contract, react.binding, prefix);
  const reactFile = 'apps/react-sandbox/src/components/TabPanel/TabPanel.tsx';
  expect(
    await prettier.format(reactOut, {
      parser: 'typescript',
      ...(await prettier.resolveConfig(join(REPO_ROOT, reactFile))),
    }),
  ).toBe(sandbox(reactFile));

  const vue = load('packages/vue/bindings', '.vue.json');
  const vueOut = emitSfc('TabPanel', vue.contract, vue.binding, prefix);
  const vueFile = 'apps/vue-sandbox/src/components/TabPanel/TabPanel.vue';
  expect(
    await prettier.format(vueOut, {
      parser: 'vue',
      ...(await prettier.resolveConfig(join(REPO_ROOT, vueFile))),
    }),
  ).toBe(sandbox(vueFile));
});

// DOM-level check for React: render the regenerated sandbox TabPanel and assert that the consumer
// content lands inside the element that carries role="tabpanel".
it('React TabPanel puts consumer content inside role="tabpanel" in the rendered DOM', () => {
  const html = renderToStaticMarkup(
    createElement(
      Tabs,
      { defaultValue: 'overview' },
      createElement(TabPanel, { value: 'overview' }, 'Overview panel'),
    ),
  );
  expect(html).toMatch(/<div[^>]*role="tabpanel"[^>]*>Overview panel<\/div>/);
});
