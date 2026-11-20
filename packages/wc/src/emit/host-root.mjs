// Which components realize their ROOT part on the custom-element host, rather than on an element
// inside the shadow root. Shared by the component emitter and the shadow stylesheet emitter, which
// must agree: a host that carries the root's role and focus has to generate a box.
//
// Why it exists (issue #36, ADR 0008). A relation between two MEMBERS of one collection — a tab
// `controls` its panel, a panel is `namedBy` its tab — joins two components, each with its own
// shadow root. An IDREF cannot cross a shadow boundary, and element reflection only keeps a target
// in the element's own tree or a shadow-including ANCESTOR tree, so a semantic element inside one
// shadow root can never reference one inside a sibling's. Pointing at the sibling's host instead
// would name a generic wrapper, not the part the contract names (ADR 0005). The way out that works
// in Chromium, Firefox and WebKit today: put the root's semantics on the host itself, as host
// attributes, so both ends of the relation are hosts in the same tree and a plain IDREF links them.
// Attributes rather than ElementInternals because DOM-based tooling (Playwright's role engine,
// Testing Library) cannot see ElementInternals semantics — measured, see ADR 0008.
//
// The standards-track alternative — reference target on the shadow root, which forwards references
// to the host onto an inner element — keeps the semantics inside the shadow root and is the better
// end state. It was present only in Chromium when this was measured, so it is recorded in ADR 0008
// as the path to revisit, not used.

import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { referencedByASibling } from '@ds/emit-web';

const CONTRACTS = join(
  resolve(dirname(fileURLToPath(import.meta.url)), '../../../..'),
  'packages/contracts',
);

/** The root's relations that name a part of a sibling MEMBER (the object form). */
export function crossMemberRelations(contract) {
  const root = contract.anatomy.root;
  const out = [];
  for (const relation of ['controls', 'namedBy']) {
    if (root[relation] && typeof root[relation] === 'object')
      out.push({ relation, target: root[relation] });
  }
  for (const target of root.describedBy ?? [])
    if (typeof target === 'object') out.push({ relation: 'describedBy', target });
  return out;
}

/**
 * True when this member's root is the source or the target of a cross-member relation. A target
 * needs it as much as a source: the relation has to land on the element that carries the role.
 */
export function realizesRootOnHost(name, contract, contractsDir = CONTRACTS) {
  if (!contract.member) return false;
  return (
    crossMemberRelations(contract).length > 0 ||
    referencedByASibling(name, contract.member, contractsDir)
  );
}
