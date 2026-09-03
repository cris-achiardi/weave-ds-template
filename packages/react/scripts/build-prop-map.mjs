#!/usr/bin/env node
/**
 * `pnpm prop-map` — regenerate the prop glossary in .ai/maps/.
 *
 * TWO HALVES, and the split is the whole idea:
 *   CANONICAL — packages/react/prop-map.config.json, hand-maintained. What the vocabulary
 *               SHOULD be: shared axes, their values, the anti-synonym glossary, and the
 *               disposition of each known divergence.
 *   MEASURED  — extracted from component source. What the vocabulary ACTUALLY is.
 *
 * DESCRIPTIVE, NOT PRESCRIPTIVE. This reports and classifies. It resolves nothing and changes no
 * component. Nothing about an off-canon prop breaks a build, so without `--check` in CI the
 * glossary would be advisory and would quietly rot.
 *
 * `--check` asserts two things: the committed files byte-match a fresh run, and every recorded
 * disposition still names a component and prop that exist.
 *
 * Runs, and is USEFUL, with zero components. In that state it emits the declared canon and says
 * so — which is exactly the vocabulary a design proposal has to be written in before anything
 * is built.
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { extractProps } from './extract/props.mjs';
import { extractCvaAxes, flattenAxes } from './extract/cva.mjs';
import { REPO_ROOT, listComponents, componentPaths, readJson, byCodePoint } from './lib.mjs';

const OUT_DIR = join(REPO_ROOT, '.ai/maps');
const OUT_JSON = join(OUT_DIR, 'prop-map.json');
const OUT_MD = join(OUT_DIR, 'prop-map.md');
const CANON = join(REPO_ROOT, 'packages/contracts/prop-canon.json');

const check = process.argv.includes('--check');

// ---------------------------------------------------------------------------------------
// measure
// ---------------------------------------------------------------------------------------

function measure() {
  const components = listComponents();
  const props = {};
  const warnings = [];
  let degraded = false;

  for (const name of components) {
    const paths = componentPaths(name);
    const source = readFileSync(paths.tsx, 'utf8');
    const extracted = extractProps(paths.tsx);
    const { axes } = flattenAxes(extractCvaAxes(source, paths.tsx));

    if (extracted.degraded) degraded = true;
    for (const w of extracted.warnings) warnings.push(`${name}: ${w}`);

    for (const [prop, info] of Object.entries(extracted.props)) {
      const values = axes[prop]?.values ?? info.values ?? null;
      const entry = (props[prop] ??= { values: {}, usedOn: [], types: new Set() });
      entry.usedOn.push(name);
      entry.types.add(info.type);
      if (values) entry.values[values.join('|')] = values;
    }
  }

  return { components, props, warnings: warnings.sort(byCodePoint), degraded };
}

/** Classify a measured prop against the canon. */
function classify(prop, entry, canon) {
  if (canon.axes[prop]) return 'axis';
  const types = [...entry.types];
  if (types.every((t) => t === 'boolean')) return 'boolean';
  if (Object.keys(entry.values).length) return 'enum';
  if (types.some((t) => /ReactNode|ReactElement|JSX\.Element/.test(t))) return 'node';
  return 'local';
}

/** Every way a measured prop diverges from the canon it claims to belong to. */
function findFlags(props, canon) {
  const flags = [];

  for (const prop of Object.keys(props).sort(byCodePoint)) {
    const entry = props[prop];
    const axis = canon.axes[prop];
    const sets = Object.values(entry.values);

    if (axis && !axis.profiles) {
      for (const set of sets) {
        const strays = set.filter((v) => !axis.values.includes(v));
        for (const v of strays) {
          flags.push({
            kind: 'off-canon-value',
            prop,
            value: v,
            components: entry.usedOn,
            detail: `"${v}" is not a canonical value of the \`${prop}\` axis (${axis.values.join(' | ')}).`,
          });
        }
      }
    }

    // A synonym is only visible by comparing value sets across props, which is the one thing a
    // per-component review cannot see and the reason this map is worth generating at all.
    if (!axis && sets.length) {
      for (const [axisName, def] of Object.entries(canon.axes)) {
        if (def.profiles) continue;
        for (const set of sets) {
          if (set.length > 1 && set.every((v) => def.values.includes(v))) {
            flags.push({
              kind: 'possible-synonym',
              prop,
              components: entry.usedOn,
              detail: `\`${prop}\` has the value set [${set.join(', ')}], which fits the \`${axisName}\` axis. Reuse the axis name rather than coining a synonym.`,
            });
          }
        }
      }
    }

    if (sets.length > 1) {
      flags.push({
        kind: 'divergent-value-sets',
        prop,
        components: entry.usedOn,
        detail: `\`${prop}\` is exposed with ${sets.length} different value sets across components.`,
      });
    }
  }

  return flags.sort((a, b) =>
    byCodePoint(a.prop + a.kind + (a.value ?? ''), b.prop + b.kind + (b.value ?? '')),
  );
}

// ---------------------------------------------------------------------------------------
// render
// ---------------------------------------------------------------------------------------

