import { it, expect } from 'vitest';
import Ajv from 'ajv/dist/2020.js';
import { readJson, contractPaths, REPO_ROOT } from '../scripts/contract-lib.mjs';
import { join } from 'node:path';
const validate = new Ajv({ strict: false }).compile(
  readJson(join(REPO_ROOT, 'packages/contracts/schema/component.schema.json')),
);
it('requires an explicit reporting mode for shared text and rejects it on other states', () => {
  const contract = readJson(contractPaths('TextField').contract);
  expect(validate(contract)).toBe(true);
  contract.states.value.editing = 'commit';
  expect(validate(contract)).toBe(true);
  delete contract.states.value.editing;
  expect(validate(contract)).toBe(false);
  contract.states.value.editing = 'live';
  contract.states.disabled.editing = 'commit';
  expect(validate(contract)).toBe(false);
});
