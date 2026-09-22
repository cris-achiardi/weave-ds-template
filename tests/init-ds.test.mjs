import { createHash } from 'node:crypto';
import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';
import { REPO_ROOT } from '../scripts/contract-lib.mjs';
import {
  SKIP_FILES,
  applyRules,
  buildRules,
  componentTags,
  identityProblems,
  renameTree,
} from '../scripts/init-ds-lib.mjs';

const temporaryRoots = [];
const generic = ['d', 's'].join('');
const baseIdentity = {
  name: generic,
  scope: `@${generic}`,
  tokenPrefix: generic,
  dataPrefix: generic,
};

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

/**
 * Make a throwaway directory, registered for removal after the test.
 *
 * @param {string} label - included in the directory name so a leaked one is identifiable
 * @returns {string} absolute path
 */
function temporaryRoot(label) {
  const root = mkdtempSync(join(tmpdir(), `weave-${label}-`));
  temporaryRoots.push(root);
  return root;
}

/**
 * Write a file, creating its parent directories.
 *
 * @param {string} path
 * @param {string} contents
 */
function write(path, contents) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents);
}

/**
 * A minimal repository the codemod can run against: the two script files under test, one contract
 * directory so the tag rule has something to match, and an identity to rename.
 *
 * @param {object} [identity] - the ds.config.json to start from
 * @returns {string} the fixture's root
 */
function fixture(identity = baseIdentity) {
  const root = temporaryRoot('init-ds');
  mkdirSync(join(root, 'scripts'), { recursive: true });
  mkdirSync(join(root, 'packages/contracts/components/Button'), { recursive: true });
  copyFileSync(join(REPO_ROOT, 'scripts/init-ds.mjs'), join(root, 'scripts/init-ds.mjs'));
  copyFileSync(join(REPO_ROOT, 'scripts/init-ds-lib.mjs'), join(root, 'scripts/init-ds-lib.mjs'));
  write(join(root, 'ds.config.json'), JSON.stringify(identity, null, 2) + '\n');
  return root;
}

/**
 * Stand in for `scripts/build-prop-map.mjs`, writing the two prop-map files the real generator
 * produces. Tests that assert a rollback remove or break this file instead of the real one.
 *
 * @param {string} root - a fixture root
 */
function writeGenerator(root) {
  write(
    join(root, 'scripts/build-prop-map.mjs'),
    `import { mkdirSync, writeFileSync } from 'node:fs';\n` +
      `import { dirname, join, resolve } from 'node:path';\n` +
      `import { fileURLToPath } from 'node:url';\n` +
      `const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');\n` +
      `mkdirSync(join(root, '.ai/maps'), { recursive: true });\n` +
      `writeFileSync(join(root, '.ai/maps/prop-map.json'), '{"generated":true}\\n');\n` +
      `writeFileSync(join(root, '.ai/maps/prop-map.md'), '# Generated\\n');\n`,
  );
}

/**
 * Run the fixture's own copy of the CLI, so the command under test is the one on disk.
 *
 * @param {string} root - a fixture root
 * @param {string[]} args
 * @param {{env?: NodeJS.ProcessEnv}} [options]
 * @returns {import('node:child_process').SpawnSyncReturns<string>}
 */
function run(root, args, options = {}) {
  return spawnSync(process.execPath, [join(root, 'scripts/init-ds.mjs'), ...args], {
    encoding: 'utf8',
    env: options.env ?? process.env,
  });
}

/**
 * A sorted list of every directory and file under `root`, each file with the hash of its contents.
 * Comparing two inventories is how a test asserts that a tree is byte-for-byte unchanged.
 *
 * @param {string} root
 * @returns {string[]}
 */
function inventory(root) {
  const entries = [];
  function visit(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
      a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
    )) {
      const path = join(dir, entry.name);
      const rel = relative(root, path).split('\\').join('/');
      if (entry.isDirectory()) {
        entries.push(`dir:${rel}`);
        visit(path);
      } else {
        const hash = createHash('sha256').update(readFileSync(path)).digest('hex');
        entries.push(`file:${rel}:${hash}`);
      }
    }
  }
  visit(root);
  return entries;
}

/**
 * Return one section of a markdown file: the exact heading and everything up to the next heading
 * of that level or above. Fails the test when the heading is missing.
 *
 * @param {string} path
 * @param {string} heading - the heading text, without its hashes
 * @param {number} [level] - heading depth, 2 by default
 * @returns {string}
 */
