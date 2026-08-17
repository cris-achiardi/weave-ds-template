#!/usr/bin/env node
/**
 * `pnpm init-ds <name> [--dry]` — brand this template once.
 *
 * Renames, in one pass:
 *   @ds/…          -> @<name>/…        package scope
 *   --ds-…         -> --<name>-…       CSS custom properties
 *   data-ds-…      -> data-<name>-…    component anatomy attributes
 *   ds.config.json                     the identity itself
 *
 * WHY A CODEMOD RATHER THAN FIND-AND-REPLACE
 * The three prefixes above are the same decision expressed in three syntaxes, and they must move
 * together. Renaming the scope but not the token prefix leaves a repo that builds, tests green,
 * and is wrong — the CSS variables no longer match the package that documents them, and nothing
 * anywhere reports it. That is exactly the class of breach this repo gates elsewhere; here it is
 * cheaper to make the operation atomic than to check it afterwards.
 *
 * Run it ONCE, before writing any components. It is not a migration tool.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join, relative } from 'node:path';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.vite', 'storybook-static']);

/**
 * Two files must not be rewritten:
 *   init-ds.mjs   — it contains the rename rules themselves, and rewriting them mid-run would
 *                   both corrupt the tool and make the operation non-repeatable.
 *   pnpm-lock.yaml— a lockfile is generated, and regexing it risks a subtly invalid graph.
 *                   `pnpm install` regenerates it correctly from the renamed manifests.
 */
const SKIP_FILES = new Set(['scripts/init-ds.mjs', 'pnpm-lock.yaml']);
const EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
  '.css',
  '.md',
  '.html',
  '.yaml',
  '.yml',
]);

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const name = args.find((a) => !a.startsWith('-'));

function fatal(msg) {
  console.error(msg);
  process.exit(1);
}

if (!name) {
  fatal(
    'Usage: pnpm init-ds <name> [--dry]\n\n  <name>  lowercase letters and digits, e.g. `weave`',
  );
}
if (!/^[a-z][a-z0-9]*$/.test(name)) {
  fatal(
    `"${name}" is not usable as a prefix.\n\n` +
      'It becomes an npm scope, a CSS custom-property namespace and a data-attribute prefix, so it\n' +
      'must be lowercase letters and digits, starting with a letter. No dashes: a dash would make\n' +
      '--<name>-color-fill- ambiguous about where the prefix ends.',
  );
}

const current = JSON.parse(readFileSync(join(REPO_ROOT, 'ds.config.json'), 'utf8'));
const from = current.name;

if (from === name) {
  fatal(`This repo is already branded "${name}". init-ds runs once; it is not a migration tool.`);
}
if (from !== 'ds') {
  fatal(
    `This repo has already been branded "${from}". init-ds runs once, before any components exist.\n` +
      'Re-branding an established system is a different and much larger operation — every published\n' +
      'package name and every consumer stylesheet reference would move with it.',
  );
}

// Order matters: `data-ds-` must be rewritten before the bare `--ds-`/`@ds/` rules, or a partial
// match leaves a half-renamed attribute.
const RULES = [
  [new RegExp(`data-${from}-`, 'g'), `data-${name}-`],
  [new RegExp(`@${from}/`, 'g'), `@${name}/`],
  [new RegExp(`--${from}-`, 'g'), `--${name}-`],
];

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name < b.name ? -1 : 1,
  )) {
    if (
      entry.name.startsWith('.') &&
      entry.name !== '.figma' &&
      entry.name !== '.ai' &&
      entry.name !== '.claude' &&
      entry.name !== '.github'
    ) {
      continue;
    }
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (EXTENSIONS.has(entry.name.slice(entry.name.lastIndexOf('.')))) yield full;
  }
}

const changed = [];

for (const file of walk(REPO_ROOT)) {
  const rel = relative(REPO_ROOT, file).split('\\').join('/');
  if (SKIP_FILES.has(rel)) continue;

  const before = readFileSync(file, 'utf8');
  let after = before;
  for (const [re, to] of RULES) after = after.replace(re, to);
  if (after !== before) {
    const hits = RULES.reduce((n, [re]) => n + (before.match(re)?.length ?? 0), 0);
    changed.push({ file: rel, hits });
    if (!dry) writeFileSync(file, after);
  }
}

// ds.config.json is rewritten from the parsed object rather than by regex, so the identity fields
// move even though they hold bare `ds` with none of the three syntaxes around it.
const cfgPath = join(REPO_ROOT, 'ds.config.json');
const cfg = JSON.parse(readFileSync(cfgPath, 'utf8'));
cfg.name = name;
cfg.scope = `@${name}`;
cfg.tokenPrefix = name;
cfg.dataPrefix = name;
if (!dry) writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + '\n');

// ---------------------------------------------------------------------------------------

const total = changed.reduce((n, c) => n + c.hits, 0);
console.log(
  `${dry ? '[dry run] would rename' : 'renamed'} "${from}" -> "${name}" — ` +
    `${total} occurrence(s) across ${changed.length} file(s), plus ds.config.json.\n`,
);
for (const c of changed) console.log(`  ${String(c.hits).padStart(4)}  ${c.file}`);

if (dry) {
  console.log('\nNothing was written. Re-run without --dry to apply.');
} else {
  console.log('\nDone. Next:');
  console.log('  pnpm install        # the workspace links move with the scope');
  console.log('  pnpm verify         # should be green on an empty repo');
}
