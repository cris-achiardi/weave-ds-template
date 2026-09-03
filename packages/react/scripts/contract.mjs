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
  listContracts,
  listBindings,
  contractPaths,
  listComponents,
  componentPaths,
  readJson,
  dsConfig,
  compose,
} from './lib.mjs';

export function composeComponent(name) {
  const paths = componentPaths(name);
  if (!existsSync(paths.tsx)) return null;

  const source = readFileSync(paths.tsx, 'utf8');
  const { props, warnings, degraded } = extractProps(paths.tsx);
  const { axes, conflicts } = flattenAxes(extractCvaAxes(source, paths.tsx));
  const parts = extractParts(source, dsConfig().dataPrefix);
  const contract = existsSync(paths.contract) ? readJson(paths.contract) : null;
  const binding = existsSync(paths.binding) ? readJson(paths.binding) : null;

  return compose({
    name,
    props,
    cvaAxes: axes,
    parts,
    contract,
    binding,
    warnings: [...warnings, ...conflicts.map((c) => `${c.axis}: ${c.detail}`)],
    degraded,
  });
}

/**
 * Coverage, asked the right way round.
 *
 * This used to ask "which COMPONENTS have contracts?" — the right question when components were
 * hand-written and a contract was optional annotation. Components are now generated FROM
 * contracts, so the contract is the population and the question is "which contracts can this
 * backend compile?". A contract with no binding is a specification this backend cannot build.
 *
 * Asked the old way, this repo answered "0/0 components contracted. No components exist yet — the
 * intended starting state, not a gap." Confidently wrong: fifteen contracts existed and no script
 * could see any of them.
 */
function coverage() {
  const contracts = listContracts();
  const bindings = listBindings();

  if (!contracts.length) {
    console.log('0 contracts. `packages/contracts/components/` is empty — the intended');
    console.log('starting state, not a gap. See docs/ADR/README.md.');
    return 0;
  }

  const rows = contracts.map((name) => ({
    name,
    bound: existsSync(contractPaths(name).binding),
  }));
  const bound = rows.filter((r) => r.bound).length;
  console.log(`${bound}/${rows.length} contracts have a React binding.`);
  console.log('');
  for (const r of rows) {
    const flag = r.bound ? 'bound' : 'UNBOUND — this backend cannot compile it';
    console.log(`  ${r.name.padEnd(24)} ${flag}`);
  }

  // A binding with no contract is the other orphan, and the more dangerous one: it points at a
  // specification that does not exist, and nothing else in this repo would notice.
  const orphans = bindings.filter((b) => !contracts.includes(b));
  if (orphans.length) {
    console.log('');
    console.log('ORPHAN BINDINGS — no contract of this name exists:');
    for (const o of orphans) console.log(`  ${o}`);
  }

  console.log('');
  console.log('An unbound contract is reported, never failed: a contract is written before any');
  console.log('backend compiles it, and that order is the point rather than a gap.');
  return 0;
}

function pretty(view) {
  const lines = [`# ${view.component}`, ''];
  if (!view.contracted)
    lines.push('**Uncontracted** — no .contract.json. Implementation only.', '');
  if (view.status) lines.push(`Status: ${view.status.level} since ${view.status.since}`, '');

  if (view.intent?.purpose) lines.push(`## Purpose`, '', view.intent.purpose, '');
  if (view.intent?.behaviour?.length) {
    lines.push('## Behaviour', '');
    for (const b of view.intent.behaviour) lines.push(`- ${b}`);
    lines.push('');
  }
  if (view.intent?.notFor?.length) {
    lines.push('## Not for', '');
    for (const b of view.intent.notFor) lines.push(`- ${b}`);
    lines.push('');
  }
  if (view.states) {
    lines.push('## States', '');
    for (const [s, d] of Object.entries(view.states))
      lines.push(`- \`${s}\` (${d.kind})${d.visual ? ` — ${d.visual}` : ''}`);
    lines.push('');
  }
  if (view.react) {
    lines.push('## In React', '');
    lines.push(`- renders \`<${view.react.element}>\``);
    if (view.react.refTarget) lines.push(`- ref lands on \`${view.react.refTarget}\``);
    if (view.react.classNamePassthrough)
      lines.push(`- className merges into \`${view.react.classNamePassthrough}\``);
    lines.push('');
  } else if (view.contracted) {
    lines.push('_No React binding declared._', '');
  }

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
