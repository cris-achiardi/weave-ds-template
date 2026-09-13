#!/usr/bin/env node
/**
 * `pnpm verify:parity` — the two-backend gate.
 *
 * A second backend created two new ways for this repo to be quietly wrong, and neither produces a
 * build error, a type error or a failing test. That is the category `CLAUDE.md` says must be gated
 * in CI rather than trusted to a reviewer.
 *
 * FAILS
 *   drift     a behaviour core duplicated between packages/react and packages/vue is no longer
 *             identical. Those files are framework-free decision logic — the same code, copied
 *             deliberately so a second backend's cost could be measured before it was optimised
 *             away (see the banner at the top of each copy, and docs/research/0004). A copy that
 *             drifts means two backends silently disagree about what Escape does, and the
 *             conformance suites would both still pass, because each runs against its own copy.
 *   element   `X.react.json` and `X.vue.json` disagree about the root ELEMENT. Which element
 *             carries a role is web-platform knowledge, not framework knowledge, and it is
 *             duplicated across the two bindings on purpose. Two bindings disagreeing means one
 *             backend is rendering a different component from the same contract — a <div> where
 *             the other renders a <button>, with every ARIA consequence that follows.
 *
 * REPORTS, and does not fail
 *   coverage  a contract with a binding in one framework and not the other. This is a REPORT
 *             because a backend is allowed to lag: the Vue emitter began at zero of fifteen and a
 *             gate would have failed on all of them on day one, which is how a gate gets switched
 *             off. Promoting it is deliberate work, done against a clean baseline.
 *
 * Both failing checks have a clean baseline today, which is the only reason they are gates.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));

/**
 * Every framework package that holds bindings and an emitter. Adding a third backend means adding
 * one line here, and nothing else in this file.
 */
const BACKENDS = [
  { framework: 'react', dir: 'packages/react', suffix: '.react.json' },
  { framework: 'vue', dir: 'packages/vue', suffix: '.vue.json' },
];

/** The framework-free decision logic that is duplicated rather than shared. */
const DUPLICATED_CORES = ['dismissal.ts', 'linear-navigation.ts', 'range-stepping.ts'];

const failures = [];
const reports = [];

// ---------------------------------------------------------------------------------------
// drift — the duplicated cores must stay identical BELOW their banners
// ---------------------------------------------------------------------------------------
//
// Compared below the banner, not whole-file: each copy carries a header saying which file it was
// copied from and why it has not been moved, so the headers are legitimately different. The banner
// ends at the first blank line that is not itself a comment — in practice, the line before the
// first `//` block that the original also has.
const stripBanner = (src) => {
  const lines = src.split('\n');
  // A DUPLICATED copy opens with a banner that ends in a blank line. The original opens with its
  // own comment immediately. Dropping everything up to and including the first blank line removes
  // the banner from the copy and the first comment paragraph from the original, which would make
  // the comparison meaningless — so the banner is recognised by its first line instead.
  if (!lines[0].startsWith('// DUPLICATED')) return src;
  const end = lines.findIndex((l, i) => i > 0 && l.trim() === '');
  return lines.slice(end + 1).join('\n');
};

const reactBehavior = join(REPO_ROOT, 'packages/react/src/behavior');
for (const backend of BACKENDS.filter((b) => b.framework !== 'react')) {
  const dir = join(REPO_ROOT, backend.dir, 'src/behavior');
  if (!existsSync(dir)) continue;
  for (const file of DUPLICATED_CORES) {
    const mine = join(dir, file);
    const theirs = join(reactBehavior, file);
    if (!existsSync(mine)) {
      reports.push(`coverage  ${backend.dir}/src/behavior/${file} does not exist`);
      continue;
    }
    const a = stripBanner(readFileSync(mine, 'utf8')).replace(/\r\n/g, '\n');
    const b = readFileSync(theirs, 'utf8').replace(/\r\n/g, '\n');
    if (a !== b) {
      failures.push(
        `drift     ${backend.dir}/src/behavior/${file} has diverged from ` +
          `packages/react/src/behavior/${file}.\n` +
          `          These are ONE piece of framework-free logic held in two places on purpose. ` +
          `Either\n          re-sync the copy, or move the shared core out of both packages — but not ` +
          `by\n          letting them drift, because each backend's conformance suite runs against its own\n` +
          `          copy and both would stay green while the two disagreed.`,
      );
    }
  }
}

// ---------------------------------------------------------------------------------------
// element — the bindings must agree about what is rendered
// ---------------------------------------------------------------------------------------
const bindingsFor = (backend) => {
  const dir = join(REPO_ROOT, backend.dir, 'bindings');
  if (!existsSync(dir)) return new Map();
  return new Map(
    readdirSync(dir)
      .sort()
      .filter((f) => f.endsWith(backend.suffix))
      .map((f) => [f.slice(0, -backend.suffix.length), readJson(join(dir, f))]),
  );
};

const byBackend = new Map(BACKENDS.map((b) => [b.framework, bindingsFor(b)]));
const everyComponent = [...new Set([...byBackend.values()].flatMap((m) => [...m.keys()]))].sort(
  (a, b) => (a < b ? -1 : a > b ? 1 : 0),
);

for (const component of everyComponent) {
  const present = BACKENDS.filter((b) => byBackend.get(b.framework).has(component));
  const missing = BACKENDS.filter((b) => !byBackend.get(b.framework).has(component));
  if (missing.length) {
    reports.push(
      `coverage  ${component} has a binding for ${present.map((b) => b.framework).join(', ')} ` +
        `but not ${missing.map((b) => b.framework).join(', ')}`,
    );
  }
  const elements = new Map(
    present.map((b) => [b.framework, byBackend.get(b.framework).get(component).element]),
  );
  const distinct = new Set(elements.values());
  if (distinct.size > 1) {
    failures.push(
      `element   ${component} renders a different root element per backend: ` +
        [...elements].map(([f, e]) => `${f}=<${e}>`).join(', ') +
        `.\n          Which element carries a role is a fact about the WEB PLATFORM, so the two ` +
        `bindings\n          cannot both be right. See packages/platform-web/README.md.`,
    );
  }
}

// ---------------------------------------------------------------------------------------
// report
// ---------------------------------------------------------------------------------------
const backendList = BACKENDS.map((b) => b.framework).join(' + ');
if (reports.length) {
  console.log(`\nverify:parity — ${reports.length} report(s), not failures:\n`);
  for (const r of reports) console.log(`  ${r}`);
}
if (failures.length) {
  console.error(`\nverify:parity FAILED — ${failures.length} problem(s):\n`);
  for (const f of failures) console.error(`  ${f}\n`);
  process.exit(1);
}
console.log(
  `\nverify:parity ok — ${backendList}: ${everyComponent.length} contracts bound, ` +
    `${DUPLICATED_CORES.length} duplicated cores identical.`,
);
