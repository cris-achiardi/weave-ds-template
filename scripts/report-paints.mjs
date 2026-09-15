#!/usr/bin/env node
/** Report declared paint policy against an explicit consumer theme. Findings are advisory. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  BACKENDS,
  REPO_ROOT,
  listContracts,
  contractPaths,
  readJson,
  walkAnatomy,
} from './contract-lib.mjs';

// This is a declaration report, not a cascade engine. Conditions and competing rules are
// reported together; computed values, inheritance, and external variable definitions need a browser.
export function reportPaints(contract, css, backend, prefix) {
  const rules = [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  const findings = [];
  for (const [path, node] of walkAnatomy(contract.anatomy?.root)) {
    if (!node.part) continue;
    const matching = rules.filter(([, selectors]) =>
      selectors.split(',').some((selector) => {
        const part =
          backend === 'wc'
            ? new RegExp(`\\[part=["']?${node.part}["']?\\]`).test(selector)
            : new RegExp(`data-${prefix}-component=["']?${contract.component}["']?`).test(
                selector,
              ) &&
              (path === 'root'
                ? !selector.includes(`data-${prefix}-part=`)
                : new RegExp(`data-${prefix}-part=["']?${node.part}["']?`).test(selector));
        return part;
      }),
    );
    for (const [property, policy] of Object.entries(node.paints ?? {})) {
      if (policy === null) {
        findings.push({ path, property, status: 'unbound' });
        continue;
      }
      const values = matching.flatMap(([, , body]) =>
        body.split(';').flatMap((decl) => {
          const i = decl.indexOf(':');
          return decl.slice(0, i).trim() === property ? [decl.slice(i + 1).trim()] : [];
        }),
      );
      const policies = Array.isArray(policy) ? policy : [policy];
      const matches = (value) => {
        const vars = [...value.matchAll(/var\(\s*(--[\w-]+)/g)].map((m) => m[1]);
        return policies.some((atom) =>
          atom === 'literal'
            ? vars.length === 0
            : atom === 'component-property'
              ? vars.some((v) =>
                  v.startsWith(
                    `--${prefix}-${contract.component.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()}-`,
                  ),
                )
              : vars.some((v) => v.startsWith(atom)),
        );
      };
      findings.push({
        path,
        property,
        policy,
        values,
        status: !values.length ? 'missing' : values.every(matches) ? 'satisfied' : 'mismatch',
      });
    }
  }
  return findings;
}
function main() {
  const args = process.argv.slice(2);
  const option = (name) => {
    const i = args.indexOf(name);
    return i < 0 ? undefined : args[i + 1];
  };
  const backend = option('--backend') ?? 'react';
  const theme = option('--theme');
  const component = option('--component');
  if (!BACKENDS.some((b) => b.framework === backend)) throw new Error('Unknown backend');
  if (theme && backend === 'wc' && !component)
    throw new Error(
      'Shadow themes require --component because each shadow root scopes its own stylesheet.',
    );
  const names = component ? [component] : listContracts();
  const prefix = readJson(resolve(REPO_ROOT, 'ds.config.json')).dataPrefix;
  const css = theme ? readFileSync(resolve(theme), 'utf8') : '';
  console.log(
    `Paint report (${backend}). ${theme ? 'Consumer theme supplied.' : 'No theme supplied; bound policies cannot be evaluated.'}`,
  );
  console.log(
    'Advisory declaration report; does not resolve the cascade, conditional rules, or computed values.',
  );
  for (const name of names) {
    const contract = readJson(contractPaths(name, backend).contract);
    const results = reportPaints(contract, css, backend, prefix);
    console.log(
      JSON.stringify(
        {
          component: name,
          findings: results.map((f) =>
            !theme && f.status !== 'unbound' ? { ...f, status: 'not-evaluated' } : f,
          ),
        },
        null,
        2,
      ),
    );
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