function buildJson(canon, m, flags) {
  const empty = m.components.length === 0;

  const axes = {};
  for (const name of Object.keys(canon.axes).sort(byCodePoint)) {
    const def = canon.axes[name];
    const usedOn = m.props[name]?.usedOn?.slice().sort(byCodePoint) ?? [];
    axes[name] = {
      concept: def.concept,
      canonicalValues: def.values ?? null,
      profiles: def.profiles
        ? Object.fromEntries(Object.entries(def.profiles).map(([k, v]) => [k, v.values]))
        : null,
      default: def.default ?? null,
      usedOnCount: usedOn.length,
      usedOn,
    };
  }

  const props = {};
  for (const name of Object.keys(m.props).sort(byCodePoint)) {
    const e = m.props[name];
    props[name] = {
      kind: classify(name, e, canon),
      axis: canon.axes[name] ? name : null,
      valueSets: Object.values(e.values).sort((a, b) => byCodePoint(a.join('|'), b.join('|'))),
      types: [...e.types].sort(byCodePoint),
      usedOn: e.usedOn.slice().sort(byCodePoint),
      usedCount: e.usedOn.length,
    };
  }

  const kindCounts = { axis: 0, enum: 0, boolean: 0, node: 0, local: 0 };
  for (const p of Object.values(props)) kindCounts[p.kind] += 1;

  const glossary = { ...canon.glossary };
  delete glossary._doc;

  return {
    _schema: '1.0',
    _doc:
      'Prop glossary / lookup table. Descriptive: what each prop is, its acceptable values, and ' +
      'the components using it, with divergence flagged against the canonical axis registry. ' +
      'Generated by packages/react/scripts/build-prop-map.mjs from component source + ' +
      'prop-canon.json. Resolves nothing; flags only.',
    _regenerate: 'pnpm prop-map (reads source directly — no build required)',
    _state: empty ? 'canon-only' : 'measured',
    ...(empty
      ? {
          _stateNote:
            'Nothing measured. The axis registry and value glossary below are the DECLARED canon, ' +
            'carried over from prop-canon.json. The measured half reads HAND-WRITTEN component ' +
            'source, and there is none: components are generated from contracts into a consumer ' +
            'repository. Contracts DO declare axes, and a prop surface is derivable from one — see ' +
            'surfaceFrom() in the emitter — so this half is repairable and simply has not been ' +
            'repaired. It is a gap, not the intended state.',
        }
      : {}),
    generatedFrom: {
      components: null,
      canon: 'packages/contracts/prop-canon.json',
      prose: 'packages/contracts/components/README.md §2',
    },
    componentCount: m.components.length,
    propCount: Object.keys(props).length,
    kindCounts,
    conventions: canon.conventions,
    axes,
    glossary,
    props,
    flags,
    flagCount: flags.length,
    extraction: {
      componentsScanned: m.components.length,
      propsResolved: Object.keys(props).length,
      degraded: m.degraded,
      warnings: m.warnings,
    },
  };
}

