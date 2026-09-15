#!/usr/bin/env node
import { formFor } from '../packages/emit-web/contract.mjs';
/**
 * `pnpm verify:parity` — the many-backends gate.
 *
 * More than one backend created ways for this repo to be quietly wrong that produce no build error,
 * no type error and no failing test. That is the category `CLAUDE.md` says must be gated in CI
 * rather than trusted to a reviewer.
 *
 * FAILS
 *   copies    a framework package contains a copy of a shared behaviour core. These lived in three
 *             places while a second and third backend were measured against them, and moved into
 *             `@ds/behavior` once that measurement was complete (docs/research/0005). A reappearing
 *             copy is a silent fork of the decision logic: that backend's components would answer a
 *             key differently from every other backend's, and every package would still compile.
 *   surface   two backends' `behavior` barrels export a different set of names. Each backend wraps
 *             the SAME primitives in its own binding and re-exports them; a barrel that drifts means
 *             an emitted component compiles against one backend and not another.
 *   element   a root element map is missing or a binding overrides shared ELEMENT data. Which element carries a role is
 *             web-platform knowledge, so the two cannot both be right — one backend would render a
 *             <div> where another renders a <button>, with every ARIA consequence that follows.
 *
 * REPORTS, and does not fail
 *   coverage  a contract with a binding in one framework and not another. A backend is allowed to
 *             lag: each one began at zero of fifteen, and a gate would have failed on all of them on
 *             day one, which is how a gate gets switched off.
 *
 * WHAT THIS GATE NO LONGER DOES, and it is progress rather than a hole: it used to compare three
 * byte-identical copies of the behaviour cores for drift. There is one copy now, so there is nothing
 * to compare — `copies` replaces that check by asserting the copies stay gone.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));

import { relationshipConformance, formConformance } from './relationship-conformance.mjs';
import { BACKENDS } from './backends.mjs';
import Ajv from 'ajv/dist/2020.js';
import { loadComponents, loadProfile } from '../packages/platform-web/resolve.mjs';

/** The framework-free decision logic. It lives in ONE place and must stay there. */
const SHARED_CORES = ['dismissal.ts', 'linear-navigation.ts', 'range-stepping.ts'];

const failures = [];
const reports = [];

// ---------------------------------------------------------------------------------------
// copies — a shared core must not reappear inside a framework package
// ---------------------------------------------------------------------------------------
for (const backend of BACKENDS) {
  for (const file of SHARED_CORES) {
    if (existsSync(join(REPO_ROOT, backend.dir, 'src/behavior', file))) {
      failures.push(
        `copies    ${backend.dir}/src/behavior/${file} exists again.\n` +
          `          Framework-free decision logic lives in packages/behavior. A copy here is a\n` +
          `          silent fork — every package would still compile, and two backends would\n` +
          `          disagree about what a key means.`,
      );
    }
  }
}

// ---------------------------------------------------------------------------------------
// surface — every backend's behavior barrel must export the same names
// ---------------------------------------------------------------------------------------
//
// Parsed with a regex rather than by importing, because these are TypeScript and this script is
// plain Node. It is looking for export statements, not evaluating them.
const exportedNames = (file) => {
  const src = readFileSync(file, 'utf8');
  const names = new Set();
  for (const m of src.matchAll(/export\s+(?:type\s+)?\{([^}]*)\}/g)) {
    for (const raw of m[1].split(',')) {
      const part = raw.trim();
      if (!part) continue;
      // `intentFor as navigationIntentFor` — the exported name is what a consumer sees.
      const as = part.split(/\s+as\s+/);
      names.add((as[1] ?? as[0]).trim());
    }
  }
  return names;
};

const barrels = BACKENDS.map((b) => ({
  ...b,
  file: join(REPO_ROOT, b.dir, 'src/behavior/index.ts'),
})).filter((b) => existsSync(b.file));

