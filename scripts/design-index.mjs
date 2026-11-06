#!/usr/bin/env node
/**
 * `pnpm design-index` — regenerate the design-record index in docs/design/README.md.
 * `pnpm design-index:check` — fail if it is out of date, or if a record is malformed.
 *
 * The index is derived from the records themselves: the title from the H1, the concern from the
 * `- **Owns:**` line, the principle and open-question counts from the `DRn` / `OQn` IDs a record
 * defines, the status from the `- **Status:**` line. Nothing is retyped into the table, so the
 * table cannot claim `Current` while the record says `Draft`, or five principles while it has six.
 *
 * A record that is missing a required section fails both modes. The sections are what make a
 * record usable — a principle with no Checks cannot be reviewed against, and one with no
 * "In this system" row cannot be traced to the contract that carries it — and nothing else
 * notices when one is dropped.
 *
 * Like adr-index, the check compares parsed rows rather than bytes, because the table lives inside
 * a hand-written README that Prettier also formats and Prettier owns column padding.
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DESIGN_DIR = join(REPO_ROOT, 'docs', 'design');
const README = join(DESIGN_DIR, 'README.md');
const START = '<!-- design-index:start -->';
const END = '<!-- design-index:end -->';

const REQUIRED_SECTIONS = [
  'Intent',
  'Principles',
  'Checks',
  'In this system',
  "Don't",
  'Open questions',
  'Boundary',
];

const check = process.argv.includes('--check');

/** Distinct IDs a record DEFINES — `**DR3 —` — not every mention, so a citation is not a count. */
function countDefined(text, prefix) {
  const ids = new Set();
  for (const m of text.matchAll(new RegExp(`\\*\\*(${prefix}\\d+)\\s+[—-]`, 'g'))) ids.add(m[1]);
  return ids.size;
}

/** Every record, in file-name order. `README.md` and `_template.md` are not records. */
function readRecords() {
  const errors = [];
  const records = readdirSync(DESIGN_DIR)
    .filter((f) => f.endsWith('.md') && f !== 'README.md' && !f.startsWith('_'))
    .sort() // plain code-point order — deterministic on every machine
    .map((file) => {
      const text = readFileSync(join(DESIGN_DIR, file), 'utf8');
      const field = (name) =>
        text.match(new RegExp(`^-\\s+\\*\\*${name}:\\*\\*\\s*(.+?)\\s*$`, 'm'));

      const h1 = text.match(/^#\s+(.+?)\s*$/m);
      const status = field('Status');
      const owns = field('Owns');
      if (!h1) errors.push(`${file}: no H1 heading — cannot derive a title.`);
      if (!status) errors.push(`${file}: no "- **Status:**" line.`);
      if (!owns) errors.push(`${file}: no "- **Owns:**" line.`);
      if (!field('Contracts')) errors.push(`${file}: no "- **Contracts:**" line.`);

      const headings = new Set([...text.matchAll(/^##\s+(.+?)\s*$/gm)].map((m) => m[1]));
      for (const s of REQUIRED_SECTIONS)
        if (!headings.has(s)) errors.push(`${file}: missing the "## ${s}" section.`);

      const principles = countDefined(text, 'DR');
      if (!principles) errors.push(`${file}: defines no principles (no "**DR1 —").`);

      return {
        file,
        title: h1?.[1].trim() ?? '',
        owns: owns?.[1].trim() ?? '',
        principles: String(principles),
        questions: String(countDefined(text, 'OQ')),
        status: status?.[1].trim() ?? '',
      };
    });
  if (errors.length) throw new Error(errors.join('\n  '));
  return records;
}

function renderTable(records) {
  if (!records.length) {
    return [
      '| Record | Owns | Principles | Open questions | Status |',
      '| --- | --- | --- | --- | --- |',
      '| _no records yet_ | — | — | — | — |',
    ].join('\n');
  }
  const rows = records.map(
    (r) =>
      `| [${r.title}](./${r.file}) | ${r.owns} | ${r.principles} | ${r.questions} | ${r.status} |`,
  );
  return [
    '| Record | Owns | Principles | Open questions | Status |',
    '| --- | --- | --- | --- | --- |',
    ...rows,
  ].join('\n');
}

/** Parse the rows currently in the README region, so the check compares content, not padding. */
function parseTable(region) {
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
    .filter((cells) => cells[0] !== 'Record') // header
    .map(([recordCell, owns, principles, questions, status]) => {
      const link = recordCell.match(/^\[(.+)\]\(\.\/(.+?)\)$/);
      return {
        title: link ? link[1] : recordCell,
        file: link ? link[2] : '',
        owns,
        principles,
        questions,
        status,
      };
    });
}

const readme = readFileSync(README, 'utf8');
const startAt = readme.indexOf(START);
const endAt = readme.indexOf(END);
if (startAt === -1 || endAt === -1) {
  console.error(
    `design-index failed — docs/design/README.md has no generated region.\n` +
      `Add these two markers around the index table:\n  ${START}\n  ${END}`,
  );
  process.exit(1);
}

let records;
try {
  records = readRecords();
} catch (e) {
  console.error(`design-index failed — a record is malformed:\n  ${e.message}`);
  process.exit(1);
}

const table = renderTable(records);

if (check) {
  const key = (r) => [r.file, r.title, r.owns, r.principles, r.questions, r.status].join('|');
  const current = parseTable(readme.slice(startAt + START.length, endAt));
  const expected = parseTable(table);
  const cur = current.map(key);
  const exp = expected.map(key);

  const missing = expected.filter((r) => !cur.includes(key(r)));
  const extra = current.filter((r) => !exp.includes(key(r)));

  if (missing.length || extra.length) {
    console.error('design-index:check failed — the index does not match the records.\n');
    for (const r of missing)
      console.error(`  missing or stale:  ${r.file} — ${r.title} (${r.status})`);
    for (const r of extra)
      console.error(`  not a record:      ${r.file} — ${r.title} (${r.status})`);
    console.error('\nRun `pnpm design-index` to regenerate, then commit the result.');
    process.exit(1);
  }
  console.log(`design-index:check OK — ${records.length} record(s) indexed.`);
} else {
  const next =
    readme.slice(0, startAt + START.length) + '\n\n' + table + '\n\n' + readme.slice(endAt);
  if (next === readme) {
    console.log(`design-index — already current (${records.length} record(s)).`);
  } else {
    writeFileSync(README, next);
    console.log(
      `design-index — wrote ${records.length} record(s) into docs/design/README.md.\n` +
        `Run \`pnpm format\` to let Prettier align the table.`,
    );
  }
}