function buildMd(json, canon) {
  const empty = json.componentCount === 0;
  const L = [];

  L.push('# Prop Glossary & Lookup Table', '');
  L.push('> Generated by `packages/react/scripts/build-prop-map.mjs` — **do not edit by hand.**');
  L.push(
    '> Regenerate with `pnpm prop-map`. It reads component source directly, so no build is needed.',
  );
  L.push('>');
  L.push(
    '> **Descriptive, not prescriptive.** This documents every prop, its acceptable values, and',
  );
  L.push('> the components using it, and _flags_ divergence from the canonical axes. It resolves');
  L.push('> nothing and changes no component. The canon itself lives in');
  L.push('> [`prop-canon.json`](../../packages/contracts/prop-canon.json) (data) and');
  L.push('> `packages/contracts/components/README.md` §2 (prose).');
  L.push('');
  L.push(
    `**Coverage:** ${json.componentCount} components · ${json.propCount} props · ${json.flagCount} flags.`,
  );
  L.push('');

  if (empty) {
    L.push('> **State: canon-only, and §3–§4 are BLIND rather than empty.** §1 and §2 below are');
    L.push('> the *declared* canon — the vocabulary a design proposal must be written in. §3 and');
    L.push('> §4 measure reality against it by reading hand-written component source, and there');
    L.push('> is none: components are generated from contracts into a consumer repository.');
    L.push('>');
    L.push('> This is a GAP, not the intended state. Fifteen contracts declare axes, and a prop');
    L.push('> surface is derivable from a contract without any source — the emitter already does');
    L.push('> it. Until the measured half is repointed at contracts, nothing checks that the');
    L.push('> vocabulary a contract uses is the canon.');
    L.push('');
  }

  L.push('## How to use this', '');
  L.push(
    '- **Designing a component API?** Start at the **Axis registry**. If your prop is a known',
  );
  L.push('  axis, use its canonical name and values.');
  L.push('- **Naming a value?** Check the **Value glossary** before coining one.');
  L.push('- **The Drift report** is the review backlog. A divergence with no recorded disposition');
  L.push('  shows as `unreviewed`, so the list cannot quietly rot.');
  L.push('', '---', '');

  L.push('## 1. Axis registry', '');
  L.push(
    'A prop whose meaning is system-wide. Values are canonical; a component exposes a subset,',
  );
  L.push('never a synonym.', '');
  L.push('| Axis | Concept | Canonical values | Default | Used on |');
  L.push('| --- | --- | --- | --- | ---: |');
  for (const [name, a] of Object.entries(json.axes)) {
    const values = a.profiles
      ? Object.entries(a.profiles)
          .map(([p, vs]) => `_${p}_: ${vs.join(' · ')}`)
          .join('<br>')
      : (a.canonicalValues ?? []).join(' · ');
    L.push(
      `| \`${name}\` | ${a.concept} | ${values} | ${a.default ? `\`${a.default}\`` : '—'} | ${a.usedOnCount} |`,
    );
  }
  L.push('');

  L.push('## 2. Value glossary (anti-synonym list)', '');
  L.push(
    'One spelling, one meaning. A new value is added here in the same change that introduces it.',
    '',
  );
  L.push('| Value | Meaning |');
  L.push('| --- | --- |');
  for (const key of Object.keys(json.glossary).sort(byCodePoint)) {
    L.push(`| \`${key}\` | ${json.glossary[key]} |`);
  }
  L.push('');

  L.push('## 3. Prop index', '');
  if (empty) {
    L.push('_No components yet. Nothing has been measured._');
  } else {
    L.push('| Prop | Kind | Values / type | Used on |');
    L.push('| --- | --- | --- | --- |');
    for (const [name, p] of Object.entries(json.props)) {
      const vals = p.valueSets.length
        ? p.valueSets.map((s) => s.join(' · ')).join('<br>')
        : p.types.join(', ');
      L.push(`| \`${name}\` | ${p.kind} | ${vals} | ${p.usedOn.join(', ')} |`);
    }
  }
  L.push('');

  L.push('## 4. Drift report', '');
  if (!json.flags.length) {
    L.push('_No divergences._');
    if (empty) {
      L.push('');
      L.push('Nothing has been measured. A prop that diverges from §1 and has no disposition in');
      L.push('`prop-map.config.json` will appear here as `unreviewed`.');
    }
  } else {
    const dispositions = canon.dispositions ?? {};
    for (const f of json.flags) {
      const keys = f.components.map((c) => `${c}.${f.prop}`);
      const d = keys.map((k) => dispositions[k]).find(Boolean);
      const label = d ? `${d.disposition} — ${d.reason}` : '**unreviewed**';
      L.push(`- \`${f.prop}\` (${f.components.join(', ')}) — ${f.detail} · ${label}`);
    }
  }
  L.push('');

  if (json.extraction.warnings.length) {
    L.push('## 5. Extraction warnings', '');
    L.push('Where the reader could not fully resolve a prop. A warning here means every artifact');
    L.push('downstream is thinner than it looks — investigate before trusting the map.', '');
    for (const w of json.extraction.warnings) L.push(`- ${w}`);
    L.push('');
  }

  return L.join('\n');
}

// ---------------------------------------------------------------------------------------

function main() {
  const canon = readJson(CANON);
  const m = measure();
  const flags = findFlags(m.props, canon);

  // A disposition naming something that no longer exists is stale, and a stale disposition
  // silently marks a real divergence as reviewed. Fail rather than carry it.
  const stale = [];
  for (const key of Object.keys(canon.dispositions ?? {}).sort(byCodePoint)) {
    const [component, prop] = key.split('.');
    if (!m.components.includes(component)) stale.push(`${key} — no component "${component}"`);
    else if (!m.props[prop]?.usedOn.includes(component))
      stale.push(`${key} — ${component} has no prop "${prop}"`);
  }

  const json = buildJson(canon, m, flags);
  const jsonText = JSON.stringify(json, null, 2) + '\n';
  const mdText = buildMd(json, canon);

  if (check) {
    const problems = [...stale.map((s) => `stale disposition: ${s}`)];
    for (const [path, expected] of [
      [OUT_JSON, jsonText],
      [OUT_MD, mdText],
    ]) {
      if (!existsSync(path)) problems.push(`${path} is missing — run \`pnpm prop-map\`.`);
      else if (readFileSync(path, 'utf8') !== expected)
        problems.push(`${path} is out of date — run \`pnpm prop-map\` and commit the result.`);
    }
    if (problems.length) {
      console.error('prop-map:check failed:\n');
      for (const p of problems) console.error(`  ${p}`);
      process.exit(1);
    }
    console.log(
      `prop-map:check OK — ${json.componentCount} components, ${json.propCount} props, ${json.flagCount} flags.`,
    );
    return;
  }

  if (stale.length) {
    console.error('Stale dispositions in prop-map.config.json:\n');
    for (const s of stale) console.error(`  ${s}`);
    process.exit(1);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_JSON, jsonText);
  writeFileSync(OUT_MD, mdText);
  console.log(
    `prop-map: ${json.componentCount} components, ${json.propCount} props, ${json.flagCount} flags (${json._state}).`,
  );
}

main();
