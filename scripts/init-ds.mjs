#!/usr/bin/env node
/**
 * `pnpm init-ds <name> [--dry]` — brand this template once.
 *
 * The operation moves the package scope, CSS custom properties, anatomy attributes, Angular
 * selectors and component-derived web identifiers together. Run it once, before authoring
 * components; it is not a migration tool for an established design system.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import {
  buildRules,
  componentTags,
  identityProblems,
  planRenames,
  removeCreatedDirectories,
  restoreSnapshot,
  snapshotPaths,
  validName,
  writeRenamePlan,
} from './init-ds-lib.mjs';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG_PATH = join(REPO_ROOT, 'ds.config.json');
const PROP_MAP_DIR = join(REPO_ROOT, '.ai/maps');
const PROP_MAP_PATHS = [join(PROP_MAP_DIR, 'prop-map.json'), join(PROP_MAP_DIR, 'prop-map.md')];
const MAX_CAPTURED_OUTPUT_LINES = 20;

/**
 * Print a message and stop. Every refusal in this script ends here, so the exit code is always
 * non-zero on a failure and CI cannot read a half-rename as success.
 *
 * @param {string} message
 * @returns {never}
 */
function fatal(message) {
  console.error(message);
  process.exit(1);
}

const USAGE =
  'Usage:\n' +
  '  pnpm init-ds <name> [--dry]\n' +
  '  pnpm init-ds --check\n\n' +
  '  <name>  lowercase letters and digits, e.g. `weave`';

/**
 * Read the command line: one name with an optional `--dry`, or `--check` on its own. Anything
 * else is refused rather than guessed at, because a misread argument renames the repository.
 *
 * @param {string[]} args - argv after the node binary and this script
 * @returns {{check: boolean, dry: boolean, name: string | undefined}}
 */
function parseArguments(args) {
  if (args.length === 1 && args[0] === '--check') {
    return { check: true, dry: true, name: undefined };
  }

  const names = args.filter((arg) => !arg.startsWith('-'));
  const flags = args.filter((arg) => arg.startsWith('-'));
  const valid = names.length === 1 && flags.length <= 1 && flags.every((flag) => flag === '--dry');

  if (!valid) fatal(`Invalid arguments.\n\n${USAGE}`);
  return { check: false, dry: flags.length === 1, name: names[0] };
}

/**
 * Render `identityProblems` output as one message.
 *
 * @param {string[]} problems
 * @returns {string}
 */
function formatIdentityProblems(problems) {
  return `Invalid design-system identity:\n${problems.map((problem) => `  ${problem}`).join('\n')}`;
}

/**
 * Print what moved: the totals, then one line per file. On a real run this is called only after
 * every write, the generator and Prettier have succeeded.
 *
 * @param {Array<{file: string, hits: number}>} changed
 * @param {string} from - the prefix being replaced
 * @param {string} name - the new prefix
 * @param {boolean} dry - whether the run wrote anything
 */
function report(changed, from, name, dry) {
  const total = changed.reduce((count, change) => count + change.hits, 0);
  console.log(
    `${dry ? '[dry run] would rename' : 'renamed'} "${from}" -> "${name}" — ` +
      `${total} occurrence(s) across ${changed.length} file(s), plus ds.config.json.\n`,
  );
  for (const change of changed) {
    console.log(`  ${String(change.hits).padStart(4)}  ${change.file}`);
  }
}

/**
 * Label one captured child-process stream, keeping its most recent lines so a noisy formatter
 * cannot hide the rollback result above it.
 *
 * @param {string} label
 * @param {unknown} value
 * @returns {string | null}
 */
function formatCapturedOutput(label, value) {
  const lines = String(value).trim().split('\n');
  if (!lines[0]) return null;

  const omitted = lines.length - MAX_CAPTURED_OUTPUT_LINES;
  const excerpt = omitted > 0 ? lines.slice(-MAX_CAPTURED_OUTPUT_LINES) : lines;
  return `${label}:\n${omitted > 0 ? `... ${omitted} earlier line(s) omitted\n` : ''}${excerpt.join('\n')}`;
}

/**
 * Keep the structural first line of an error. Node appends captured child-process output to
 * `execFileSync` error messages, which is reported separately and with a line limit.
 *
 * @param {unknown} cause
 * @returns {string}
 */
function failureMessage(cause) {
  const message = cause instanceof Error ? cause.message : String(cause);
  return message.split('\n', 1)[0];
}

/**
 * Undo a failed run and stop. It reports captured child-process diagnostics and whether the
 * repository was fully restored, because an incomplete rollback is the one outcome the operator
 * has to act on.
 *
 * @param {ReturnType<typeof snapshotPaths>} snapshot
 * @param {Array<{path: string, existed: boolean}>} directories
 * @param {{description: string, label: string}} stage - the operation that failed
 * @param {unknown} cause - the error that stopped the run
 * @returns {never}
 */
