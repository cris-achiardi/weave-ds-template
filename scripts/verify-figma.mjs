#!/usr/bin/env node
/**
 * `pnpm verify:figma` — validate the Figma integration files against their schemas.
 *
 * These files are hand-and-agent-maintained JSON that no build step reads, so a malformed entry
 * produces no error anywhere else in the repo. That is precisely the class of contract that has
 * to be gated in CI rather than trusted: its breach is invisible.
 *
 * Checks:
 *   1  maps/*.json validate against schema/*.schema.json
 *   2  every map's `source` names a real key in manifest.json -> sources
 *   3  every collection's `codeSource` points at a file that exists
 *   4  a variable whose collection is unmapped must have `code: null` (drift, not a lie)
 *
 * An empty map passes all four. That is the point — the template ships empty, and an unchecked
 * empty state is not the same as a checked one.
 */

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import Ajv from 'ajv';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FIGMA = join(REPO_ROOT, '.figma');

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
const problems = [];

function main() {
  if (!existsSync(FIGMA)) {
    console.log('verify:figma — no .figma/ directory. Nothing to check.');
    return;
  }

  const manifest = readJson(join(FIGMA, 'manifest.json'));
  const sources = Object.keys(manifest.sources ?? {});
  const ajv = new Ajv({ allErrors: true, strict: false });

  for (const [map, schema] of [
    ['maps/tokens.json', 'schema/tokens.schema.json'],
    ['maps/components.json', 'schema/components.schema.json'],
  ]) {
    const mapPath = join(FIGMA, map);
    const schemaPath = join(FIGMA, schema);
    if (!existsSync(mapPath) || !existsSync(schemaPath)) {
      problems.push(`${map}: missing map or schema.`);
      continue;
    }

    const data = readJson(mapPath);
    const validate = ajv.compile(readJson(schemaPath));

    if (!validate(data)) {
      for (const e of validate.errors ?? []) {
        problems.push(`${map}: ${e.instancePath || '/'} ${e.message}`);
      }
      continue;
    }

    if (!sources.includes(data.source)) {
      problems.push(
        `${map}: source "${data.source}" is not a key in manifest.json -> sources (${sources.join(', ') || 'none'}).`,
      );
    }

    for (const [name, col] of Object.entries(data.collections ?? {})) {
      if (col.codeSource && !existsSync(join(REPO_ROOT, col.codeSource))) {
        problems.push(
          `${map}: collection "${name}" -> codeSource "${col.codeSource}" does not exist.`,
        );
      }
    }

    for (const [name, v] of Object.entries(data.variables ?? {})) {
      const mapped = data.collections?.[v.collection]?.codeSource;
      if (!mapped && v.code !== null) {
        problems.push(
          `${map}: variable "${name}" claims code "${v.code}" but its collection "${v.collection}" has no codeSource. An unmapped collection must report drift (code: null), not a path.`,
        );
      }
    }
  }

  if (problems.length) {
    console.error(`verify:figma failed — ${problems.length} problem(s):\n`);
    for (const p of problems.sort()) console.error(`  ${p}`);
    process.exit(1);
  }

  console.log('verify:figma OK.');
}

main();
