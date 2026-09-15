#!/usr/bin/env node
/** Read a contract with every backend's derived public surface; no generated code required. */
import { existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  BACKENDS,
  REPO_ROOT,
  listContracts,
  contractPaths,
  readJson,
  surfaceFor,
} from './contract-lib.mjs';

export function composeComponent(name, selected) {
  const paths = contractPaths(name);
  if (!existsSync(paths.contract)) return null;
  const contract = readJson(paths.contract);
  const backends = Object.fromEntries(
    BACKENDS.filter((b) => !selected || b.framework === selected).map((b) => {
      const path = contractPaths(name, b.framework).binding;
      return [
        b.framework,
        {
          binding: existsSync(path) ? readJson(path) : null,
          surface: surfaceFor(contract, b.framework),
        },
      ];
    }),
  );
  return { component: name, contract, backends };
}
export function coverage() {
  const contracts = listContracts();
  return Object.fromEntries(
    BACKENDS.map((b) => {
      const bindings = readdirSync(join(REPO_ROOT, b.dir, 'bindings'))
        .filter((f) => f.endsWith(b.suffix))
        .map((f) => f.slice(0, -b.suffix.length));
      return [
        b.framework,
        {
          total: contracts.length,
          bound: contracts.filter((n) => bindings.includes(n)),
          unbound: contracts.filter((n) => !bindings.includes(n)),
          orphans: bindings.filter((n) => !contracts.includes(n)).sort(),
        },
      ];
    }),
  );
}
function main() {
  const args = process.argv.slice(2);
  const index = args.indexOf('--backend');
  const backend = index >= 0 ? args.splice(index, 2)[1] : undefined;
  if (index >= 0 && !BACKENDS.some((b) => b.framework === backend))
    throw new Error('Expected --backend react|vue|angular|wc');
  if (args.includes('--coverage')) {
    console.log(JSON.stringify(coverage(), null, 2));
    return;
  }
  const name = args.find((a) => !a.startsWith('-'));
  const view = name && composeComponent(name, backend);
  if (!view) throw new Error(`Expected a contract name: ${listContracts().join(', ')}`);
  if (!args.includes('--pretty')) console.log(JSON.stringify(view, null, 2));
  else {
    console.log(`# ${name}\n\n${view.contract.intent?.purpose ?? ''}`);
    for (const [framework, info] of Object.entries(view.backends)) {
      console.log(`\n## ${framework}${info.binding ? '' : ' (unbound)'}\n`);
      for (const entry of info.surface)
        console.log(
          `- ${entry.name}: ${entry.type} (${entry.role})${entry.event ? `; event: ${entry.event}` : ''}${entry.attribute ? `; attribute: ${entry.attribute}` : ''}`,
        );
    }
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
