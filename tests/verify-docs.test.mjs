import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, copyFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

// verify-docs derives the repo root from its own location, so a copy of it inside a fixture
// checks that fixture and nothing else.
const SCRIPT = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'scripts', 'verify-docs.mjs');

let root;

function write(path, text) {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), text);
}

/** Run the gate over the fixture with `docs/README.md` set to `body`. */
function verify(body) {
  write('docs/README.md', `# \`docs/\`\n\n${body}\n`);
  const r = spawnSync(process.execPath, [join(root, 'scripts', 'verify-docs.mjs')], {
    encoding: 'utf8',
  });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'verify-docs-'));
  mkdirSync(join(root, 'scripts'));
  copyFileSync(SCRIPT, join(root, 'scripts', 'verify-docs.mjs'));
  write('package.json', '{ "scripts": {} }\n');
  write('README.md', '# Fixture\n\nMachinery lives in `scripts/`; prose in `docs/`.\n');
  write('docs/kept/README.md', '# `kept/`\n');
  write('docs/page.md', '# A page\n');
});

afterAll(() => rmSync(root, { recursive: true, force: true }));

describe('verify:docs backticked paths', () => {
  it('passes a clean fixture', () => {
    const r = verify('See `docs/kept/` and `docs/page.md`.');
    expect(r.out).toContain('verify:docs OK');
    expect(r.code).toBe(0);
  });

  it('fails a planted dead directory (issue #40)', () => {
    const r = verify('Readers live in `scripts/extract/`.');
    expect(r.code).toBe(1);
    expect(r.out).toContain('[path] docs/README.md:3');
    expect(r.out).toContain('scripts/extract/ — does not exist');
  });

  it('fails an extensionless dead path whose first segment is a top-level directory', () => {
    const r = verify('Readers live in `scripts/extract`.');
    expect(r.code).toBe(1);
    expect(r.out).toContain('scripts/extract — does not exist');
  });

  it('fails a dead file whose extension was not on the old list', () => {
    const r = verify('Open `docs/preview.html` and run `scripts/setup.sh`.');
    expect(r.code).toBe(1);
    expect(r.out).toContain('docs/preview.html — does not exist');
    expect(r.out).toContain('scripts/setup.sh — does not exist');
  });

  it('fails a single-segment directory name that is nowhere beneath the doc', () => {
    expect(verify('Schemas sit in `contracts/`.').code).toBe(1);
    expect(verify('Its own directory is `docs/`, and it holds `kept/`.').code).toBe(0);
  });

  it('does not check a removed path mentioned without backticks', () => {
    expect(verify('scripts/extract/ held three readers; it was deleted.').code).toBe(0);
  });

  it('keeps the exemptions: placeholders, build output, package specifiers, link text, prose', () => {
    const r = verify(
      [
        'A record goes in `docs/<NNNN-title>.md`; tokens build to `packages/tokens/build/x.css`.',
        'Import `@scope/react/behavior`, `react-dom/client` or the `./behavior` subpath; a/b is `a/b`.',
        'Linked: [`docs/page`](./page.md).',
        '```',
        'scripts/never-made/',
        '`scripts/never-made/`',
        '```',
      ].join('\n'),
    );
    expect(r.out).toContain('verify:docs OK');
    expect(r.code).toBe(0);
  });
});