if (barrels.length > 1) {
  const [first, ...rest] = barrels;
  const firstNames = exportedNames(first.file);
  for (const other of rest) {
    const otherNames = exportedNames(other.file);
    const missing = [...firstNames].filter((n) => !otherNames.has(n)).sort();
    const extra = [...otherNames].filter((n) => !firstNames.has(n)).sort();
    if (missing.length || extra.length) {
      failures.push(
        `surface   ${other.dir}/src/behavior/index.ts does not export what ${first.dir}'s does.\n` +
          (missing.length ? `          missing: ${missing.join(', ')}\n` : '') +
          (extra.length ? `          extra:   ${extra.join(', ')}\n` : '') +
          `          Every backend wraps the same primitives. A barrel that drifts means an\n` +
          `          emitted component compiles against one backend and not another.`,
      );
    }
  }
}

// ---------------------------------------------------------------------------------------
// element — the bindings must agree about what is rendered
// ---------------------------------------------------------------------------------------
//
// Root elements are shared platform data. Bindings may not override them.
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

const ajv = new Ajv({ allErrors: true, strict: false });
const platform = loadComponents();
const profile = loadProfile();
const platformSchema = ajv.compile(
  readJson(join(REPO_ROOT, 'packages/platform-web/components.schema.json')),
);
if (!platformSchema(readJson(join(REPO_ROOT, 'packages/platform-web/components.json'))))
  failures.push(`element map: ${ajv.errorsText(platformSchema.errors)}`);
for (const [component, element] of Object.entries(platform)) {
  if (
    !existsSync(
      join(REPO_ROOT, 'packages/contracts/components', component, `${component}.contract.json`),
    )
  )
    failures.push(`element map: orphan ${component}`);
  if (!(element in profile.elements))
    failures.push(`element map: ${component} uses unknown element ${element}`);
}
for (const backend of BACKENDS) {
  const validate = ajv.compile(
    readJson(join(REPO_ROOT, backend.dir, 'bindings/binding.schema.json')),
  );
  for (const [name, binding] of byBackend.get(backend.framework)) {
    if (!validate(binding))
      failures.push(`${backend.framework}/${name}: ${ajv.errorsText(validate.errors)}`);
    if (
      !existsSync(join(REPO_ROOT, 'packages/contracts/components', name, `${name}.contract.json`))
    )
      failures.push(`${backend.framework}/${name}: orphan binding`);
    if (
      resolve(REPO_ROOT, backend.dir, 'bindings', binding.contract) !==
      resolve(REPO_ROOT, 'packages/contracts/components', name, `${name}.contract.json`)
    )
      failures.push(`${backend.framework}/${name}: invalid contract pointer`);
  }
}

for (const component of everyComponent) {
  const present = BACKENDS.filter((b) => byBackend.get(b.framework).has(component));
  const missing = BACKENDS.filter((b) => !byBackend.get(b.framework).has(component));
  if (missing.length) {
    reports.push(
      `coverage  ${component} has a binding for ${present.map((b) => b.framework).join(', ')} ` +
        `but not ${missing.map((b) => b.framework).join(', ')}`,
    );
  }
  const contract = readJson(
    join(REPO_ROOT, 'packages/contracts/components', component, `${component}.contract.json`),
  );
  try {
    formFor(contract);
  } catch (error) {
    failures.push(error.message);
  }
  for (const backend of present) {
    const formResult = formConformance(contract, backend.framework);
    if (formResult.status === 'non-conforming')
      reports.push(`NON-CONFORMING ${backend.framework}/${component} form: ${formResult.detail}`);
    const result = relationshipConformance(contract, backend.framework);
    for (const gap of result.gaps)
      reports.push(`NON-CONFORMING ${backend.framework}/${component} ${gap.path}: ${gap.reason}`);
  }
  if (!platform[component]) failures.push(`element map: no semantic root for ${component}`);
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
    `${barrels.length} behaviour barrels agree, ${SHARED_CORES.length} shared cores in one place.`,
);
