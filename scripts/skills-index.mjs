#!/usr/bin/env node
/**
 * `pnpm skills-index` — regenerate the skills index in .claude/skills/README.md.
 * `pnpm skills-index:check` — fail if it is out of date, or if a skill's frontmatter is malformed.
 *
 * The index is derived from each `.claude/skills/<dir>/SKILL.md` frontmatter: the name from
 * `name`, and the summary, status and output locations from the `metadata` map (`summary`,
 * `status`, `writes-to`). Nothing about a skill is retyped into the table, so the table cannot
 * mark a skill SUPERSEDED while the skill itself has been rewritten and is live — the exact drift
 * that left agents routing away from `ds-component` (issue #41).
 *
 * `metadata` is the Agent Skills frontmatter map for client-specific keys; skill loaders ignore
 * it, so the index fields cost the skill nothing at load time. The parser below reads only the
 * flat shape this repo uses — top-level `key: value` lines and a two-space-indented `metadata:`
 * block of `key: value` lines — and rejects anything else rather than guessing at YAML it does
 * not understand.
 *
 * Like adr-index and design-index, the check compares parsed rows rather than bytes, because the
 * table lives inside a hand-written README that Prettier also formats and Prettier owns column
 * padding.
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const SKILLS_DIR = join(REPO_ROOT, '.claude', 'skills');
export const START = '<!-- skills-index:start -->';
export const END = '<!-- skills-index:end -->';

/** The only statuses a skill may declare. `superseded` renders a do-not-use row. */
export const STATUSES = ['active', 'superseded'];
const HEADER = ['Skill', 'Status', 'What it does', 'Writes to'];

/** Strip one pair of matching surrounding quotes. No escape handling: none is needed here. */
function unquote(value) {
  const m = value.match(/^(["'])(.*)\1$/);
  return m ? m[2] : value;
}

/**
 * Parse the frontmatter block of a SKILL.md into `{ fields, metadata }`. Throws on a missing
 * block or on a line outside the supported shape.
 */
export function parseFrontmatter(text, file = 'SKILL.md') {
  const block = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!block) throw new Error(`${file}: no frontmatter block (--- ... ---).`);
  const fields = {};
  const metadata = {};
  let inMetadata = false;
  for (const line of block[1].split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const nested = line.match(/^ {2}([A-Za-z][\w-]*):\s*(.*)$/);
    if (inMetadata && nested) {
      metadata[nested[1]] = unquote(nested[2].trim());
      continue;
    }
    const top = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (!top) throw new Error(`${file}: unsupported frontmatter line: ${JSON.stringify(line)}`);
    inMetadata = top[1] === 'metadata' && top[2].trim() === '';
    if (!inMetadata) fields[top[1]] = unquote(top[2].trim());
  }
  return { fields, metadata };
}

/** Every skill directory with a SKILL.md, in code-point order, validated. */
export function readSkills(skillsDir = SKILLS_DIR) {
  const errors = [];
  const skills = readdirSync(skillsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(skillsDir, d.name, 'SKILL.md')))
    .map((d) => d.name)
    .sort() // plain code-point order — deterministic on every machine
    .map((dir) => {
      const file = `${dir}/SKILL.md`;
      let parsed;
      try {
        parsed = parseFrontmatter(readFileSync(join(skillsDir, dir, 'SKILL.md'), 'utf8'), file);
      } catch (e) {
        errors.push(e.message);
        return null;
      }
      const { fields, metadata } = parsed;
      if (!fields.name) errors.push(`${file}: no \`name\` field.`);
      else if (fields.name !== dir)
        errors.push(`${file}: \`name: ${fields.name}\` does not match its directory "${dir}".`);
      if (!fields.description) errors.push(`${file}: no \`description\` field.`);
      for (const key of ['summary', 'status', 'writes-to'])
        if (!metadata[key]) errors.push(`${file}: no \`metadata.${key}\` field.`);
      if (metadata.status && !STATUSES.includes(metadata.status))
        errors.push(
          `${file}: \`metadata.status: ${metadata.status}\` is not one of ${STATUSES.join(', ')}.`,
        );
      for (const [key, value] of Object.entries(metadata))
        if (value.includes('|'))
          errors.push(`${file}: \`metadata.${key}\` contains "|", which breaks the table.`);
      return {
        dir,
        name: fields.name ?? '',
        status: metadata.status ?? '',
        summary: metadata.summary ?? '',
        writesTo: metadata['writes-to'] ?? '',
      };
    });
  if (errors.length) throw new Error(errors.join('\n  '));
  return skills;
}

export function renderTable(skills) {
  const head = [`| ${HEADER.join(' | ')} |`, `| ${HEADER.map(() => '---').join(' | ')} |`];
  if (!skills.length) return [...head, '| _no skills yet_ | — | — | — |'].join('\n');
  const rows = skills.map(
    (s) => `| [\`${s.name}\`](./${s.dir}/) | ${s.status} | ${s.summary} | ${s.writesTo} |`,
  );
  return [...head, ...rows].join('\n');
}

/** Parse the rows currently in the README region, so the check compares content, not padding. */
export function parseTable(region) {
  return region
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('|') && !/^\|[\s|:-]*\|$/.test(l))
    .map((l) =>
      l
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((c) => c.trim()),
    )
    .filter((cells) => cells[0] !== HEADER[0])
    .map(([skillCell, status, summary, writesTo]) => {
      const link = skillCell.match(/^\[`(.+)`\]\(\.\/(.+?)\/\)$/);
      return {
        name: link ? link[1] : skillCell,
        dir: link ? link[2] : '',
        status: status ?? '',
        summary: summary ?? '',
        writesTo: writesTo ?? '',
      };
    });
}

