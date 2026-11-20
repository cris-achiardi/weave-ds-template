import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import prettier from 'prettier';
import { consumerNamedPart, loadPair } from '../packages/emit-web/contract.mjs';
import { readJson, REPO_ROOT } from '../scripts/contract-lib.mjs';
import { relationshipConformance } from '../scripts/relationship-conformance.mjs';
import { emitTsx } from '../packages/react/src/emit/emit.mjs';
import { emitSfc } from '../packages/vue/src/emit/emit.mjs';
import { emitComponent } from '../packages/wc/src/emit/emit.mjs';
import { emitComponent as emitAngular } from '../packages/angular/src/emit/emit.mjs';
import { createElement } from '../apps/react-sandbox/node_modules/react/index.js';
import { renderToStaticMarkup } from '../apps/react-sandbox/node_modules/react-dom/server.js';
import { Tabs } from '../apps/react-sandbox/src/components/Tabs/index.ts';
import { TabItem } from '../apps/react-sandbox/src/components/TabItem/index.ts';
import { TabPanel } from '../apps/react-sandbox/src/components/TabPanel/index.ts';

// Regression for #44. Tabs emitted an EMPTY, self-closing tablist and projected its tabs and panels
// as siblings of it, with the consumer's name on the generic root. The contract now places the tabs
// in a `tabs` slot filling the `list` part, keeps the panels as children of the root (after the
// list), and routes the consumer's name to the list with `namedByConsumer`.
const prefix = readJson(join(REPO_ROOT, 'ds.config.json')).dataPrefix;
const contractsDir = join(REPO_ROOT, 'packages/contracts');
const load = (name, bindingsDir, suffix) =>
  loadPair({ name, contractsDir, bindingsDir: join(REPO_ROOT, bindingsDir), suffix });

// [label, bindings, suffix, emit, sandbox file, prettier parser, tabs outlet, panels outlet, name]
const backends = [
  [
    'React',
    'packages/react/bindings',
    '.react.json',
    emitTsx,
    'apps/react-sandbox/src/components/Tabs/Tabs.tsx',
    'typescript',
    '{tabs}',
    '{children}',
    /aria-label=\{ariaLabel\} aria-labelledby=\{ariaLabelledby\}/,
  ],
  [
    'Vue',
    'packages/vue/bindings',
    '.vue.json',
    emitSfc,
    'apps/vue-sandbox/src/components/Tabs/Tabs.vue',
    'vue',
    '<slot name="tabs" />',
    '<slot />',
    /v-bind="consumerName"/,
  ],
  [
    'Angular',
    'packages/angular/bindings',
    '.angular.json',
    emitAngular,
    'apps/angular-sandbox/src/components/Tabs/Tabs.ts',
    'typescript',
    '<ng-content select="[slot=tabs]" />',
    '<ng-content />',
    /\[attr\.aria-label\]="ariaLabel\(\)" \[attr\.aria-labelledby\]="ariaLabelledby\(\)"/,
  ],
  [
    'WC',
    'packages/wc/bindings',
    '.wc.json',
    emitComponent,
    'apps/wc-sandbox/src/components/Tabs/Tabs.ts',
    'typescript',
    '<slot name="tabs"></slot>',
    '<slot></slot>',
    /this\.#part\('list'\)!\.setAttribute\('aria-label', label\)/,
  ],
];

