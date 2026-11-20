import { afterEach, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { REPO_ROOT } from '../scripts/contract-lib.mjs';
import { contractRuleFailures } from '../scripts/contract-rules.mjs';

// Regression for the #50 review: `consumerNamedPart` validation ran only inside the emitters, so a
// contract with `namedByConsumer` on a role-less part passed `pnpm verify`. The rule now runs over
// every contract from `verify:parity` (CI). Each case runs the real CLI on a COPY of the contracts,
// so the malformed contract never touches the repository.
const CLI = join(REPO_ROOT, 'scripts/contract-rules.mjs');
const SOURCE = join(REPO_ROOT, 'packages/contracts/components');
const dirs = [];

function copyContracts() {
  const dir = mkdtempSync(join(tmpdir(), 'contract-rules-'));
  dirs.push(dir);
  cpSync(SOURCE, dir, { recursive: true });
  return dir;
}
const run = (dir) => spawnSync(process.execPath, [CLI, dir], { cwd: REPO_ROOT, encoding: 'utf8' });

afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

it('passes on the shipped contracts', () => {
  const result = run(copyContracts());
  expect(result.stderr).toBe('');
  expect(result.status).toBe(0);
  expect(contractRuleFailures()).toEqual([]);
});

it('fails on namedByConsumer placed on a role-less part (Button.label)', () => {
  const dir = copyContracts();
  const file = join(dir, 'Button/Button.contract.json');
  const contract = JSON.parse(readFileSync(file, 'utf8'));
  expect(contract.anatomy.root.parts.label.role).toBeUndefined();
  contract.anatomy.root.parts.label.namedByConsumer = true;
  writeFileSync(file, JSON.stringify(contract, null, 2));

  const result = run(dir);
  expect(result.status).toBe(1);
  expect(result.stderr).toMatch(/Button \[namedByConsumer\]: .*part "label".*no role/);
});

it('fails on a second flagged part and on a clash with namedBy', () => {
  const dir = copyContracts();
  const file = join(dir, 'Tabs/Tabs.contract.json');
  const contract = JSON.parse(readFileSync(file, 'utf8'));
  contract.anatomy.root.namedByConsumer = true;
  writeFileSync(file, JSON.stringify(contract, null, 2));
  expect(run(dir).stderr).toMatch(/Tabs \[namedByConsumer\]: .*at most one part/);

  delete contract.anatomy.root.namedByConsumer;
  contract.anatomy.root.parts.list.namedBy = 'root';
  writeFileSync(file, JSON.stringify(contract, null, 2));
  expect(run(dir).stderr).toMatch(/Tabs \[namedByConsumer\]: .*two name sources/);
});

it('is gated by verify:parity, which runs in CI', () => {
  const parity = readFileSync(join(REPO_ROOT, 'scripts/verify-parity.mjs'), 'utf8');
  expect(parity).toMatch(/failures\.push\(\.\.\.contractRuleFailures\(\)\)/);
  const ci = readFileSync(join(REPO_ROOT, '.github/workflows/verify.yml'), 'utf8');
  expect(ci).toMatch(/run: pnpm verify:parity/);
});