function rollback(snapshot, directories, stage, cause) {
  const failures = [...restoreSnapshot(snapshot), ...removeCreatedDirectories(directories)];
  const capturedOutput = [
    [`${stage.label} stderr`, cause?.stderr],
    [`${stage.label} stdout`, cause?.stdout],
  ]
    .filter(([, value]) => value)
    .map(([label, value]) => formatCapturedOutput(label, value))
    .filter(Boolean);
  console.error(
    `init-ds failed while ${stage.description}: ${failureMessage(cause)}\n` +
      '\n' +
      (failures.length
        ? `Rollback was incomplete:\n${failures.map((failure) => `  ${failure}`).join('\n')}`
        : 'All writes were rolled back. The repository is unchanged.') +
      (capturedOutput.length ? `\n\n${capturedOutput.join('\n')}` : ''),
  );
  process.exit(1);
}

const rawArgs = process.argv.slice(2);
const args = rawArgs[0] === '--' ? rawArgs.slice(1) : rawArgs;
const parsed = parseArguments(args);
const { check, dry } = parsed;
const current = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
const name = parsed.name ?? current.name;

if (!validName(name)) {
  fatal(
    `"${name}" is not usable as a prefix.\n\n` +
      'It becomes an npm scope, a CSS custom-property namespace and a data-attribute prefix, so it\n' +
      'must be lowercase letters and digits, starting with a letter. No dashes: a dash would make\n' +
      '--<name>-color-fill- ambiguous about where the prefix ends.',
  );
}

const currentIdentityProblems = identityProblems(current);
if (currentIdentityProblems.length) fatal(formatIdentityProblems(currentIdentityProblems));

const from = check ? 'ds' : current.name;
if (!check && from === name) {
  fatal(`This repo is already branded "${name}". init-ds runs once; it is not a migration tool.`);
}
if (!check && from !== 'ds') {
  fatal(
    `This repo has already been branded "${from}". init-ds runs once, before any components exist.\n` +
      'Re-branding an established system is a different and much larger operation — every published\n' +
      'package name and every consumer stylesheet reference would move with it.',
  );
}

const rules = buildRules(from, name, componentTags(REPO_ROOT));
const changed = planRenames(REPO_ROOT, rules);

if (check) {
  if (current.name === from) {
    fatal('Brand the repository before checking for old-prefix stragglers.');
  }
  if (changed.length) {
    fatal(
      changed.map((change) => `${change.file}: ${change.hits} old-prefix occurrence(s)`).join('\n'),
    );
  }
  console.log('No old-prefix stragglers across all rename rules, and the identity is consistent.');
  process.exit(0);
}

const nextIdentity = {
  ...current,
  name,
  scope: `@${name}`,
  tokenPrefix: name,
  dataPrefix: name,
};

if (dry) {
  report(changed, from, name, true);
  console.log('\nNothing was written. Re-run without --dry to apply.');
  process.exit(0);
}

const directoryState = [join(REPO_ROOT, '.ai'), PROP_MAP_DIR].map((path) => ({
  path,
  existed: existsSync(path),
}));
const snapshot = snapshotPaths([
  ...changed.map((change) => change.path),
  CONFIG_PATH,
  ...PROP_MAP_PATHS,
]);

let stage = { description: 'writing renamed files', label: 'File writes' };
try {
  writeRenamePlan(changed);
  writeFileSync(CONFIG_PATH, JSON.stringify(nextIdentity, null, 2) + '\n');
  stage = { description: 'generating the prop map', label: 'Prop-map generator' };
  execFileSync(process.execPath, [join(REPO_ROOT, 'scripts/build-prop-map.mjs')], {
    cwd: REPO_ROOT,
    stdio: 'pipe',
  });
  if (changed.length) {
    stage = { description: 'running Prettier', label: 'Prettier' };
    execFileSync(
      'pnpm',
      [
        'exec',
        'prettier',
        '--write',
        '--log-level',
        'warn',
        ...changed.map((change) => change.file),
      ],
      {
        cwd: REPO_ROOT,
        stdio: 'pipe',
        shell: process.platform === 'win32',
      },
    );
  }
} catch (error) {
  rollback(snapshot, directoryState, stage, error);
}

// Reported only once every write, the generator and Prettier have succeeded.
report(changed, from, name, false);
console.log('\nDone. Next:');
console.log('  pnpm install        # the workspace links move with the scope');
console.log('  pnpm verify         # should be green on an empty repo');