const key = (r) => [r.dir, r.name, r.status, r.summary, r.writesTo].join('|');

/**
 * Compare a README against the skills. Returns `{ missing, extra }`: rows the skills imply that
 * the README lacks (or has stale), and rows the README has that no skill backs.
 */
export function diffIndex(readme, skills) {
  const startAt = readme.indexOf(START);
  const endAt = readme.indexOf(END);
  if (startAt === -1 || endAt === -1) throw new Error('no generated region');
  const current = parseTable(readme.slice(startAt + START.length, endAt));
  const expected = parseTable(renderTable(skills));
  const cur = current.map(key);
  const exp = expected.map(key);
  return {
    missing: expected.filter((r) => !cur.includes(key(r))),
    extra: current.filter((r) => !exp.includes(key(r))),
  };
}

/** Replace the generated region's contents with a fresh table. */
export function writeRegion(readme, skills) {
  const startAt = readme.indexOf(START);
  const endAt = readme.indexOf(END);
  if (startAt === -1 || endAt === -1) throw new Error('no generated region');
  return (
    readme.slice(0, startAt + START.length) +
    '\n\n' +
    renderTable(skills) +
    '\n\n' +
    readme.slice(endAt)
  );
}

function main() {
  const check = process.argv.includes('--check');
  const readmePath = join(SKILLS_DIR, 'README.md');
  const readme = readFileSync(readmePath, 'utf8');
  if (!readme.includes(START) || !readme.includes(END)) {
    console.error(
      `skills-index failed — .claude/skills/README.md has no generated region.\n` +
        `Add these two markers around the index table:\n  ${START}\n  ${END}`,
    );
    process.exit(1);
  }

  let skills;
  try {
    skills = readSkills();
  } catch (e) {
    console.error(`skills-index failed — a SKILL.md frontmatter is malformed:\n  ${e.message}`);
    process.exit(1);
  }

  if (check) {
    const { missing, extra } = diffIndex(readme, skills);
    if (missing.length || extra.length) {
      console.error('skills-index:check failed — the index does not match the skills.\n');
      for (const r of missing) console.error(`  missing or stale:  ${r.name} (${r.status})`);
      for (const r of extra) console.error(`  not a skill:       ${r.name} (${r.status})`);
      console.error('\nRun `pnpm skills-index` to regenerate, then commit the result.');
      process.exit(1);
    }
    console.log(`skills-index:check OK — ${skills.length} skill(s) indexed.`);
    return;
  }

  const next = writeRegion(readme, skills);
  if (next === readme) {
    console.log(`skills-index — already current (${skills.length} skill(s)).`);
  } else {
    writeFileSync(readmePath, next);
    console.log(
      `skills-index — wrote ${skills.length} skill(s) into .claude/skills/README.md.\n` +
        `Run \`pnpm format\` to let Prettier align the table.`,
    );
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
