import { it, expect } from 'vitest';
import { planFrom } from '../.claude/skills/ds-figma-component/scripts/contract-plan.mjs';
import { readJson, contractPaths } from '../scripts/contract-lib.mjs';

it('derives real axes, defaults, nested parts and unbound channels from the contract', () => {
  const contract = readJson(contractPaths('Button').contract);
  const plan = planFrom(contract);
  expect(plan.variants).toHaveLength(
    Object.values(contract.axes).reduce((n, a) => n * a.values.length, 1),
  );
  expect(plan.axes).toEqual(contract.axes);
  expect(plan.defaults).toEqual(
    Object.fromEntries(Object.entries(contract.axes).map(([key, def]) => [key, def.default])),
  );
  expect(plan.parts.some((part) => part.part === 'label')).toBe(true);
  expect(plan.unbound).toContainEqual({ part: 'root.label', channel: 'color' });
  expect(plan.policies).toEqual([]);
});
it('does not turn state into variant axes or a token policy into a selected variable', () => {
  const plan = planFrom({
    component: 'Example',
    states: { checked: { control: 'shared' } },
    anatomy: { root: { part: 'root', paints: { color: '--brand-color-', opacity: null } } },
  });
  expect(plan.variants).toEqual([{}]);
  expect(plan.states.checked).toEqual({ control: 'shared' });
  expect(plan.policies).toEqual([
    { part: 'root', channel: 'color', policy: '--brand-color-', binding: null },
  ]);
});
