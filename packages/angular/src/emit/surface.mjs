// The public surface a contract implies IN ANGULAR, derived with no source at all.
//
// Three of these files now exist — React's, Vue's and this one — and reading them side by side is
// the cheapest summary of what the contract layer actually bought. They agree on the SHAPE of the
// answer and disagree in exactly three places, each a framework fact the contract does not state:
//
//   1. A `shared` state is ONE `model()` here, one `defineModel` in Vue, and THREE props in React.
//      Two independent backends collapsed it the same way; React's trio is a workaround for a
//      language with no two-way binding, not a fact about the state. ADR 0004's "a state declares
//      who may set it" is what left room for all three.
//   2. A named slot is CONTENT PROJECTION here, a template slot in Vue, a `ReactNode` prop in
//      React. Angular's is the odd one of those: projection selects on the DOM, so the consumer has
//      to supply a real element carrying `slot="name"`, where a Vue `<template #name>` supplies
//      none.
//   3. There is no root element in the surface at all, because an Angular component does not render
//      one — it attaches to one, chosen by its selector. See `selectorFor` below.
//
// Pure: no fs, no profile, no module state.

export const camel = (s) => s.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
export const pascal = (s) => {
  const c = camel(s);
  return c.charAt(0).toUpperCase() + c.slice(1);
};

/**
 * The component's selector, and the single biggest structural difference between this backend and
 * the other two.
 *
 * An Angular component ATTACHES to an element rather than rendering one, so the binding's `element`
 * becomes an attribute selector and the consumer writes the element themselves:
 *
 *   element: "button", component: "Switch"  ->  button[dsSwitch]  ->  <button dsSwitch>
 *
 * The prefix comes from `/ds.config.json` like every other prefix in the repo, so `pnpm init-ds`
 * renames the selector along with everything else.
 */
export function selectorFor(element, component, prefix) {
  return `${element}[${prefix}${component}]`;
}

/** A state's TypeScript type and its default, from the contract and nothing else. */
export function typeOf(def) {
  if (def.values)
    return { type: def.values.map((v) => `'${v}'`).join(' | '), default: def.default };
  if (def.valueType === 'string') return { type: 'string', default: '' };
  if (def.valueType === 'number') return { type: 'number', default: def.min ?? 0 };
  return { type: 'boolean', default: false };
}

/**
 * What a consumer of the generated Angular component may bind.
 *
 * Roles:
 *   model     a `model()` — one input plus a matching `<X>Change` output, from a `shared` state
 *   input     a plain `input()`, from a `consumer` state
 *   axis      an `input()` with a default, from `axes`
 *   identity  an `input.required()`, from `member.identity`
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
        event: `${n}Change`,
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

  const sel = contract.collection?.selection;
  if (sel && sel.control === 'shared') {
    const many = sel.cardinality === 'many';
    props.push({
      // `from: 'selection'` is a SENTINEL, not a state name — see `origin`.
      name: 'value',
      type: many ? 'string[]' : 'string',
      from: 'selection',
      origin: 'selection',
      role: 'model',
      default: many ? [] : '',
      event: 'valueChange',
      description: 'The current selection, by member identity.',
    });
  }

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
 * The content-projection slots a contract implies. Separate from the inputs, as in Vue and unlike
 * React, because these are not props.
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
