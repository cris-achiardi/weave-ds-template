import { it, expect } from 'vitest';
import Ajv from 'ajv/dist/2020.js';
import { formFor } from '../packages/emit-web/contract.mjs';
import { readJson, contractPaths, REPO_ROOT } from '../scripts/contract-lib.mjs';
import { join } from 'node:path';
const validate = new Ajv({ strict: false }).compile(
  readJson(join(REPO_ROOT, 'packages/contracts/schema/component.schema.json')),
);
it('validates form serialization and rejects missing or incompatible sources', () => {
  for (const name of ['TextField', 'Checkbox', 'Switch', 'Slider', 'RadioGroup']) {
    const contract = readJson(contractPaths(name).contract);
    expect(validate(contract)).toBe(true);
    expect(formFor(contract)).not.toBeNull();
  }
  const text = readJson(contractPaths('TextField').contract);
  text.form.source = 'missing';
  expect(() => formFor(text)).toThrow(/source/);
  text.form.source = 'value';
  text.form.encoding = 'number';
  expect(() => formFor(text)).toThrow(/encoding/);
  const checkbox = readJson(contractPaths('Checkbox').contract);
  checkbox.form.checkedValue = 'invalid';
  expect(() => formFor(checkbox)).toThrow(/domain/);
  delete checkbox.form.checkedValue;
  expect(validate(checkbox)).toBe(false);
});
