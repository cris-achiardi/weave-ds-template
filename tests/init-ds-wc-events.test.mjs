import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import prettier from 'prettier';
import { applyRules, buildRules, componentTags } from '../scripts/init-ds-lib.mjs';
import { loadPair } from '../packages/emit-web/contract.mjs';
import { readJson, REPO_ROOT } from '../scripts/contract-lib.mjs';
import { emitComponent } from '../packages/wc/src/emit/emit.mjs';

// Regression for PR #50's red init-ds CI jobs. The WC emitter names its events from the data
// prefix (`new CustomEvent('<prefix>-' + type, …)`, listened for as `<prefix>-value-change`), but no
// init-ds rule matched either form: a bare `'<prefix>-'` literal and a `<prefix>-<state>-change`
// name carry no tag. A branded repo therefore kept dispatching the OLD event names while the emitter
// produced the new ones. Simulated here without branding the checkout: rename each WC sandbox file
// with init-ds's own rules and compare it with the emitter's output for the new prefix.
const identity = readJson(join(REPO_ROOT, 'ds.config.json'));
const from = identity.dataPrefix;
const to = 'renamed';
const rules = buildRules(from, to, componentTags(REPO_ROOT));
// The emitter reads the package SCOPE from ds.config.json itself, which this simulation cannot
// rename, so only the scope rule is applied to its output. Everything prefix-derived comes from the
// `prefix` argument and is compared as emitted.
const scopeRule = rules.filter(([pattern]) => pattern.source === `@${from}\\/`);

const wcComponents = readdirSync(join(REPO_ROOT, 'packages/contracts/components'))
  .filter((name) => existsSync(join(REPO_ROOT, 'packages/wc/bindings', `${name}.wc.json`)))
  .sort();

const format = async (text, file) =>
  prettier.format(text, { parser: 'typescript', ...(await prettier.resolveConfig(file)) });

describe('init-ds renames everything the WC emitter derives from the prefix', () => {
  it('covers every WC component', () => {
    expect(wcComponents.length).toBeGreaterThan(0);
    expect(scopeRule).toHaveLength(1);
  });

  it.each(wcComponents)('%s: renamed sandbox file equals the emitter output', async (name) => {
    const file = join(REPO_ROOT, 'apps/wc-sandbox/src/components', name, `${name}.ts`);
    const { contract, binding } = loadPair({
      name,
      contractsDir: join(REPO_ROOT, 'packages/contracts'),
      bindingsDir: join(REPO_ROOT, 'packages/wc/bindings'),
      suffix: '.wc.json',
    });
    // init-ds formats every file it renames, so both sides are formatted.
    const emitted = await format(
      applyRules(emitComponent(name, contract, binding, to), scopeRule),
      file,
    );
    const renamed = await format(applyRules(readFileSync(file, 'utf8'), rules), file);
    expect(renamed).toBe(emitted);
  });
});

describe('WC event-name rename rules', () => {
  it.each([
    [`new CustomEvent('${from}-' + type, {`, `new CustomEvent('${to}-' + type, {`],
    [`addEventListener('${from}-value-change', f)`, `addEventListener('${to}-value-change', f)`],
    [`\`${from}-checked-change\``, `\`${to}-checked-change\``],
    [`"event": "${from}-open-change"`, `"event": "${to}-open-change"`],
  ])('renames %s', (before, after) => {
    expect(applyRules(before, rules)).toBe(after);
  });

  it.each([
    `data-${from}-value-change`,
    `my-${from}-value-change`,
    `${from}-decide`,
    `${from}-change-log`,
    `x${from}-'`,
  ])('preserves %s', (text) => {
    expect(applyRules(text, rules)).toBe(text.replace(`data-${from}-`, `data-${to}-`));
  });
});
