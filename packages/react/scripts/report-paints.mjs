#!/usr/bin/env node
/**
 * `pnpm report:paints` — check each contract's declared token policy against the stylesheet.
 *
 * WHY THIS EXISTS AT ALL
 * ----------------------
 * In the shadow-DOM system this design is drawn from, the equivalent check is impossible. Its
 * own gate says so in a comment: no part-name -> CSS-selector mapping exists, because components
 * style their internals by class and the link only lives inside render(). The token policy there
 * is documentation, not a gate.
 *
 * In React with CSS Modules the mapping is free, given one convention:
 *
 *     a named node carries data-ds-part="x" AND className={styles.x}, with the same name.
 *
 * That gives `data-ds-part="label"` -> `.label` in the module -> its declarations -> resolve
 * var() chains -> compare with the declared prefix. So the best idea in the original design
 * becomes checkable here.
 *
 * REPORT, NOT A GATE — on purpose.
 * The CSS parse below is a pragmatic one, not a full cascade resolution: it does not evaluate
 * media queries, `calc()`, `color-mix()`, or a value that only resolves at runtime. A gate whose
 * false-positive rate is unknown gets switched off, and a switched-off gate protects nothing.
 * Promote it once you have components and a clean baseline. Exit code is always 0.
 */

import { existsSync, readFileSync } from 'node:fs';
import {
  listComponents,
  componentPaths,
  readJson,
  dsConfig,
  walkAnatomy,
  byCodePoint,
} from './lib.mjs';

/** Very small CSS reader: `.class { prop: value; ... }` -> Map<class, Map<prop, value>>. */
function parseModule(css) {
  const out = new Map();
  // Strip comments so a commented-out declaration is not read as live.
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const ruleRe = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = ruleRe.exec(clean)) !== null) {
    const selectors = m[1].split(',').map((s) => s.trim());
    const body = m[2];
    for (const sel of selectors) {
      // The leading class of the selector is the node this rule paints.
      const cls = sel.match(/\.([A-Za-z_][\w-]*)/)?.[1];
      if (!cls) continue;
      const decls = out.get(cls) ?? new Map();
      for (const decl of body.split(';')) {
        const i = decl.indexOf(':');
        if (i < 0) continue;
        const prop = decl.slice(0, i).trim();
        const value = decl.slice(i + 1).trim();
        if (prop && value && !decls.has(prop)) decls.set(prop, value);
      }
      out.set(cls, decls);
    }
  }
  return out;
}

/**
 * Every custom property a declaration ultimately reaches, following var() fallbacks to their
 * last resort. `var(--a, var(--b, red))` yields ['--a', '--b'].
 */
function customPropsIn(value) {
  const found = [];
  const re = /var\(\s*(--[A-Za-z0-9-]+)/g;
  let m;
  while ((m = re.exec(value)) !== null) found.push(m[1]);
  return found;
}

const camel = (s) => s.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());

/**
 * A component property is a custom property OUTSIDE the token namespace — `--button-width`,
 * `--icon-size`. The test is therefore against the configured token prefix and nothing else.
 *
 * It used to be `!/^--[a-z]+-/`, i.e. "has no dashed prefix at all". That rejected
 * `--button-width` — the very example `src/components/README.md` §4 gives for a component
 * property — and admitted only single-word names like `--width`. The first component to declare
 * one surfaced it as two findings against a correct stylesheet.
 */
function satisfies(policy, value, tokenPrefix) {
  const atoms = Array.isArray(policy) ? policy : [policy];
  const props = customPropsIn(value);
  const isToken = (p) => p.startsWith(`--${tokenPrefix}-`);

  for (const atom of atoms) {
    if (atom === 'literal' && props.length === 0) return true;
    if (atom === 'component-property' && props.length && props.every((p) => !isToken(p)))
      return true;
    if (atom.startsWith('--') && props.some((p) => p.startsWith(atom))) return true;
  }
  return false;
}

function main() {
  const cfg = dsConfig();
  const components = listComponents();
  const findings = [];
  let checked = 0;

  for (const name of components) {
    const paths = componentPaths(name);
    if (!existsSync(paths.contract)) continue;
    if (!existsSync(paths.css)) {
      findings.push({
        component: name,
        detail: `no ${name}.module.css — token policy cannot be checked.`,
      });
      continue;
    }

    const contract = readJson(paths.contract);
    const rules = parseModule(readFileSync(paths.css, 'utf8'));

    for (const [path, node] of walkAnatomy(contract.anatomy?.root)) {
      if (!node.part || !node.paints) continue;
      const cls = rules.get(camel(node.part)) ?? rules.get(node.part);
      if (!cls) {
        findings.push({
          component: name,
          detail: `${path}: part "${node.part}" has no matching class in ${name}.module.css — cannot resolve its policy.`,
        });
        continue;
      }
      for (const [prop, policy] of Object.entries(node.paints).sort(([a], [b]) =>
        byCodePoint(a, b),
      )) {
        const value = cls.get(prop);
        checked += 1;
        if (value === undefined) {
          findings.push({
            component: name,
            detail: `${path}: contract declares a policy for \`${prop}\` but .${camel(node.part)} never sets it.`,
          });
        } else if (!satisfies(policy, value, cfg.tokenPrefix)) {
          const want = Array.isArray(policy) ? policy.join(' | ') : policy;
          findings.push({
            component: name,
            detail: `${path}: \`${prop}: ${value}\` does not satisfy the declared policy \`${want}\`.`,
          });
        }
      }
    }
  }

  console.log(
    `report:paints — ${checked} declaration(s) checked across ${components.length} component(s).`,
  );
  if (!components.length) {
    console.log(
      'No components exist yet. Nothing to check — the template’s intended starting state.',
    );
  }
  if (findings.length) {
    console.log(`\n${findings.length} finding(s). This is a REPORT: it never fails the build.\n`);
    for (const f of findings.sort((a, b) =>
      byCodePoint(a.component + a.detail, b.component + b.detail),
    )) {
      console.log(`  ${f.component}: ${f.detail}`);
    }
    console.log(
      '\nPromoting this to a gate is deliberate work — do it once the findings above are a clean baseline.',
    );
  } else if (checked) {
    console.log('Every declared token policy is satisfied.');
  }

  // Always 0. See the header.
  process.exit(0);
}

main();
