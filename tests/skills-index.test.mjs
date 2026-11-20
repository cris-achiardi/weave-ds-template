import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  SKILLS_DIR,
  START,
  END,
  readSkills,
  parseFrontmatter,
  renderTable,
  diffIndex,
  writeRegion,
} from '../scripts/skills-index.mjs';

function skill(dir, { name = dir, status = 'active', summary = 'Does a thing.', writesTo } = {}) {
  const lines = ['---', `name: ${name}`, 'description: A skill.', 'metadata:'];
  if (status !== null) lines.push(`  status: ${status}`);
  if (summary !== null) lines.push(`  summary: "${summary}"`);
  if (writesTo !== null) lines.push(`  writes-to: '${writesTo ?? '`out/`'}'`);
  return [...lines, '---', '', `# ${dir}`, ''].join('\n');
}

function fixture(skills) {
  const root = mkdtempSync(join(tmpdir(), 'skills-index-'));
  for (const [dir, opts] of Object.entries(skills)) {
    mkdirSync(join(root, dir));
    writeFileSync(join(root, dir, 'SKILL.md'), skill(dir, opts));
  }
  return root;
}

describe('skills-index', () => {
  it('the committed index matches every SKILL.md (issue #41: ds-component was marked superseded)', () => {
    const readme = readFileSync(join(SKILLS_DIR, 'README.md'), 'utf8');
    const skills = readSkills();
    expect(skills.find((s) => s.name === 'ds-component')?.status).toBe('active');
    expect(diffIndex(readme, skills)).toEqual({ missing: [], extra: [] });
  });

  it('flags a hand-edited status that the skill does not declare', () => {
    const root = fixture({ alpha: {}, beta: {} });
    try {
      const skills = readSkills(root);
      const good = writeRegion(`# x\n\n${START}\n${END}\n`, skills);
      expect(diffIndex(good, skills)).toEqual({ missing: [], extra: [] });
      const lie = good.replace(
        '| [`beta`](./beta/) | active |',
        '| [`beta`](./beta/) | superseded |',
      );
      expect(lie).not.toBe(good);
      const { missing, extra } = diffIndex(lie, skills);
      expect(missing.map((r) => `${r.name}:${r.status}`)).toEqual(['beta:active']);
      expect(extra.map((r) => `${r.name}:${r.status}`)).toEqual(['beta:superseded']);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('flags a skill missing from the index and a row with no skill behind it', () => {
    const root = fixture({ alpha: {}, beta: {} });
    try {
      const both = readSkills(root);
      const onlyAlpha = writeRegion(`${START}\n${END}`, both.slice(0, 1));
      expect(diffIndex(onlyAlpha, both).missing.map((r) => r.name)).toEqual(['beta']);
      expect(diffIndex(writeRegion(`${START}\n${END}`, both), both.slice(0, 1)).extra).toHaveLength(
        1,
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('rejects malformed frontmatter instead of guessing', () => {
    const cases = [
      [{ status: null }, /metadata\.status/],
      [{ summary: null }, /metadata\.summary/],
      [{ writesTo: null }, /metadata\.writes-to/],
      [{ status: 'retired' }, /not one of active, superseded/],
      [{ name: 'other' }, /does not match its directory/],
      [{ summary: 'a | b' }, /breaks the table/],
    ];
    for (const [opts, message] of cases) {
      const root = fixture({ alpha: opts });
      try {
        expect(() => readSkills(root)).toThrow(message);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    }
    expect(() => parseFrontmatter('# no frontmatter\n')).toThrow(/no frontmatter block/);
    expect(() => parseFrontmatter('---\nname: x\n- list\n---\n')).toThrow(/unsupported/);
  });

  it('renders an explicit empty row when there are no skills', () => {
    expect(renderTable([])).toContain('_no skills yet_');
  });

  it('orders skills by code point, not locale or filesystem order', () => {
    const root = fixture({ zeta: {}, alpha: {}, Mu: {} });
    try {
      expect(readSkills(root).map((s) => s.dir)).toEqual(['Mu', 'alpha', 'zeta']);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
