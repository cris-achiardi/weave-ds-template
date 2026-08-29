#!/usr/bin/env node
/**
 * `pnpm adr-index` — regenerate the ADR index in docs/ADR/README.md.
 * `pnpm adr-index:check` — fail if it is out of date.
 *
 * The index is derived from the records themselves: the number from the filename, the title from
 * the H1, the status from the `- **Status:**` line. Nothing about a record is retyped into the
 * table, so the table cannot claim `Accepted` while the record says `Draft`.
 *
 * The README says "an ADR that is not in the index does not exist — nobody browses a directory
 * listing". That is exactly the kind of rule nothing else enforces: forget the row and every tool
 * stays green while the record becomes invisible.
 *
 * WHY THIS CHECKS ROWS RATHER THAN BYTES.
 * `prop-map:check` asserts byte-equality because it owns its whole file. This index is a region
 * inside a hand-written README that Prettier also formats, and Prettier owns table alignment — so
 * byte-equality would fail on column padding rather than on content. The check compares the parsed
 * rows instead, which catches every failure that matters: a missing record, a stale title, a status
 * that has moved on, a row for a record that was deleted.
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ADR_DIR = join(REPO_ROOT, 'docs', 'ADR');
const README = join(ADR_DIR, 'README.md');
const START = '<!-- adr-index:start -->';
const END = '<!-- adr-index:end -->';

const check = process.argv.includes('--check');

/** Every record, in number order. `0000-template.md` is the shape, not a decision. */
function readRecords() {
  return readdirSync(ADR_DIR)
    .filter((f) => /^\d{4}-.+\.md$/.test(f) && !f.startsWith('0000-'))
    .sort() // filenames are zero-padded, so a plain code-point sort is numeric order
    .map((file) => {
      const text = readFileSync(join(ADR_DIR, file), 'utf8');
      const num = file.slice(0, 4);

      const h1 = text.match(/^#\s+(.+?)\s*$/m);
      if (!h1) throw new Error(`${file}: no H1 heading — cannot derive a title.`);
      // "ADR 0001 — Title" -> "Title". Em dash or hyphen, either way.
      const title = h1[1].replace(/^ADR\s+\d{4}\s*[—-]\s*/, '').trim();

      const status = text.match(/^-\s+\*\*Status:\*\*\s*(.+?)\s*$/m);
      if (!status) throw new Error(`${file}: no "- **Status:**" line — cannot derive a status.`);

      return { num, file, title, status: status[1].trim() };
    });
}

function renderTable(records) {
  if (!records.length) {
    return [
      '| #   | Title            | Status |',
      '| --- | ---------------- | ------ |',
      '| —   | _no records yet_ | —      |',
    ].join('\n');
  }
  const rows = records.map((r) => `| [${r.num}](./${r.file}) | ${r.title} | ${r.status} |`);
  return ['| # | Title | Status |', '| --- | --- | --- |', ...rows].join('\n');
}

/** Parse the rows currently in the README region, so the check compares content not padding. */
function parseTable(region) {
  return region
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('|') && !/^\|[\s-]*\|[\s-]*\|/.test(l))
    .map((l) =>
      l
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((c) => c.trim()),
    )
    .filter((cells) => cells[0] !== '#') // header
    .map(([numCell, title, status]) => {
      const link = numCell.match(/\[(\d{4})\]\(\.\/(.+?)\)/);
      return link
        ? { num: link[1], file: link[2], title, status }
        : { num: numCell, file: null, title, status };
    });
}

const readme = readFileSync(README, 'utf8');
const startAt = readme.indexOf(START);
const endAt = readme.indexOf(END);
if (startAt === -1 || endAt === -1) {
  console.error(
    `adr-index failed — docs/ADR/README.md has no generated region.\n` +
      `Add these two markers around the index table:\n  ${START}\n  ${END}`,
  );
  process.exit(1);
}

let records;
try {
  records = readRecords();
} catch (e) {
  console.error(`adr-index failed — ${e.message}`);
  process.exit(1);
}

const table = renderTable(records);

if (check) {
  const current = parseTable(readme.slice(startAt + START.length, endAt));
  const expected = parseTable(table);
  const key = (r) => `${r.num}|${r.file ?? ''}|${r.title}|${r.status}`;
  const cur = current.map(key);
  const exp = expected.map(key);

  const missing = expected.filter((r) => !cur.includes(key(r)));
  const extra = current.filter((r) => !exp.includes(key(r)));

  if (missing.length || extra.length) {
    console.error('adr-index:check failed — the index does not match the records.\n');
    for (const r of missing)
      console.error(`  missing or stale:  ${r.num} — ${r.title} (${r.status})`);
    for (const r of extra)
      console.error(`  not a record:      ${r.num} — ${r.title} (${r.status})`);
    console.error('\nRun `pnpm adr-index` to regenerate, then commit the result.');
    process.exit(1);
  }
  console.log(`adr-index:check OK — ${records.length} record(s) indexed.`);
} else {
  const next =
    readme.slice(0, startAt + START.length) + '\n\n' + table + '\n\n' + readme.slice(endAt);
  if (next === readme) {
    console.log(`adr-index — already current (${records.length} record(s)).`);
  } else {
    writeFileSync(README, next);
    console.log(
      `adr-index — wrote ${records.length} record(s) into docs/ADR/README.md.\n` +
        `Run \`pnpm format\` to let Prettier align the table.`,
    );
  }
}
