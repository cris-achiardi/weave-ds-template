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

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join, relative } from 'node:path';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.vite',
  '.turbo',
  'storybook-static',
  'coverage',
]);

/**
 * Two files must not be rewritten:
 *   init-ds.mjs   — it contains the rename rules themselves, and rewriting them mid-run would
 *                   both corrupt the tool and make the operation non-repeatable.
 *   pnpm-lock.yaml— a lockfile is generated, and regexing it risks a subtly invalid graph.
 *                   `pnpm install` regenerates it correctly from the renamed manifests.
 */
const SKIP_FILES = new Set(['scripts/init-ds.mjs', 'pnpm-lock.yaml']);
//
// A FILE TYPE MISSING FROM THIS LIST IS THE HALF-RENAME THIS TOOL EXISTS TO PREVENT. `.vue` was
// added when the Vue backend landed: without it every generated single-file component kept
// `data-ds-component` and `@ds/vue/behavior` after a rename, the repo still built, and the only
// symptom was styling that silently stopped matching. Adding a backend means checking this list.
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
  '.vue',
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
//
// THE FOURTH RULE IS THE ANGULAR SELECTOR, and it is a fourth syntax of the same one decision.
// An Angular component attaches to an element through an attribute selector built from the prefix
// and the component name — `button[dsButton]`, written by a consumer as `<button dsButton>`. The
// emitter derives it from `ds.config.json` like everything else, so a rename that skipped it would
// leave already-generated components answering to `dsButton` while the emitter produced
// `weaveButton`: a repo that builds green, passes every gate, and breaks the next time anyone
// regenerates. That is precisely the half-rename this codemod exists to prevent.
//
// The word-boundary rule is tight enough to be safe because identifiers of the shape `ds<Capital>` are
// RESERVED for this family — two unrelated locals called `dsConfig` were renamed when this rule
// landed, rather than widening the regex to dodge them.
const RULES = [
  [new RegExp(`data-${from}-`, 'g'), `data-${name}-`],
  [new RegExp(`@${from}/`, 'g'), `@${name}/`],
  [new RegExp(`--${from}-`, 'g'), `--${name}-`],
  // `String.raw`, because in an ordinary template literal \b is the BACKSPACE
  // character rather than a word boundary. The rule then matches nothing at all, silently,
  // which is the only way a codemod can be wrong and still look finished.
  [new RegExp(String.raw`\b${from}(?=[A-Z])`, 'g'), name],
];

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name < b.name ? -1 : 1,
  )) {
    // Skip by DENYLIST, never by an allowlist of dot-directories.
    //
    // This was an allowlist once (.figma, .ai, .claude, .github) and it silently missed
    // apps/storybook/.storybook — so a renamed repo shipped Storybook config importing a package
    // scope that no longer existed, and nothing failed until someone switched Storybook on weeks
    // later. A denylist fails the safe way: a new dot-directory gets renamed by default rather
    // than skipped by default.
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

// A longer or shorter name changes string widths inside markdown tables, so Prettier's column
// alignment goes stale and `pnpm verify` fails on format:check. Reformatting here is not a
// nicety: the first command a new user runs must leave the repo green, or the first thing they
// see is a red gate they did not cause.
if (!dry && changed.length) {
  try {
    execFileSync(
      'npx',
      ['prettier', '--write', '--log-level', 'warn', ...changed.map((c) => c.file)],
      {
        cwd: REPO_ROOT,
        stdio: 'pipe',
        shell: process.platform === 'win32',
      },
    );
  } catch {
    console.warn(
      '\nNote: could not run Prettier automatically. Run `pnpm format` before `pnpm verify`.',
    );
  }
}

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
