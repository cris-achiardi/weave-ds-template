#!/usr/bin/env node
/**
 * `pnpm verify:docs` — the progressive-disclosure gate.
 *
 * This repo does not restate facts; it points at them. Every layer carries an entry doc that says
 * how the layer works and indexes what is inside it, and everything else links rather than copies.
 * That is what keeps one fact in one place — see docs/ADR/0001.
 *
 * The characteristic failure of a pointer-based system is a pointer that goes nowhere, and it
 * produces NO error anywhere else: a moved schema, a renamed skill, a deleted record, a `pnpm`
 * command that was never added. The docs still render. The build still passes. The reader follows
 * the link and lands on nothing, which is worse than never having been pointed at all, because
 * they trusted it.
 *
 * FAILS
 *   link       a relative markdown link that resolves to no file
 *   command    a `pnpm <script>` named in prose that no package.json defines
 *   path       a backticked repo path that does not exist
 *   coverage   a directory holding content that no entry doc covers
 *
 * `coverage` was a report until the baseline was clean. It named four directories — `scripts/`,
 * `packages/react/scripts/`, its `extract/`, and `.github/workflows/` — all holding machinery
 * nothing indexed. Those got entry docs, the report went empty, and only then was it promoted.
 * That order matters: a gate that fails on everything on day one gets switched off, and a
 * switched-off gate protects nothing.
 *
 * "Covered" is deliberately generous, because the rule is that a reader can FIND the layer, not
 * that every folder carries a file. A directory is covered when it holds its own entry doc
 * (README.md, CLAUDE.md or SKILL.md), or when the nearest entry doc above it names it. That is why
 * a skill's `references/` does not appear here: its SKILL.md routes to it explicitly.
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SEP = String.fromCharCode(92); // backslash, without writing one into a regex
const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'storybook-static',
  '.vite',
  'coverage',
]);

const rel = (p) => relative(REPO_ROOT, p).split(SEP).join('/');

function walk(dir, out = []) {
  for (const entry of readdirSync(dir).sort()) {
    if (SKIP_DIRS.has(entry)) continue;
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const files = walk(REPO_ROOT);
const mdFiles = files.filter((f) => f.endsWith('.md'));

// Every pnpm script, and every workspace package name, defined anywhere in the repo.
const scripts = new Set();
const packageNames = new Set();
for (const pj of files.filter((f) => f.endsWith('package.json'))) {
  try {
    const parsed = JSON.parse(readFileSync(pj, 'utf8'));
    for (const s of Object.keys(parsed.scripts ?? {})) scripts.add(s);
    if (parsed.name) packageNames.add(parsed.name);
  } catch {
    /* a package.json that does not parse is typecheck's problem, not ours */
  }
}

// pnpm's own verbs, which are not repo scripts.
const PNPM_BUILTINS = new Set(['install', 'add', 'remove', 'run', 'exec', 'dlx', 'why', 'store']);

// A placeholder is not a broken link. `<figma url>`, `NNNN-kebab-title.md` and friends are
// deliberately unresolvable — they are the shape of a thing, not a reference to one.
const isPlaceholder = (s) =>
  s.includes('<') || s.includes('>') || s.includes('NNNN') || s.includes('*');

// Neither is a reference to BUILD OUTPUT. `packages/tokens/build/css/variables.css` is the file a
// consumer imports and absolutely belongs in the docs — but it is generated and gitignored, so on a
// fresh clone it does not exist yet. Its absence means "not built", not "broken pointer".
//
// This gate checks AUTHORED pointers. Requiring generated ones to exist would make `pnpm verify`
// depend on having already run `pnpm build` — which it does not, because `build` comes later in the
// chain. That is exactly how this was caught: CI's verify job runs `build:tokens` early and passed,
// while the init-ds job runs the real `pnpm verify` on a clean checkout and failed.
const GENERATED_DIRS = ['build', 'dist', 'node_modules', 'storybook-static'];
const isGenerated = (s) => s.split('/').some((seg) => GENERATED_DIRS.includes(seg));

// Nor is a MODULE SPECIFIER a repo path. `@ds/react/styles.css` is the exact string a consumer
// writes in an import; it is resolved through that package's `exports` map, and no file lives at
// that path in the repo. Documenting it is correct and the gate must not call it broken.
//
// This is checked against real workspace package names rather than "starts with @", so a genuine
// broken path can never hide behind an @-prefixed folder. `@ds/tokens/css` happened to pass
// already, but only because the pattern below needs a file extension and it has none — luck, not
// a rule. This makes it a rule.
const isModuleSpecifier = (s) => [...packageNames].some((n) => s === n || s.startsWith(n + '/'));

