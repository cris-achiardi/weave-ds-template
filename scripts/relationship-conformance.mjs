/** Known structural gaps only. An empty list is not an accessibility certification. */
export function relationshipConformance(contract, backend) {
  const gaps = [];
  const slots = contract.composition?.slots ?? {};
  function visit(node, path) {
    for (const relation of ['controls', 'namedBy', 'describedBy']) {
      const values =
        node[relation] === undefined
          ? []
          : Array.isArray(node[relation])
            ? node[relation]
            : [node[relation]];
      for (const target of values) {
        const slot = Object.entries(slots).find(
          ([key, value]) => (value.part ?? key) === path.split('.').at(-1),
        );
        const passedControl = slot?.[1].accepts?.some((kind) =>
          ['input', 'select', 'textarea', 'Switch'].includes(kind),
        );
        if (passedControl)
          gaps.push({
            path: `${path}.${relation}`,
            target,
            reason: 'wrapper-not-control',
            detail:
              'The relationship is emitted on the containing region, not the supplied control.',
          });
        else if (backend === 'wc' && typeof target === 'object')
          gaps.push({
            path: `${path}.${relation}`,
            target,
            reason: 'omitted-cross-shadow-reference',
            detail:
              'The target semantic part is inside a sibling shadow root; the emitter omits this relationship.',
          });
      }
    }
    for (const [key, child] of Object.entries(node.parts ?? {})) visit(child, `${path}.${key}`);
  }
  visit(contract.anatomy.root, 'root');
  return {
    status: gaps.length ? 'non-conforming' : 'not-evaluated',
    scope: 'anatomy relationships',
    gaps,
  };
}
