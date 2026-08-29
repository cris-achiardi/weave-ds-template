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
 *
 * REPORTS, NEVER FAILS
 *   a directory holding content that no entry doc covers
 *
 * That split is deliberate. The report is non-empty today and some of what it lists legitimately
 * never needs a doc, so gating it would fail on day one — and a gate that fails on everything on
 * day one gets switched off, which protects nothing.
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
      if (/^(https?:|mailto:|#)/.test(raw) || isPlaceholder(raw)) continue;
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
      if (p.startsWith('http') || isPlaceholder(p)) continue;
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

// ---- output ----------------------------------------------------------------------------
if (uncovered.length) {
  console.log(`verify:docs — ${uncovered.length} director(ies) no entry doc covers:\n`);
  for (const d of uncovered) console.log(`  ${d}/`);
  console.log(
    '\n  Reported, not failed. Some of these never need a doc; others are a real gap.\n' +
      '  Either add an entry doc, or name the directory in the one above it.\n',
  );
}

if (problems.length) {
  console.error(`verify:docs failed — ${problems.length} broken pointer(s):\n`);
  const order = { link: 0, command: 1, path: 2 };
  for (const p of problems.sort(
    (a, b) => order[a.kind] - order[b.kind] || a.where.localeCompare(b.where),
  )) {
    console.error(`  [${p.kind}] ${p.where}\n           ${p.detail} — ${p.hint}`);
  }
  console.error(
    '\nA pointer that goes nowhere is worse than no pointer: the reader trusted it.\n' +
      'Fix the target, or remove the reference.',
  );
  process.exit(1);
}

console.log(`verify:docs OK — ${mdFiles.length} markdown files, every pointer resolves.`);
