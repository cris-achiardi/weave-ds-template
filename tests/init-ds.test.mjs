import { it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { REPO_ROOT } from '../scripts/contract-lib.mjs';

it('checks every rename syntax while preserving skill names and its own rules', () => {
  const root = mkdtempSync(join(tmpdir(), 'weave-rename-check-'));
  try {
    mkdirSync(join(root, 'scripts'));
    mkdirSync(join(root, 'packages/contracts/components/Button'), { recursive: true });
    copyFileSync(join(REPO_ROOT, 'scripts/init-ds.mjs'), join(root, 'scripts/init-ds.mjs'));
    writeFileSync(join(root, 'ds.config.json'), JSON.stringify({ name: 'branded' }));
    const legacy = ['d', 's'].join('');
    const run = () =>
      spawnSync(process.execPath, [join(root, 'scripts/init-ds.mjs'), '--check'], {
        encoding: 'utf8',
      });
    writeFileSync(join(root, 'example.md'), `${legacy}-decide`);
    expect(run().status).toBe(0);
    for (const text of [
      `@${legacy}/react`,
      `--${legacy}-color-fill`,
      `data-${legacy}-part`,
      `${legacy}Button`,
      `${legacy}-button`,
    ]) {
      writeFileSync(join(root, 'example.md'), text);
      const result = run();
      expect(result.status, text).toBe(1);
      expect(result.stderr).toContain('example.md');
    }
  } finally {
    // mkdtemp creates this dedicated test directory under the OS temp root.
    rmSync(root, { recursive: true, force: true });
  }
});
