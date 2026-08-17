#!/usr/bin/env node
/**
 * `pnpm contract <Name>` — compose one component's merged view.
 *
 * A component's description lives in two halves and NEITHER IS COMPLETE ALONE. The source owns
 * everything derivable: prop names, types, value sets, defaults, required-ness, JSDoc, and the
 * inventory of parts and states it renders. The contract owns only what the source cannot state:
 * the rendered element, where the ref lands, what a slot accepts, accessibility commitments,
 * lifecycle status, and the token policy for each part.
 *
 * Read them merged. Reading either in isolation is misleading, which is why this composer is
 * load-bearing rather than a convenience.
 *
 * Usage:
 *   pnpm contract Button            merged view as JSON
 *   pnpm contract Button --pretty   the same, as a readable summary
 *   pnpm contract --coverage        who is contracted and who is not
 */

import { existsSync, readFileSync } from 'node:fs';
import { extractProps } from './extract/props.mjs';
import { extractCvaAxes, flattenAxes } from './extract/cva.mjs';
import { extractParts } from './extract/parts.mjs';
import {
  listComponents,
  componentPaths,
  readJson,
  dsConfig,
  compose,
  isExported,
  byCodePoint,
} from './lib.mjs';

export function composeComponent(name) {
  const paths = componentPaths(name);
  if (!existsSync(paths.tsx)) return null;

  const source = readFileSync(paths.tsx, 'utf8');
  const { props, warnings, degraded } = extractProps(paths.tsx);
  const { axes, conflicts } = flattenAxes(extractCvaAxes(source, paths.tsx));
  const parts = extractParts(source, dsConfig().dataPrefix);
  const contract = existsSync(paths.contract) ? readJson(paths.contract) : null;

  return compose({
    name,
    props,
    cvaAxes: axes,
    parts,
    contract,
    warnings: [...warnings, ...conflicts.map((c) => `${c.axis}: ${c.detail}`)],
    degraded,
  });
}

function coverage() {
  const all = listComponents();
  if (!all.length) {
    console.log('0/0 components contracted. No components exist yet — this is the template’s');
    console.log('intended starting state, not a gap. See docs/ADR/README.md.');
    return 0;
  }
  const rows = all.map((name) => ({
    name,
    contracted: existsSync(componentPaths(name).contract),
    exported: isExported(name),
  }));
  const done = rows.filter((r) => r.contracted).length;
  console.log(`${done}/${rows.length} components contracted.\n`);
  for (const r of rows.sort((a, b) => byCodePoint(a.name, b.name))) {
    const flags = [r.contracted ? 'contract' : 'UNCONTRACTED', r.exported ? '' : 'NOT EXPORTED']
      .filter(Boolean)
      .join(', ');
    console.log(`  ${r.name.padEnd(24)} ${flags}`);
  }
  console.log(
    '\nUncontracted components are reported, never failed. Backfilling is deliberate work.',
  );
  return 0;
}

function pretty(view) {
  const lines = [`# ${view.component}`, ''];
  if (!view.contracted) lines.push('**Uncontracted** — no .contract.json. Derived half only.', '');
  if (view.status) lines.push(`Status: ${view.status.level} since ${view.status.since}`, '');

  const props = Object.entries(view.props);
  lines.push(`## Props (${props.length})`, '');
  for (const [name, p] of props) {
    const vals = p.values?.length ? p.values.join(' | ') : p.type;
    const def = p.default != null ? `  (default ${p.default})` : '';
    const req = p.required ? '  required' : '';
    lines.push(`- \`${name}\`: ${vals}${def}${req}`);
    if (p.description) lines.push(`    ${p.description}`);
  }

  lines.push('', `## Renders`, '');
  lines.push(`- parts: ${view.rendered.parts.join(', ') || '(none)'}`);
  lines.push(`- states: ${view.rendered.states.join(', ') || '(none)'}`);

  if (view.extraction.warnings.length) {
    lines.push('', '## Extraction warnings', '');
    for (const w of view.extraction.warnings) lines.push(`- ${w}`);
  }
  return lines.join('\n');
}

function main() {
  const args = process.argv.slice(2);

  if (args.includes('--coverage')) process.exit(coverage());

  const name = args.find((a) => !a.startsWith('-'));
  if (!name) {
    console.error('Usage: pnpm contract <ComponentName> [--pretty]   |   pnpm contract --coverage');
    process.exit(2);
  }

  const view = composeComponent(name);
  if (!view) {
    const known = listComponents();
    console.error(`No component named "${name}".`);
    console.error(
      known.length
        ? `Known components: ${known.join(', ')}`
        : 'No components exist yet. This template ships empty — build one with the ds-component skill.',
    );
    process.exit(1);
  }

  console.log(args.includes('--pretty') ? pretty(view) : JSON.stringify(view, null, 2));
}

// Only run the CLI when invoked directly, so composeComponent stays importable by the gate.
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('contract.mjs')) {
  main();
}
