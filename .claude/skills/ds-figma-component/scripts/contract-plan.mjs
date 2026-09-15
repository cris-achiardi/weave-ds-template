#!/usr/bin/env node
/** Deterministic contract input for a Figma set; no framework source or Figma access required. */
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';
function* walkAnatomy(node, path = 'root') {
  if (!node) return;
  yield [path, node];
  for (const key of Object.keys(node.parts ?? {}).sort())
    yield* walkAnatomy(node.parts[key], `${path}.${key}`);
}
export function planFrom(contract) {
  const axes = contract.axes ?? {};
  const variants = Object.entries(axes).reduce(
    (rows, [axis, def]) =>
      rows.flatMap((row) => def.values.map((value) => ({ ...row, [axis]: value }))),
    [{}],
  );
  const parts = [...walkAnatomy(contract.anatomy?.root)].map(([path, node]) => ({
    path,
    ...node,
    parts: undefined,
  }));
  return {
    component: contract.component,
    axes,
    defaults: Object.fromEntries(Object.entries(axes).map(([name, def]) => [name, def.default])),
    variants,
    parts,
    slots: contract.composition?.slots ?? {},
    states: contract.states ?? {},
    paintMode: 'unbound',
    unbound: parts.flatMap((part) =>
      Object.entries(part.paints ?? {})
        .filter(([, policy]) => policy === null)
        .map(([channel]) => ({ part: part.path, channel })),
    ),
    policies: parts.flatMap((part) =>
      Object.entries(part.paints ?? {})
        .filter(([, policy]) => policy !== null)
        .map(([channel, policy]) => ({ part: part.path, channel, policy, binding: null })),
    ),
  };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const name = process.argv[2];
  if (!name || !/^[A-Z][A-Za-z0-9]*$/.test(name)) throw new Error('Expected a contract name');
  console.log(
    JSON.stringify(
      planFrom(
        JSON.parse(
          readFileSync(
            new URL(
              `../../../../packages/contracts/components/${name}/${name}.contract.json`,
              import.meta.url,
            ),
            'utf8',
          ),
        ),
      ),
      null,
      2,
    ),
  );
}