function markdownSection(path, heading, level = 2) {
  const lines = readFileSync(path, 'utf8').split('\n');
  const marker = `${'#'.repeat(level)} ${heading}`;
  const start = lines.indexOf(marker);
  expect(start, `${path}: missing exact heading ${marker}`).toBeGreaterThanOrEqual(0);
  const headingPattern = new RegExp(`^#{1,${level}} `);
  const length = lines.slice(start + 1).findIndex((line) => headingPattern.test(line));
  const end = length < 0 ? lines.length : start + 1 + length;
  return lines.slice(start, end).join('\n');
}

/**
 * Return the paragraph that starts at `marker`. Fails the test when the marker is missing.
 *
 * @param {string} path
 * @param {string} marker - text the paragraph begins with
 * @returns {string}
 */
function paragraphStarting(path, marker) {
  const text = readFileSync(path, 'utf8');
  const start = text.indexOf(marker);
  expect(start, `${path}: missing ${marker}`).toBeGreaterThanOrEqual(0);
  const next = text.indexOf('\n\n', start);
  return text.slice(start, next < 0 ? undefined : next);
}

describe('rename rules', () => {
  const rules = buildRules(generic, 'juro', ['accordion-item', 'button']);

  it.each([
    [`<${generic}-button>`, '<juro-button>'],
    [`'${generic}-button'`, "'juro-button'"],
    [`${generic}-button::part(label)`, 'juro-button::part(label)'],
    [`${generic}-button-spin`, 'juro-button-spin'],
    [`${generic}-button-group`, 'juro-button-group'],
    [`<${generic}-accordion-item>`, '<juro-accordion-item>'],
  ])('renames component-derived identifier %s', (before, after) => {
    expect(applyRules(before, rules)).toBe(after);
  });

  it.each([
    `weave-${generic}-button`,
    `my-${generic}-button`,
    `x_${generic}-button`,
    `${generic}-decide`,
  ])('preserves unrelated identifier %s', (text) => {
    expect(applyRules(text, rules)).toBe(text);
  });
});

describe('repository traversal', () => {
  it('does not enter nested repositories or worktrees', () => {
    const root = temporaryRoot('nested-repositories');
    const worktree = join(root, 'wt');
    const repository = join(root, 'repo');
    const ordinary = join(root, '.kilo');

    for (const nested of [worktree, repository]) {
      write(
        join(nested, 'scripts/init-ds.mjs'),
        `@${generic}/react --${generic}-color data-${generic}-part ${generic}Button`,
      );
      write(join(nested, 'scripts/init-ds-lib.mjs'), `@${generic}/react`);
      write(join(nested, 'pnpm-lock.yaml'), `'@${generic}/react': workspace:*\n`);
      write(join(nested, 'ds.config.json'), JSON.stringify(baseIdentity));
      write(
        join(nested, 'package.json'),
        JSON.stringify({ dependencies: { [`@${generic}/react`]: '*' } }),
      );
    }
    write(join(worktree, '.git'), 'gitdir: /not/a/real/worktree\n');
    mkdirSync(join(repository, '.git'), { recursive: true });
    write(join(ordinary, 'notes.md'), `Use @${generic}/react and ${generic}-button-spin.`);
    write(join(root, 'example.md'), `Use @${generic}/react and ${generic}-button-spin.`);
    write(join(root, 'scripts/init-ds.mjs'), `@${generic}/react`);
    write(join(root, 'scripts/init-ds-lib.mjs'), `@${generic}/react`);
    write(join(root, 'pnpm-lock.yaml'), `'@${generic}/react': workspace:*\n`);

    const nestedBefore = [inventory(worktree), inventory(repository)];
    renameTree(root, buildRules(generic, 'juro', ['button']));

    expect(inventory(worktree)).toEqual(nestedBefore[0]);
    expect(inventory(repository)).toEqual(nestedBefore[1]);
    expect(readFileSync(join(ordinary, 'notes.md'), 'utf8')).toContain('@juro/react');
    expect(readFileSync(join(root, 'example.md'), 'utf8')).toBe(
      'Use @juro/react and juro-button-spin.',
    );
    expect(readFileSync(join(root, 'scripts/init-ds.mjs'), 'utf8')).toBe(`@${generic}/react`);
    expect(readFileSync(join(root, 'scripts/init-ds-lib.mjs'), 'utf8')).toBe(`@${generic}/react`);
    expect(readFileSync(join(root, 'pnpm-lock.yaml'), 'utf8')).toContain(`@${generic}/react`);
  });

  it('only skips files that exist in the repository', () => {
    for (const path of SKIP_FILES) {
      expect(() => readFileSync(join(REPO_ROOT, path)), path).not.toThrow();
    }
  });
});

