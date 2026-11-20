import { suppliedRelations } from '../packages/emit-web/contract.mjs';
import { realizesRootOnHost } from '../packages/wc/src/emit/host-root.mjs';

/**
 * Known structural gaps only. An empty list is not an accessibility certification.
 *
 * Relations a slot-filled part declares (Field `control`, Tooltip `trigger`) are written on the
 * element the consumer supplies, in every backend — the same rule the emitters read
 * (`suppliedRelations` in @ds/emit-web), so the classifier cannot drift from what is generated.
 * The light-DOM backends then have no structural gap left for them. WC has one: an element slotted
 * into such a part that is itself a shadow host (this system's own `Switch`, or any custom element
 * a slot without an `accepts` list admits) receives the IDREFs on its host, and its focusable
 * element is inside its own shadow root. That is reported as `supplied-shadow-host`.
 */
export function relationshipConformance(contract, backend) {
  const gaps = [];
  // WC delivers a cross-member relation from a member's ROOT to a sibling's ROOT by realizing both
  // roots on their hosts and linking the hosts by IDREF (ADR 0008). Anything else that
  // crosses a shadow boundary is still omitted.
  const wcLinksRoot = backend === 'wc' && realizesRootOnHost(contract.component, contract);
  const slots = contract.composition?.slots ?? {};
  const supplied = suppliedRelations(contract);
  function visit(node, path, key) {
    const rel = supplied.get(key);
    for (const relation of ['controls', 'namedBy', 'describedBy']) {
      const values =
        node[relation] === undefined
          ? []
          : Array.isArray(node[relation])
            ? node[relation]
            : [node[relation]];
      for (const target of values) {
        if (rel && relation !== 'controls' && typeof target === 'string') {
          const accepts = slots[rel.slot]?.accepts;
          // A component name (capitalised) is one of this system's controls; no list admits any.
          const admitsHost = !accepts || accepts.some((kind) => /^[A-Z]/.test(kind));
          if (backend === 'wc' && admitsHost)
            gaps.push({
              path: `${path}.${relation}`,
              target,
              reason: 'supplied-shadow-host',
              detail:
                'The relationship is written on the slotted element. When that element is itself a shadow host, its focusable element is inside its own shadow root and does not receive it.',
            });
        } else if (
          backend === 'wc' &&
          typeof target === 'object' &&
          !(wcLinksRoot && path === 'root' && target.part === 'root')
        )
          gaps.push({
            path: `${path}.${relation}`,
            target,
            reason: 'omitted-cross-shadow-reference',
            detail:
              'The target semantic part is inside a sibling shadow root; the emitter omits this relationship.',
          });
      }
    }
    // namedByConsumer on a shadow-internal part: WC forwards aria-label, and resolves aria-labelledby's
    // ids in the host's tree into element references (ADR 0007), so there is no gap to report.
    for (const [k, child] of Object.entries(node.parts ?? {})) visit(child, `${path}.${k}`, k);
  }
  visit(contract.anatomy.root, 'root', 'root');
  return {
    status: gaps.length ? 'non-conforming' : 'not-evaluated',
    scope: 'anatomy relationships',
    gaps,
  };
}

// Form lifecycle coverage, per backend. A pair moves here only together with the browser
// evidence for it (tests/browser/forms.mjs for WC; framework-forms.mjs and framework-controls.mjs
// for React, Vue and Angular). ADR 0005: a known gap keeps the pair non-conforming, and it is
// named rather than silently skipped.
const FRAMEWORK_SCOPE = 'named answer, required/custom validation and reset lifecycle';
const RESTORE_GAP =
  'form state restoration (history/bfcache/autofill) has no framework lifecycle callback';
const FRAMEWORK_GAPS = {
  // Native <input>: the platform submits, the generated code syncs reset and validity.
  TextField: {
    gaps: ['state-restoration', 'commit-draft-submission'],
    detail: `${RESTORE_GAP}, so the native element may restore a value the framework model then overwrites; and in commit editing mode the native input submits its visible draft, not the last committed answer.`,
  },
  // Custom controls: a hidden, validatable proxy <input> inside the root contributes the answer.
  Checkbox: {
    gaps: ['state-restoration', 'invalid-html-content-model'],
    detail: `${RESTORE_GAP}; the proxy opts out with autocomplete="off". The proxy <input> sits inside the <button> root, which the HTML content model forbids: the generated markup is not valid HTML.`,
  },
  Switch: {
    gaps: ['state-restoration', 'invalid-html-content-model'],
    detail: `${RESTORE_GAP}; the proxy opts out with autocomplete="off". The proxy <input> sits inside the <button> root, which the HTML content model forbids: the generated markup is not valid HTML.`,
  },
  Slider: {
    gaps: ['state-restoration'],
    detail: `${RESTORE_GAP}; the proxy opts out with autocomplete="off".`,
  },
  RadioGroup: {
    gaps: ['state-restoration'],
    detail: `${RESTORE_GAP}; the proxy opts out with autocomplete="off".`,
  },
};

export function formConformance(contract, backend) {
  if (!contract.form) return { status: 'not-applicable' };
  if (backend === 'wc')
    return {
      status: 'implemented',
      scope: 'named answer, required/custom validation, reset and restore lifecycle',
    };
  const known = FRAMEWORK_GAPS[contract.component];
  if (known)
    return {
      status: 'non-conforming',
      implemented: FRAMEWORK_SCOPE,
      gaps: known.gaps,
      detail: `Submission, required/authored-invalid validity and reset are implemented. Not implemented: ${known.detail}`,
    };
  return {
    status: 'non-conforming',
    detail: 'This backend does not emit a form contribution for this component.',
  };
}
