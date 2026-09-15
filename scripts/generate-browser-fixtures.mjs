/** Generate alternate contract modes through the real emitters, without editing the source contract. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { BACKENDS, REPO_ROOT, contractPaths, readJson } from './contract-lib.mjs';
import { elementFor } from '../packages/platform-web/resolve.mjs';
const exportsByBackend = {
  react: 'emitTsx',
  vue: 'emitSfc',
  angular: 'emitComponent',
  wc: 'emitComponent',
};
const extensions = { react: 'tsx', vue: 'vue', angular: 'ts', wc: 'ts' };
const prefix = readJson(join(REPO_ROOT, 'ds.config.json')).dataPrefix;
for (const { framework } of BACKENDS) {
  const contract = readJson(contractPaths('TextField').contract);
  contract.states.value.editing = 'commit';
  contract.component = 'CommittedTextField';
  const binding = {
    ...readJson(contractPaths('TextField', framework).binding),
    element: elementFor('TextField'),
  };
  const emitter = await import(`../packages/${framework}/src/emit/emit.mjs`);
  const output = join(
    REPO_ROOT,
    `apps/${framework}-sandbox/src/browser-generated/CommittedTextField`,
  );
  mkdirSync(output, { recursive: true });
  writeFileSync(
    join(output, `CommittedTextField.${extensions[framework]}`),
    emitter[exportsByBackend[framework]]('CommittedTextField', contract, binding, prefix),
  );
  writeFileSync(
    join(output, 'CommittedTextField.structure.css'),
    '/* Fixture: native input requires no extra layout. */\n',
  );
  writeFileSync(
    join(output, 'CommittedTextField.theme.css'),
    '/* Fixture intentionally unstyled. */\n',
  );
}