const problems = [];
const add = (kind, file, line, detail, hint) =>
  problems.push({ kind, where: `${rel(file)}:${line}`, detail, hint });

for (const file of mdFiles) {
  const lines = readFileSync(file, 'utf8').split('\n');
  let inFence = false;

  lines.forEach((line, i) => {
    const lineNo = i + 1;
    if (/^\s*```/.test(line)) inFence = !inFence;

    // ---- relative markdown links -------------------------------------------------------
    for (const m of line.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
      const raw = m[1].trim();
      if (/^(https?:|mailto:|#)/.test(raw) || isPlaceholder(raw) || isGenerated(raw)) continue;
      const target = raw.split('#')[0];
      if (!target) continue;
      // A leading slash means repo root, not filesystem root.
      const abs = target.startsWith('/')
        ? resolve(REPO_ROOT, '.' + target)
        : resolve(dirname(file), target);
      if (!existsSync(abs)) add('link', file, lineNo, raw, 'resolves to no file');
    }

    if (inFence) return; // code blocks may legitimately name things that do not exist yet

    // ---- `pnpm <script>` named in prose ------------------------------------------------
    for (const m of line.matchAll(/`pnpm ([a-z][a-z0-9:-]*)/g)) {
      const s = m[1];
      if (PNPM_BUILTINS.has(s) || scripts.has(s)) continue;
      add('command', file, lineNo, `pnpm ${s}`, 'no package.json defines this script');
    }

    // ---- backticked repo paths ---------------------------------------------------------
    for (const m of line.matchAll(
      /`([a-zA-Z0-9_.@/-]*\/[a-zA-Z0-9_.@/-]+\.(md|json|mjs|cjs|js|ts|tsx|css|yml|yaml))`/g,
    )) {
      const p = m[1];
      if (p.startsWith('http') || isPlaceholder(p) || isGenerated(p) || isModuleSpecifier(p))
        continue;
      const candidates = [
        resolve(REPO_ROOT, p.replace(/^\//, '')), // leading slash = repo root
        resolve(dirname(file), p),
      ];
      if (!candidates.some(existsSync)) add('path', file, lineNo, p, 'does not exist');
    }
  });
}

// ---- report: layers no entry doc covers -------------------------------------------------
const ENTRY_DOCS = ['README.md', 'CLAUDE.md', 'SKILL.md'];
const CONTENT_EXT = /\.(md|mjs|cjs|js|ts|tsx|css|json|yml|yaml)$/;

const hasEntryDoc = (dir) => ENTRY_DOCS.some((n) => existsSync(join(dir, n)));

/** The nearest entry doc at or above `dir`, or null at the root. */
function nearestEntryDocAbove(dir) {
  let cur = dirname(dir);
  while (cur.startsWith(REPO_ROOT)) {
    for (const n of ENTRY_DOCS) {
      const p = join(cur, n);
      if (existsSync(p)) return p;
    }
    if (cur === REPO_ROOT) break;
    cur = dirname(cur);
  }
  return null;
}

const dirsWithContent = new Set();
for (const f of files) {
  if (CONTENT_EXT.test(f)) dirsWithContent.add(dirname(f));
}

const uncovered = [...dirsWithContent]
  .filter((d) => d !== REPO_ROOT && !hasEntryDoc(d))
  .filter((d) => {
    // Covered if the nearest entry doc above names this directory by name.
    const parentDoc = nearestEntryDocAbove(d);
    if (!parentDoc) return true;
    const name = rel(d).split('/').pop();
    return !readFileSync(parentDoc, 'utf8').includes(name + '/');
  })
  .map(rel)
  .sort();

for (const d of uncovered) {
  add(
    'coverage',
    join(REPO_ROOT, d),
    0,
    `${d}/`,
    'no entry doc covers it: add a README.md, or name it in the entry doc above',
  );
}

// ---- output ----------------------------------------------------------------------------
if (problems.length) {
  console.error(`verify:docs failed — ${problems.length} problem(s):\n`);
  const order = { link: 0, command: 1, path: 2, coverage: 3 };
  for (const p of problems.sort(
    (a, b) => order[a.kind] - order[b.kind] || a.where.localeCompare(b.where),
  )) {
    const where = p.kind === 'coverage' ? p.detail : `${p.where}\n           ${p.detail}`;
    console.error(`  [${p.kind}] ${where} — ${p.hint}`);
  }
  console.error(
    '\nA pointer that goes nowhere is worse than no pointer: the reader trusted it.\n' +
      'Fix the target, remove the reference, or document the layer.',
  );
  process.exit(1);
}

console.log(
  `verify:docs OK — ${mdFiles.length} markdown files, ` +
    `${dirsWithContent.size} directories, every pointer resolves and every layer is covered.`,
);
