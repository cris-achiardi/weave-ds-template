// The public prop surface a contract implies, derived with no source at all.
//
// Extracted from emit.mjs so the contract TOOLING can reuse it. `pnpm contract <Name>` used to
// answer "what IS this component" by merging the contract, the binding and the implementation read
// from hand-written source — and there is no hand-written source any more. This is what replaces
// that third half: not what the code happens to do, but what the contract SAYS the surface is.
//
// Framework-specific on purpose, and it stays in packages/react: `defaultOpen`, `onOpenChange` and
// the controlled/uncontrolled trio are React's spelling of a `shared` state. ADR 0004 is the
// decision, and each framework's own rules live beside its emitter.
//
// Pure: no fs, no profile, no module state. Depends only on the two string helpers below.

// Exported because emit.mjs needs the same two, and one home beats two copies that can drift.
export const camel = (s) => s.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
export const pascal = (s) => {
  const c = camel(s);
  return c.charAt(0).toUpperCase() + c.slice(1);
};

// ---------------------------------------------------------------------------------------
// states -> the public prop surface, per ADR 0004's controlRules
// slots  -> content props
// ---------------------------------------------------------------------------------------
export function surfaceFrom(contract) {
  const props = [];

  for (const [state, def] of Object.entries(contract.states ?? {})) {
    const n = camel(state);
    // A state with `values` is an enumeration, not a boolean. Everything downstream — the prop
    // type, the default, the comparison in a `visibleWhen` — follows from this one fact.
    // Three shapes: enumerated, free (string/number), or — saying nothing — boolean.
    let t = 'boolean';
    let dflt = false;
    if (def.values) {
      t = def.values.map((v) => `'${v}'`).join(' | ');
      dflt = def.default;
    } else if (def.valueType === 'string') {
      t = 'string';
      dflt = '';
    } else if (def.valueType === 'number') {
      t = 'number';
      dflt = def.min ?? 0;
    }
    if (def.control === 'shared') {
      props.push(
        { name: n, type: t, from: state, origin: 'state', role: 'controlled' },
        {
          name: `default${pascal(state)}`,
          type: t,
          from: state,
          origin: 'state',
          role: 'uncontrolled',
          default: dflt,
        },
        {
          name: `on${pascal(state)}Change`,
          type: `(${n}: ${t}) => void`,
          from: state,
          origin: 'state',
          role: 'callback',
        },
      );
    } else if (def.control === 'consumer') {
      props.push({ name: n, type: t, from: state, origin: 'state', role: 'input', default: dflt });
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

  // A collection's selection compiles exactly like a `shared` state, except its value is a set
  // of member identities rather than a boolean. Same three props, different type.
  const sel = contract.collection?.selection;
  if (sel && sel.control === 'shared') {
    const many = sel.cardinality === 'many';
    const t = many ? 'string[]' : 'string';
    props.push(
      // `from: 'selection'` is a SENTINEL, not a state name — see `origin`. A reader that looked
      // the string up in `contract.states` would find nothing today and the wrong thing the day a
      // contract declares a state actually called `selection`.
      { name: 'value', type: t, from: 'selection', origin: 'selection', role: 'controlled' },
      {
        name: 'defaultValue',
        type: t,
        from: 'selection',
        origin: 'selection',
        role: 'uncontrolled',
      },
      {
        name: 'onValueChange',
        type: `(value: ${t}) => void`,
        from: 'selection',
        origin: 'selection',
        role: 'callback',
      },
    );
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

  // A named slot becomes a content prop. ADR 0004 covers states only; this is the obvious
  // analogue and is NOT recorded anywhere, which is itself worth reporting.
  for (const [slot, def] of Object.entries(contract.composition?.slots ?? {})) {
    props.push({
      name: camel(slot),
      type: 'ReactNode',
      from: slot,
      origin: 'slot',
      role: 'slot',
      part: def.part,
      required: def.required === true,
      description: def.description,
    });
  }

  return props;
}