describe('identity validation', () => {
  it('accepts a consistent identity', () => {
    expect(identityProblems(baseIdentity)).toEqual([]);
  });

  it.each([
    ['name', 'Other'],
    ['scope', '@other'],
    ['tokenPrefix', 'other'],
    ['dataPrefix', 'other'],
  ])('rejects an invalid %s', (field, value) => {
    expect(identityProblems({ ...baseIdentity, [field]: value })).not.toEqual([]);
  });
});

describe('CLI', () => {
  it('checks every rename syntax while preserving skill names and its own rules', () => {
    const root = fixture({
      name: 'branded',
      scope: '@branded',
      tokenPrefix: 'branded',
      dataPrefix: 'branded',
    });
    const legacy = ['d', 's'].join('');
    const example = join(root, 'example.md');
    write(example, `${legacy}-decide`);
    expect(run(root, ['--check']).status).toBe(0);

    for (const text of [
      `@${legacy}/react`,
      `--${legacy}-color-fill`,
      `data-${legacy}-part`,
      `${legacy}Button`,
      `${legacy}-button-spin`,
    ]) {
      write(example, text);
      const result = run(root, ['--check']);
      expect(result.status, text).toBe(1);
      expect(result.stderr).toContain('example.md');
    }
  });

  it('does not write during a dry run', () => {
    const root = fixture();
    write(join(root, 'example.md'), `Use @${generic}/react and ${generic}-button-spin.`);
    const before = inventory(root);
    const result = run(root, ['juro', '--dry']);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('[dry run] would rename');
    expect(inventory(root)).toEqual(before);
  });

  it('accepts one leading package-manager argument separator', () => {
    const dryRoot = fixture();
    const before = inventory(dryRoot);
    const dryResult = run(dryRoot, ['--', 'juro', '--dry']);
    expect(dryResult.status).toBe(0);
    expect(dryResult.stdout).toContain('[dry run] would rename');
    expect(inventory(dryRoot)).toEqual(before);

    const checkRoot = fixture({
      name: 'juro',
      scope: '@juro',
      tokenPrefix: 'juro',
      dataPrefix: 'juro',
    });
    expect(run(checkRoot, ['--', '--check']).status).toBe(0);
  });

  it('rejects a repeated package-manager argument separator', () => {
    const root = fixture();
    const before = inventory(root);

    const result = run(root, ['--', '--', 'juro']);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Invalid arguments');
    expect(inventory(root)).toEqual(before);
  });

  it('rejects invalid names and rebranding', () => {
    const invalid = fixture();
    expect(run(invalid, ['not-valid']).status).toBe(1);

    const branded = fixture({
      name: 'juro',
      scope: '@juro',
      tokenPrefix: 'juro',
      dataPrefix: 'juro',
    });
    expect(run(branded, ['other']).status).toBe(1);
    expect(run(branded, ['juro']).status).toBe(1);
  });

  it.each([
    ['juro', '--drry'],
    ['--check', generic],
    ['juro', 'other'],
    ['--check', '--dry'],
    ['--check', '--check'],
  ])('rejects ambiguous or unsupported arguments: %s %s', (first, second) => {
    const root = fixture();
    const before = inventory(root);

    const result = run(root, [first, second]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Invalid arguments');
    expect(inventory(root)).toEqual(before);
  });

  it.each([
    ['name', 'other'],
    ['scope', '@other'],
    ['tokenPrefix', 'other'],
    ['dataPrefix', 'other'],
  ])('rejects a contradictory %s before writing', (field, value) => {
    const brandedIdentity = {
      name: 'juro',
      scope: '@juro',
      tokenPrefix: 'juro',
      dataPrefix: 'juro',
      [field]: value,
    };
    const cases = [
      { root: fixture({ ...baseIdentity, [field]: value }), args: ['juro'] },
      { root: fixture(brandedIdentity), args: ['--check'] },
    ];

    for (const { root, args } of cases) {
      const before = inventory(root);
      const result = run(root, args);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('Invalid design-system identity');
      expect(inventory(root)).toEqual(before);
    }
  });

  it('rolls back when the generator is missing', () => {
    const root = fixture();
    write(join(root, 'example.md'), `Use @${generic}/react and ${generic}-button-spin.`);
    write(join(root, '.ai/maps/prop-map.json'), JSON.stringify({ package: `@${generic}/react` }));
    write(join(root, '.ai/maps/prop-map.md'), `Use @${generic}/react.\n`);
    const before = inventory(root);

    const result = run(root, ['juro']);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('All writes were rolled back');
    expect(result.stdout).not.toContain('renamed "');
    expect(inventory(root)).toEqual(before);
  });

  it('rolls back generator output when Prettier cannot start', () => {
    const root = fixture();
    write(join(root, 'example.md'), `Use @${generic}/react and ${generic}-button-spin.`);
    write(join(root, '.ai/maps/prop-map.json'), JSON.stringify({ package: `@${generic}/react` }));
    write(join(root, '.ai/maps/prop-map.md'), `Use @${generic}/react.\n`);
    writeGenerator(root);
    const before = inventory(root);

    const result = run(root, ['juro'], { env: { ...process.env, PATH: '' } });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('All writes were rolled back');
    expect(result.stdout).not.toContain('renamed "');
    expect(inventory(root)).toEqual(before);
  });

  it('removes directories created by the generator during rollback', () => {
    const root = fixture();
    write(join(root, 'example.md'), `Use @${generic}/react.`);
    writeGenerator(root);
    const before = inventory(root);

    const result = run(root, ['juro'], { env: { ...process.env, PATH: '' } });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('All writes were rolled back');
    expect(result.stdout).not.toContain('renamed "');
    expect(inventory(root)).toEqual(before);
  });

  // The fake pnpm is a POSIX shell script; CI runs this suite on Linux.
  it.skipIf(process.platform === 'win32')(
    'reports the rename only after every step has succeeded',
    () => {
      const root = fixture();
      write(join(root, 'example.md'), `Use @${generic}/react.`);
      writeGenerator(root);
      const bin = join(root, 'bin');
      write(join(bin, 'pnpm'), '#!/bin/sh\nexit 0\n');
      chmodSync(join(bin, 'pnpm'), 0o755);

      const result = run(root, ['juro'], { env: { ...process.env, PATH: bin } });

      expect(result.status, result.stderr).toBe(0);
      expect(readFileSync(join(root, 'example.md'), 'utf8')).toBe('Use @juro/react.');
      const summary = result.stdout.indexOf(`renamed "${generic}" -> "juro"`);
      expect(summary).toBeGreaterThanOrEqual(0);
      expect(summary).toBeLessThan(result.stdout.indexOf('Done. Next:'));
    },
  );
});

describe('state-independent documentation', () => {
  const rules = buildRules(generic, 'renamed', componentTags(REPO_ROOT));

  it.each([
    [join(REPO_ROOT, 'CLAUDE.md'), 'Brand it before anything else', 2],
    [join(REPO_ROOT, 'README.md'), 'Quick start', 2],
    [join(REPO_ROOT, 'scripts/README.md'), '`init-ds` is different, and runs once', 2],
    [
      join(REPO_ROOT, 'docs/research/0005-a-third-backend-and-what-only-it-could-find.md'),
      'A fourth syntax for the prefix',
      3,
    ],
  ])('keeps the init instructions under %s stable', (path, heading, level) => {
    const section = markdownSection(path, heading, level);
    expect(applyRules(section, rules)).toBe(section);
    // A shell parses `<name>` as an input redirection, so a copied example would fail.
    for (const block of section.match(/```bash\n[\s\S]*?```/g) ?? []) {
      expect(block, `${path}: placeholder in a runnable shell block`).not.toMatch(
        /<[A-Za-z][\w-]*>/,
      );
    }
  });

  it('keeps the init mechanics in ADR 0002 stable', () => {
    const paragraph = paragraphStarting(
      join(REPO_ROOT, 'docs/ADR/0002-agnostic-contracts-live-in-their-own-package.md'),
      '**Name the package for the brand',
    );
    expect(applyRules(paragraph, rules)).toBe(paragraph);
  });

  it('does not duplicate the identity in the Figma manifest', () => {
    const manifest = JSON.parse(readFileSync(join(REPO_ROOT, '.figma/manifest.json'), 'utf8'));
    expect(manifest.identity.prefix).toBeUndefined();
    expect(manifest.identity.variableNaming._cssPatternNote).toContain('/ds.config.json');
    const prefixConflict = manifest.identity.variableNaming.knownProblems.find((problem) =>
      problem.includes('PREFIX CONFLICT'),
    );
    expect(prefixConflict).toBeTypeOf('string');
    expect(applyRules(prefixConflict ?? '', rules)).toBe(prefixConflict);
  });
});
