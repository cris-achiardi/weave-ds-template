import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import prettier from 'prettier';
import { applyRules, buildRules, componentTags } from '../scripts/init-ds-lib.mjs';
import { loadPair } from '../packages/emit-web/contract.mjs';
import { formDisabledKey } from '../packages/emit-web/form-disabled.mjs';
import { readJson, REPO_ROOT } from '../scripts/contract-lib.mjs';
import { emitTsx } from '../packages/react/src/emit/emit.mjs';
import { emitSfc } from '../packages/vue/src/emit/emit.mjs';
import { emitComponent } from '../packages/angular/src/emit/emit.mjs';

// The framework form controls share one fieldset observer per document, registered under
// `Symbol.for('<prefix>.form-disabled')` (packages/emit-web/form-disabled.mjs). That dotted key
// carries no tag and no hyphen, so no existing init-ds rule matched it: a branded repo kept the old
// key in every generated file while fresh emission used the new one. Same simulation as
// init-ds-wc-events.test.mjs: rename each sandbox file with init-ds's own rules and compare it with
// the emitter's output for the new prefix.
const from = readJson(join(REPO_ROOT, 'ds.config.json')).dataPrefix;
const to = 'renamed';
const rules = buildRules(from, to, componentTags(REPO_ROOT));
const scopeRule = rules.filter(([pattern]) => pattern.source === `@${from}\\/`);

const BACKENDS = [
  { framework: 'react', ext: 'tsx', emit: emitTsx },
  { framework: 'vue', ext: 'vue', emit: emitSfc },
  { framework: 'angular', ext: 'ts', emit: emitComponent },
];
// Every contract with a custom form control: the components that emit the shared watcher.
const COMPONENTS = ['Checkbox', 'RadioGroup', 'Slider', 'Switch'];
const cases = BACKENDS.flatMap((backend) => COMPONENTS.map((name) => [backend.framework, name]));

const format = async (text, file) =>
  prettier.format(text, { filepath: file, ...(await prettier.resolveConfig(file)) });

describe('init-ds renames the shared form-disabled registry key', () => {
  it.each([
    [`Symbol.for('${formDisabledKey(from)}')`, `Symbol.for('${formDisabledKey(to)}')`],
    [`Symbol.for("${formDisabledKey(from)}")`, `Symbol.for("${formDisabledKey(to)}")`],
    [`\`${from}.form-disabled\``, `\`${to}.form-disabled\``],
  ])('renames %s', (before, after) => {
    expect(applyRules(before, rules)).toBe(after);
  });

  it.each([`'${from}.config.json'`, `${from}.form-disabled`, `'x${from}.form-disabled'`])(
    'preserves %s',
    (text) => {
      expect(applyRules(text, rules)).toBe(text);
    },
  );

  it.each(cases)(
    '%s/%s: renamed sandbox file equals the emitter output',
    async (framework, name) => {
      const { ext, emit } = BACKENDS.find((b) => b.framework === framework);
      const file = join(
        REPO_ROOT,
        `apps/${framework}-sandbox/src/components`,
        name,
        `${name}.${ext}`,
      );
      const { contract, binding } = loadPair({
        name,
        contractsDir: join(REPO_ROOT, 'packages/contracts'),
        bindingsDir: join(REPO_ROOT, `packages/${framework}/bindings`),
        suffix: `.${framework}.json`,
      });
      const emitted = await format(applyRules(emit(name, contract, binding, to), scopeRule), file);
      const renamed = await format(applyRules(readFileSync(file, 'utf8'), rules), file);
      expect(renamed).toContain(`Symbol.for('${formDisabledKey(to)}')`);
      expect(renamed).toBe(emitted);
    },
  );
});
