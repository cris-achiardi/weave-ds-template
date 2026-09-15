import { describe, it, expect } from 'vitest';
import { composeComponent, coverage } from '../scripts/contract.mjs';
import { reportPaints } from '../scripts/report-paints.mjs';
import { readJson, REPO_ROOT } from '../scripts/contract-lib.mjs';
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
