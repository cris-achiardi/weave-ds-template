// The public surface a contract implies IN VUE, derived with no source at all.
//
// The React twin of this file is packages/react/src/emit/surface.mjs, and comparing the two is the
// point rather than a chore. They read the same contract and disagree in three places, each of
// which is a framework fact the contract deliberately does not state:
//
//   1. A `shared` state is ONE declaration here and THREE props there. `defineModel` declares the
//      prop and the `update:` event together; React's controlled/uncontrolled trio is a workaround
//      for a language with no two-way binding. ADR 0004 says a state declares WHO MAY SET IT, and
//      this is what that buys: the same sentence compiles to one prop or three without either
//      backend editing the contract.
//   2. A named slot is a SLOT here and a prop there. React types it `ReactNode`; Vue declares it
//      with `defineSlots` and fills it with `<template #name>`. Both satisfy the contract.
//   3. There is no `className` and no ref target. Vue supplies both, so nothing derives them.
//
// Pure: no fs, no profile, no module state.

// Exported because emit.mjs needs the same two, and one home beats two copies that can drift.
export const camel = (s) => s.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
export const pascal = (s) => {
  const c = camel(s);
  return c.charAt(0).toUpperCase() + c.slice(1);
};

// A state's TypeScript type and its uncontrolled default, from the contract and nothing else.
// Identical to React's reading of the same three fields — the divergence is in what is DONE with
// the answer, not in the answer. Kept as its own function so that stays visible.
export function typeOf(def) {
  if (def.values)
    return { type: def.values.map((v) => `'${v}'`).join(' | '), default: def.default };
  if (def.valueType === 'string') return { type: 'string', default: '' };
  if (def.valueType === 'number') return { type: 'number', default: def.min ?? 0 };
  return { type: 'boolean', default: false };
}

/**
 * What a consumer of the generated Vue component may pass.
 *
 * Roles, and they are NOT React's list:
 *   model     a `defineModel` — one prop plus one `update:` event, from a `shared` state
 *   input     a plain prop, from a `consumer` state
 *   axis      a plain prop with a default, from `axes`
 *   identity  a required prop, from `member.identity`
 *   slot      a template slot, from `composition.slots`
 */
export function surfaceFrom(contract) {
  const props = [];

  for (const [state, def] of Object.entries(contract.states ?? {})) {
    const n = camel(state);
    const { type, default: dflt } = typeOf(def);
    if (def.control === 'shared') {
      props.push({
        name: n,
        type,
        from: state,
        origin: 'state',
        role: 'model',
        default: dflt,
        event: `update:${n}`,
        description: def.description,
      });
    } else if (def.control === 'consumer') {
      props.push({
        name: n,
        type,
        from: state,
        origin: 'state',
        role: 'input',
        default: dflt,
        description: def.description,
      });
    }
    // `internal` emits nothing. That is the whole point of the value.
  }

  // An axis is a closed set of values the consumer chooses from. It is not a state — nothing is
  // IN it — so ADR 0004's controlRules do not cover it, and this mapping is recorded nowhere.
  for (const [axis, def] of Object.entries(contract.axes ?? {})) {
    props.push({
      name: axis,
      type: def.values.map((v) => `'${v}'`).join(' | '),
      from: axis,
      origin: 'axis',
      role: 'axis',
      default: def.default,
      description: def.description,
    });
  }

  // A collection's selection compiles exactly like a `shared` state, except its value is a set of
  // member identities rather than a boolean. One model, not three props.
  const sel = contract.collection?.selection;
  if (sel && sel.control === 'shared') {
    const many = sel.cardinality === 'many';
    const type = many ? 'string[]' : 'string';
    props.push({
      // `from: 'selection'` is a SENTINEL, not a state name — see `origin`. A reader that looked
      // the string up in `contract.states` would find nothing today and the wrong thing the day a
      // contract declares a state actually called `selection`.
      name: 'value',
      type,
      from: 'selection',
      origin: 'selection',
      role: 'model',
      default: many ? [] : '',
      event: 'update:value',
      description: 'The current selection, by member identity.',
    });
  }

  // A member's identity is a required prop. It is not a state — nothing is IN it — so ADR 0004's
  // controlRules do not cover it, and this mapping is recorded nowhere.
  if (contract.member) {
    props.push({
      name: contract.member.identity,
      type: 'string',
      from: 'member',
      origin: 'member',
      role: 'identity',
      required: true,
      description: `Distinguishes this ${contract.component} from its siblings. The ancestor ${contract.member.of} compares against it to decide whether this one is in the selection.`,
    });
  }

  return props;
}

/**
 * The template slots a contract implies. SEPARATE from the props, which is the divergence itself:
 * in React these come back in the same list because they compile to props there.
 */
export function slotsFrom(contract) {
  const slots = [];
  const takesChildren = (contract.composition?.children?.max ?? 1) !== 0;
  if (takesChildren) {
    slots.push({
      name: 'default',
      part: contract.composition?.children?.part ?? null,
      required: false,
      description: contract.composition?.children?.description ?? 'The component content.',
    });
  }
  for (const [slot, def] of Object.entries(contract.composition?.slots ?? {})) {
    slots.push({
      name: camel(slot),
      from: slot,
      part: def.part ?? null,
      required: def.required === true,
      description: def.description,
    });
  }
  return slots;
}