describe('Tabs: the tablist owns the tabs and the panels sit after it (#44)', () => {
  it.each(backends)(
    '%s: the tabs outlet is INSIDE the tablist, the panels outlet after it closes',
    (_, dir, suffix, emit, _file, _parser, tabsOutlet, panelsOutlet) => {
      const { contract, binding } = load('Tabs', dir, suffix);
      const out = emit('Tabs', contract, binding, prefix);
      // The self-closing (empty) tablist is the bug.
      expect(out).not.toMatch(/role="tablist"[^>]*\/>/);
      const open = out.search(/<div[^>]*role="tablist"/);
      expect(open).toBeGreaterThan(-1);
      const close = out.indexOf('</div>', open);
      const tabs = out.indexOf(tabsOutlet, open);
      expect(tabs).toBeGreaterThan(open);
      expect(tabs).toBeLessThan(close);
      const panels = out.indexOf(panelsOutlet, close);
      expect(panels).toBeGreaterThan(close);
    },
  );

  it.each(backends)(
    "%s: the consumer's name is routed to the tablist",
    (_, dir, suffix, emit, _file, _parser, _t, _p, name) => {
      const { contract, binding } = load('Tabs', dir, suffix);
      expect(emit('Tabs', contract, binding, prefix)).toMatch(name);
    },
  );

  // Drift guard: the DOM test below and the browser lane run the SANDBOX files, so they must be the
  // emitter's formatted output — otherwise a hand-edited sandbox could pass while the emitter is
  // still wrong.
  it.each(backends)(
    '%s: the sandbox Tabs file is the formatted emitter output',
    async (_, dir, suffix, emit, file, parser) => {
      const { contract, binding } = load('Tabs', dir, suffix);
      const formatted = await prettier.format(emit('Tabs', contract, binding, prefix), {
        parser,
        ...(await prettier.resolveConfig(join(REPO_ROOT, file))),
      });
      expect(formatted).toBe(readFileSync(join(REPO_ROOT, file), 'utf8'));
    },
  );
});

it('React renders every tab inside the named tablist, and the panels after it', () => {
  const html = renderToStaticMarkup(
    createElement(
      Tabs,
      {
        defaultValue: 'overview',
        'aria-label': 'Project sections',
        tabs: [
          createElement(TabItem, { key: 'o', value: 'overview', label: 'Overview' }),
          createElement(TabItem, { key: 'a', value: 'activity', label: 'Activity' }),
        ],
      },
      createElement(TabPanel, { key: 'o', value: 'overview' }, 'Overview panel'),
      createElement(TabPanel, { key: 'a', value: 'activity' }, 'Activity panel'),
    ),
  );
  // The tablist element, balanced: from its open tag to the </div> that closes IT, not the first
  // nested one.
  const start = html.search(/<div role="tablist"/);
  expect(start).toBeGreaterThan(-1);
  let depth = 0;
  let end = -1;
  for (const m of html.slice(start).matchAll(/<div\b|<\/div>/g)) {
    depth += m[0] === '</div>' ? -1 : 1;
    if (depth === 0) {
      end = start + m.index + m[0].length;
      break;
    }
  }
  const list = html.slice(start, end);
  expect(list.slice(0, list.indexOf('>'))).toContain('aria-label="Project sections"');
  expect(list.match(/role="tab"/g)).toHaveLength(2);
  expect(list).not.toContain('role="tabpanel"');
  expect(html.slice(end).match(/role="tabpanel"/g)).toHaveLength(2);
  // The generic root must not ALSO carry the name.
  const root = html.match(/<div[^>]*data-ds-component="Tabs"[^>]*>/)[0];
  expect(root).not.toContain('aria-label');
});

describe('namedByConsumer is validated once, for every backend', () => {
  const base = () =>
    structuredClone(load('Tabs', 'packages/react/bindings', '.react.json').contract);

  it('names the flagged part, and leaves the name on the root when nothing is flagged', () => {
    expect(consumerNamedPart(base())).toBe('list');
    const none = base();
    delete none.anatomy.root.parts.list.namedByConsumer;
    expect(consumerNamedPart(none)).toBeNull();
  });

  it('refuses a part without a role, a second flagged part, and a clash with namedBy', () => {
    const noRole = base();
    delete noRole.anatomy.root.parts.list.role;
    expect(() => consumerNamedPart(noRole)).toThrow(/no role/);

    const two = base();
    two.anatomy.root.parts.extra = { part: 'extra', role: 'group', namedByConsumer: true };
    expect(() => consumerNamedPart(two)).toThrow(/at most one part/);

    const clash = base();
    clash.anatomy.root.parts.list.namedBy = 'extra';
    expect(() => consumerNamedPart(clash)).toThrow(/two name sources/);
  });

  it('reports the WC aria-labelledby gap instead of claiming it', () => {
    const wc = relationshipConformance(base(), 'wc');
    expect(wc.gaps).toContainEqual(
      expect.objectContaining({
        path: 'root.list.namedByConsumer',
        reason: 'omitted-cross-shadow-reference',
      }),
    );
    expect(relationshipConformance(base(), 'react').gaps).toEqual([]);
  });
});
