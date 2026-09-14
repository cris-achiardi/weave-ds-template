// The public surface a contract implies AS A CUSTOM ELEMENT, derived with no source at all.
//
// The fourth of these files, and the first that is not about a framework's idiom — there is no
// framework. It is about what the PLATFORM offers a component author, which turns out to be three
// separate mechanisms where every framework offers one binding:
//
//     an ATTRIBUTE   which is how markup says it, and what CSS can select
//     a PROPERTY     which is how script says it, and the only place a non-string value can live
//     an EVENT       which is how the component says it changed
//
// A `shared` state needs all three and they have to be kept in step by hand. That is the closest
// thing here to React's three props — and it is worth being precise about why it is not the same
// thing. React's trio is three PROPS standing in for a missing language feature. This is three
// MECHANISMS the platform actually has, each doing a different job. The contract says `control:
// shared` to both and neither had to argue with it.
//
// Pure: no fs, no profile, no module state.

export const camel = (s) => s.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
export const pascal = (s) => {
  const c = camel(s);
  return c.charAt(0).toUpperCase() + c.slice(1);
};
export const kebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

/**
 * The custom element's tag.
 *
 * `TabItem` -> `ds-tab-item`. Derived rather than stored in the binding, because a tag that could
 * disagree with the component name would be a second name for one thing. The hyphen is not a style
 * choice: a custom element name is REQUIRED to contain one, which is the platform reserving every
 * single-word tag for itself.
 */
export const tagFor = (component, prefix) => `${prefix}-${kebab(component)}`;

/** A state's type and default, from the contract and nothing else. */
export function typeOf(def) {
  if (def.values)
    return { type: def.values.map((v) => `'${v}'`).join(' | '), default: def.default };
  if (def.valueType === 'string') return { type: 'string', default: '' };
  if (def.valueType === 'number') return { type: 'number', default: def.min ?? 0 };
  return { type: 'boolean', default: false };
}

/**
 * What a consumer may set on the element.
 *
 * Roles:
 *   model     a `shared` state — attribute + property + `<prefix>-<name>-change` event
 *   input     a `consumer` state — attribute + property
 *   axis      an enumerated attribute + property, with a default
 *   identity  a required attribute, from `member.identity`
 */
export function surfaceFrom(contract) {
  const props = [];

  for (const [state, def] of Object.entries(contract.states ?? {})) {
    const n = camel(state);
    const { type, default: dflt } = typeOf(def);
    const shape = {
      name: n,
      attribute: kebab(state),
      type,
      from: state,
      origin: 'state',
      default: dflt,
      description: def.description,
      // How the value crosses the attribute boundary. An attribute is always a string, so
      // everything else needs a conversion in both directions and the emitter has to write both.
      kind: def.values
        ? 'enum'
        : def.valueType === 'number'
          ? 'number'
          : def.valueType === 'string'
            ? 'string'
            : 'boolean',
    };
    if (def.control === 'shared') {
      props.push({ ...shape, role: 'model', event: `${kebab(state)}-change` });
    } else if (def.control === 'consumer') {
      props.push({ ...shape, role: 'input' });
    }
    // `internal` emits nothing. That is the whole point of the value.
  }

  for (const [axis, def] of Object.entries(contract.axes ?? {})) {
    props.push({
      name: axis,
      attribute: kebab(axis),
      type: def.values.map((v) => `'${v}'`).join(' | '),
      from: axis,
      origin: 'axis',
      role: 'axis',
      kind: 'enum',
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
      attribute: 'value',
      type: many ? 'string[]' : 'string',
      from: 'selection',
      origin: 'selection',
      role: 'model',
      // A LIST OF MEMBER IDENTITIES IN AN ATTRIBUTE. React, Vue and Angular all pass an array
      // through a binding and never have to write it down as text; an attribute is a string, so
      // this backend has to choose a separator and live with it. Space-separated, like every other
      // token list the platform already has — `class`, `rel`, `aria-describedby` — which at least
      // makes the choice a citation rather than an invention.
      kind: many ? 'tokens' : 'string',
      default: many ? [] : '',
      event: 'value-change',
      description: 'The current selection, by member identity.',
    });
  }

  if (contract.member) {
    props.push({
      name: contract.member.identity,
      attribute: kebab(contract.member.identity),
      type: 'string',
      from: 'member',
      origin: 'member',
      role: 'identity',
      kind: 'string',
      required: true,
      description: `Distinguishes this ${contract.component} from its siblings. The ancestor ${contract.member.of} compares against it to decide whether this one is in the selection.`,
    });
  }

  return props;
}

/** The slots a contract implies. `<slot name="x">` in the shadow root; `slot="x"` on the child. */
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
      name: kebab(slot),
      from: slot,
      part: def.part ?? null,
      required: def.required === true,
      description: def.description,
    });
  }
  return slots;
}
