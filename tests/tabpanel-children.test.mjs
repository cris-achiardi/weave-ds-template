import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import prettier from 'prettier';
import { loadPair } from '../packages/emit-web/contract.mjs';
import { readJson, REPO_ROOT } from '../scripts/contract-lib.mjs';
import { emitTsx } from '../packages/react/src/emit/emit.mjs';
import { emitSfc } from '../packages/vue/src/emit/emit.mjs';
import { emitComponent } from '../packages/wc/src/emit/emit.mjs';
import { emitComponent as emitAngular } from '../packages/angular/src/emit/emit.mjs';
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

it('TabPanel renders its consumer content inside the root in React, Vue, WC and Angular', () => {
  const react = load('packages/react/bindings', '.react.json');
  const reactOut = emitTsx('TabPanel', react.contract, react.binding, prefix);
  expect(reactOut).toMatch(/\{children\}\s*\n\s*<\/div>/);

  const vue = load('packages/vue/bindings', '.vue.json');
  const vueOut = emitSfc('TabPanel', vue.contract, vue.binding, prefix);
  expect(vueOut).toMatch(/<slot \/>\s*\n\s*<\/div>/);

  const wc = load('packages/wc/bindings', '.wc.json');
  const wcOut = emitComponent('TabPanel', wc.contract, wc.binding, prefix);
  expect(wcOut).toMatch(/<slot><\/slot>\s*\n\s*<\/div>/);

  // Angular attaches to the consumer's element, so the root IS the host: the template holds only
  // the projection outlet.
  const ng = load('packages/angular/bindings', '.angular.json');
  const ngOut = emitAngular('TabPanel', ng.contract, ng.binding, prefix);
  expect(ngOut).toMatch(/template: `\n\s*<ng-content \/>\n\s*`,/);
});

// Drift guard: the sandbox files must be the emitter's output, formatted. Without this the DOM test
// below could pass against hand-edited sandbox code while the emitter still drops the content.
it('the React, Vue and Angular sandbox TabPanel files are the formatted emitter output', async () => {
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

  const ng = load('packages/angular/bindings', '.angular.json');
  const ngOut = emitAngular('TabPanel', ng.contract, ng.binding, prefix);
  const ngFile = 'apps/angular-sandbox/src/components/TabPanel/TabPanel.ts';
  expect(
    await prettier.format(ngOut, {
      parser: 'typescript',
      ...(await prettier.resolveConfig(join(REPO_ROOT, ngFile))),
    }),
  ).toBe(sandbox(ngFile));
});

// `composition.children.part` names an anatomy KEY. The root's `part` is a styling NAME, and a
// schema-valid contract may give a sub-part a key equal to it. Here the root is styled `label` and a
// sub-part is KEYED `label` (styled `text`): every backend must emit exactly one outlet, in the part
// the key names — never one in the root and a second in the sub-part.
describe('the children outlet follows the anatomy key, not the root part name', () => {
  const backends = [
    ['React', 'packages/react/bindings', '.react.json', emitTsx, /\{children\}/g],
    ['Vue', 'packages/vue/bindings', '.vue.json', emitSfc, /<slot \/>/g],
    ['WC', 'packages/wc/bindings', '.wc.json', emitComponent, /<slot><\/slot>/g],
    ['Angular', 'packages/angular/bindings', '.angular.json', emitAngular, /<ng-content \/>/g],
  ];
  const variant = (contract, childrenPart) => {
    const c = structuredClone(contract);
    c.anatomy.root.part = 'label';
    c.anatomy.root.parts = {
      label: { part: 'text', description: 'Keyed like the root is named.' },
    };
    c.composition.children.part = childrenPart;
    return c;
  };

  it.each(backends)(
    '%s: children keyed to the sub-part emit one outlet, inside it',
    (_, dir, suffix, emit, outlet) => {
      const { contract, binding } = load(dir, suffix);
      const out = emit('TabPanel', variant(contract, 'label'), binding, prefix);
      expect(out.match(outlet)).toHaveLength(1);
      const subPart = out.indexOf('"text"');
      expect(subPart).toBeGreaterThan(-1);
      expect(out.search(outlet)).toBeGreaterThan(subPart);
    },
  );

  it.each(backends)(
    '%s: children keyed to the root emit one outlet',
    (_, dir, suffix, emit, outlet) => {
      const { contract, binding } = load(dir, suffix);
      const out = emit('TabPanel', variant(contract, 'root'), binding, prefix);
      expect(out.match(outlet)).toHaveLength(1);
    },
  );
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
