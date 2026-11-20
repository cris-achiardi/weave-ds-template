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
 *   retired    a backticked path struck through as removed (~~`path`~~) that DOES exist
 *   coverage   a directory holding content that no entry doc covers
 *
 * WHAT COUNTS AS A PATH. A backticked token of path characters that contains a `/` and is
 * path-SHAPED: it ends in `/` (a directory), its last segment has an extension (any extension),
 * or its first segment is a top-level entry of the repo. That last clause is what lets an
 * extensionless directory like `scripts/extract` be checked without also checking prose such as
 * `a/b` or a package subpath like `react-dom/client`. The check originally matched only a fixed
 * list of file extensions, so every backticked directory went unchecked — and a directory deleted
 * in the contracts migration stayed cited, gate green (issue #40). Matching widened as a report
 * first; the baseline it produced was fixed in the docs, and only then did it gate.
 *
 * A path resolves against the repo root or the citing doc's directory. A single-segment directory
 * name (`emit/`, `Switch/`) is a name, not a location, so it also resolves when it is the citing
 * doc's own directory or a directory anywhere beneath it.
 *
 * Not paths: placeholders, build output, scoped package specifiers (`@scope/pkg/sub`), and a
 * token that is the text of a markdown link — the link's target is what the link check verifies.
 *
 * A doc that names a path in order to say it is GONE strikes it through: ~~`src/components/`~~.
 * The reader sees that it was removed, and the gate inverts — it fails if the path exists, because
 * then the sentence calling it removed has become false.
 *
 * `coverage` was a report until the baseline was clean. It named four directories — `scripts/`,
 * `packages/react/scripts/`, its `extract/`, and `.github/workflows/` — all holding machinery
 * nothing indexed. Those got entry docs, the report went empty, and only then was it promoted.
 * That order matters: a gate that fails on everything on day one gets switched off, and a
 * switched-off gate protects nothing.
 *
 * "Covered" is deliberately generous, because the rule is that a reader can FIND the layer, not
 * that every folder carries a file. A directory is covered when it holds its own entry doc
 * (README.md, AGENTS.md, CLAUDE.md or SKILL.md), or when the nearest entry doc above it names it. That is why
 * a skill's `references/` does not appear here: its SKILL.md routes to it explicitly.
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative, basename, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SEP = String.fromCharCode(92); // backslash, without writing one into a regex
const SKIP_DIRS = new Set([
  'node_modules',
  'browser-generated',
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
const TOP_LEVEL = new Set(readdirSync(REPO_ROOT));

// Every directory that holds a walked file, and every ancestor of one — so a single-segment name
// can be looked up beneath the doc that cites it without touching the filesystem again.
const allDirs = new Set();
for (const f of files) {
  for (let d = dirname(f); d.startsWith(REPO_ROOT) && d !== REPO_ROOT; d = dirname(d)) {
    if (allDirs.has(d)) break;
    allDirs.add(d);
  }
}

// Every pnpm script defined anywhere in the workspace.
const scripts = new Set();
for (const pj of files.filter((f) => f.endsWith('package.json'))) {
  try {
    for (const s of Object.keys(JSON.parse(readFileSync(pj, 'utf8')).scripts ?? {})) scripts.add(s);
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
const GENERATED_DIRS = ['build', 'dist', 'node_modules', 'storybook-static', 'browser-generated'];
const isGenerated = (s) => s.split('/').some((seg) => GENERATED_DIRS.includes(seg));

/** A token is checked as a path only when it is path-SHAPED — see the header. */
function isPathShaped(p) {
  if (!p.includes('/') || p.startsWith('@') || p.startsWith('http') || p.includes('//'))
    return false;
  const segs = trimSlashes(p).split('/');
  return (
    p.endsWith('/') ||
    /\.[A-Za-z0-9]+$/.test(segs[segs.length - 1]) ||
    TOP_LEVEL.has(segs[0]) ||
    p.startsWith('../')
  );
}

/** `./a/b/` -> `a/b`; `/a` -> `a`. */
function trimSlashes(p) {
  let s = p.startsWith('./') ? p.slice(2) : p;
  if (s.startsWith('/')) s = s.slice(1);
  return s.endsWith('/') ? s.slice(0, -1) : s;
}

/** Does `p`, cited from `file`, name something that exists? */
function resolvesFrom(file, p) {
  const here = dirname(file);
  const fromRoot = p.startsWith('/') ? p.slice(1) : p; // leading slash = repo root
  if (existsSync(resolve(REPO_ROOT, fromRoot)) || existsSync(resolve(here, p))) return true;
  const name = trimSlashes(p);
  if (!p.endsWith('/') || name.includes('/')) return false;
  // A bare directory name: the citing doc's own directory, or one anywhere beneath it.
  if (basename(here) === name) return true;
  for (const d of allDirs) if (d.startsWith(here + sep) && basename(d) === name) return true;
  return false;
}

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
    // Link text is dropped first: in [`docs/research/0004`](./docs/research/0004-....md) the
    // pointer is the link, and the link check above has already verified it.
    const prose = line.replace(/\[[^\]]*\]\([^)\s]+\)/g, '');
    for (const m of prose.matchAll(/(~~)?`([a-zA-Z0-9_.@/-]+)`(~~)?/g)) {
      const p = m[2];
      if (!isPathShaped(p) || isPlaceholder(p) || isGenerated(p)) continue;
      const exists = resolvesFrom(file, p);
      if (m[1] && m[3]) {
        if (exists) add('retired', file, lineNo, p, 'struck through as removed, but it exists');
      } else if (!exists) {
        add('path', file, lineNo, p, 'does not exist');
      }
    }
  });
}

// ---- report: layers no entry doc covers -------------------------------------------------
const ENTRY_DOCS = ['README.md', 'AGENTS.md', 'CLAUDE.md', 'SKILL.md'];
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
  const order = { link: 0, command: 1, path: 2, retired: 3, coverage: 4 };
  for (const p of problems.sort(
    (a, b) => order[a.kind] - order[b.kind] || (a.where < b.where ? -1 : a.where > b.where ? 1 : 0),
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
