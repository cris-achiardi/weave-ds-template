import { describe, it, expect } from 'vitest';
import { composeComponent, coverage } from '../scripts/contract.mjs';
import { reportPaints } from '../scripts/report-paints.mjs';
import { contractPaths, readJson, REPO_ROOT } from '../scripts/contract-lib.mjs';
import { relationshipConformance } from '../scripts/relationship-conformance.mjs';
import { join } from 'node:path';

describe('repository contract readers', () => {
  it('attributes actual model APIs to each backend', () => {
    const { backends } = composeComponent('TextField');
    expect(backends.react.surface.some((e) => e.name === 'onValueChange')).toBe(true);
    expect(backends.vue.surface.find((e) => e.name === 'value').event).toBe('update:value');
    expect(backends.angular.surface.find((e) => e.name === 'value').event).toBe('valueChange');
    const prefix = readJson(join(REPO_ROOT, 'ds.config.json')).dataPrefix;
    expect(backends.wc.surface.find((e) => e.name === 'value')).toMatchObject({
      attribute: 'value',
      event: `${prefix}-value-change`,
    });
    expect(backends.vue.surface.some((e) => e.name === 'onValueChange')).toBe(false);
  });
  it('reports coverage for all backends', () => {
    for (const info of Object.values(coverage())) {
      expect(info.bound).toContain('TextField');
      expect(info.bound.length + info.unbound.length).toBe(info.total);
      expect(info.orphans).toEqual([]);
    }
  });
  it.each(['react', 'vue', 'angular', 'wc'])(
    'reads %s paint selectors without pretending null is a policy',
    (backend) => {
      const contract = {
        component: 'Example',
        anatomy: {
          root: {
            part: 'root',
            paints: { color: '--test-color-', opacity: null },
            parts: { label: { part: 'label', paints: { color: '--test-color-' } } },
          },
        },
      };
      const root = backend === 'wc' ? '[part="root"]' : '[data-test-component="Example"]';
      const label = backend === 'wc' ? '[part="label"]' : `${root} [data-test-part="label"]`;
      const result = reportPaints(
        contract,
        `${root} { color: var(--test-color-text); } ${label} {color: red}`,
        backend,
        'test',
      );
      expect(result.map((f) => f.status)).toEqual(['satisfied', 'unbound', 'mismatch']);
      expect(reportPaints(contract, '', backend, 'test')[0].status).toBe('missing');
    },
  );
});

describe('relationship conformance is separate from binding coverage', () => {
  it('reports no wrapper gap once relations land on the supplied control (#35, #46)', () => {
    for (const name of ['Field', 'Tooltip']) {
      const backends = composeComponent(name).backends;
      for (const framework of ['react', 'vue', 'angular']) {
        expect(backends[framework].binding).not.toBeNull();
        expect(backends[framework].relationshipConformance).toMatchObject({
          status: 'not-evaluated',
          gaps: [],
        });
      }
    }
  });
  it('reports the slotted shadow-host gap for WC Field AND Tooltip', () => {
    // Tooltip was invisible to the classifier before: its `trigger` slot has no `accepts` list,
    // and the old rule recognised a supplied control only by `input|select|textarea|Switch`.
    expect(
      composeComponent('Field').backends.wc.relationshipConformance.gaps.map((g) => g.reason),
    ).toEqual(['supplied-shadow-host', 'supplied-shadow-host', 'supplied-shadow-host']);
    expect(composeComponent('Tooltip').backends.wc.relationshipConformance.gaps).toMatchObject([
      { path: 'root.trigger.describedBy', target: 'popup', reason: 'supplied-shadow-host' },
    ]);
  });
  it('distinguishes omitted cross-shadow references from unevaluated claims', () => {
    // #36 closed the WC tab <-> panel gap: both roots are realized on their hosts (ADR 0008).
    for (const name of ['TabItem', 'TabPanel'])
      expect(composeComponent(name).backends.wc.relationshipConformance.gaps).toEqual([]);
    // A cross-member reference to a NON-root part is still something WC cannot deliver.
    const tab = structuredClone(readJson(contractPaths('TabItem').contract));
    tab.anatomy.root.controls = { member: 'TabPanel', part: 'label' };
    expect(relationshipConformance(tab, 'wc').gaps[0]).toMatchObject({
      reason: 'omitted-cross-shadow-reference',
    });
    expect(relationshipConformance(tab, 'react').status).toBe('not-evaluated');
    expect(composeComponent('Dialog').backends.wc.relationshipConformance.gaps).toEqual([]);
  });
});
