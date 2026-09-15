// The two stylesheets, in the shadow flavour.
//
// `@ds/emit-web/css` writes the light-DOM pair and its README says plainly where it stops:
//
//     Whether that becomes a parameter on these functions or a second module beside them is NOT
//     decided here, because nothing has built it yet.
//
// THIS IS THAT DECISION, AND THE ANSWER WAS A SEPARATE MODULE — in a different package, not even
// beside it. Parameterising would have meant one function branching on a flag at every selector it
// writes, and the two grammars do not line up selector for selector. Three of the four attribute
// families vanish here, which is a different SHAPE of output rather than a different spelling:
//
//   light DOM                                          shadow DOM
//   ---------------------------------------------      --------------------------------
//   [data-ds-component='Button']                        :host
//   [data-ds-component='Button'] [data-ds-part='x']     [part='x']
//   [data-ds-component='Button'][data-ds-hierarchy=..]  :host([hierarchy='...'])
//   [data-ds-component='Button'][data-ds-state-open]    :host([open])
//
// WHAT THAT MEANS, and it is the sharpest finding this backend produced: the component-scoping
// attribute, the part attribute and the axis attribute family were all inventions the other three
// emitters needed and documented nowhere. A shadow root makes every one of them unnecessary. The
// shadow root IS the scope, `part` is a real platform attribute, and the host's own attributes are
// already namespaced by its tag.
//
// The cost is exactly as large: these stylesheets go INSIDE the shadow root, so the one property
// three backends shared — that a single theme file dresses them all — does not hold here. A
// consumer's reach from outside is `::part()` and custom properties, and nothing else.

import { kebab, partsOf } from '@ds/emit-web';
import { pseudoClassFor } from '@ds/platform-web';

/**
 * The selector for one state, inside the shadow root.
 *
 * EVERY STATE LIVES ON THE HOST, which is the rule that keeps this grammar honest. A browser-owned
 * state uses the host's pseudo-class (`:host(:hover)`); an authored one uses a host attribute the
 * component reflects (`:host([checked])`).
 *
 * The alternative — selecting the inner element, `[part='root']:disabled` — was rejected because it
 * splits the answer: half the states would be selected on the host and half on a part, and a
 * consumer reaching in from outside with `::part()` cannot append an attribute selector at all. One
 * place, always.
 */
export function stateSelectorShadow(base, spec, profile) {
  const [state, value] = spec.includes('=') ? spec.split('=') : [spec, null];
  const pseudo = pseudoClassFor(state, profile);
  const on =
    value !== null
      ? `:host([${kebab(state)}='${value}'])`
      : pseudo
        ? `:host(${pseudo})`
        : `:host([${kebab(state)}])`;
  // `base` is always a part selector now: the host paints nothing, because it generates no
  // box. See emitStructureShadow on why that is `display: contents`.
  return `${on} ${base}`;
}

/**
 * `<Name>.structure.css` — REGENERATED on every run, and almost empty on purpose.
 *
 * It emits one rule the light-DOM pair does not have to: `:host { display: contents }`. A custom
 * element is `display: inline` until someone says otherwise, and the other three backends never
 * meet the problem because a `<div>` is already block and a `<button>` already inline-block.
 *
 * `contents` is not a guess about layout, which is what lets the emitter write it at all. It removes
 * the host from the box tree, so `[part='root']` lays out exactly where the light-DOM backends' root
 * element does — and the theme paints `[part='root']`, never `:host`.
 */
// Navigation collections retain a block host for reliable Firefox sequential focus.
export function emitStructureShadow(name, contract, prefix, assume) {
  const root = contract.anatomy.root;
  const navigationScope = Boolean(contract.collection?.navigation);
  const kids = Object.values(root.parts ?? {});
  const hides = JSON.stringify(contract.anatomy).includes('"visibleWhen"');

  assume(
    'structural CSS',
    'NONE EMITTED — the emitter refuses to guess',
    'The same refusal the other three backends make, for the same reason: the contract has no `layout` block. Four independent emitters now report it.',
  );
  assume(
    'what the host box is',
    navigationScope
      ? '`display: block` preserves a navigable collection scope in Firefox'
      : '`display: contents` — the host generates no box, and the theme paints `[part=root]`',
    navigationScope
      ? 'A real host box prevents Firefox from cycling Tab inside nested display:contents shadow hosts. The semantic root still owns paint; the collection host adds a structural block container.'
      : "THIS WAS THE SECOND ANSWER AND THE FIRST ONE WAS WRONG. A custom element is `display: inline` until a stylesheet says otherwise, so the first version left `:host { /* display: ; */ }` as an obligation for the consumer — a genuinely new one, since a <div> root is already block and a <button> root already inline-block. But handing it over was solving the wrong problem. The contract's `anatomy.root` describes the component's outermost VISUAL box, and in a shadow build that is the element the binding names, not the host wrapping it; painting `:host` put the background on a wrapper and left the real control unstyled. `display: contents` is the one answer here that is not a guess about layout, and with root paints on `[part=root]` the translated stylesheet produces computed styles IDENTICAL to the light-DOM backends'.",
  );
  assume(
    'no scoping attribute, no part attribute, no axis attribute',
    'the shadow root scopes, `part` is a platform attribute, and the host owns its own attributes',
    'Three attribute families that the React, Vue and Angular emitters each had to invent and reproduce exactly — `data-<prefix>-component`, `data-<prefix>-part`, `data-<prefix>-<axis>` — are all unnecessary here. That is not this backend being clever: it is evidence that all three were standing in for scoping the platform can do itself, and nothing in the contract system ever defined them.',
  );

  const L = [];
  L.push(`/* GENERATED from ${name}.contract.json. Do not edit by hand — regenerate instead. */`);
  L.push(`/*`);
  L.push(` * STRUCTURE ONLY, INSIDE THE SHADOW ROOT — and there is almost none, on purpose.`);
  L.push(` *`);
  L.push(
    ` * The contract has no \`layout\` block and nothing in it describes where a part sits, so`,
  );
  L.push(` * there is nothing to derive from. The emitter will not guess: an inferred layout that`);
  L.push(` * renders is harder to catch than one that does not.`);
  L.push(` *`);
  if (navigationScope) {
    L.push(` * A navigation collection keeps a host box. Nested display:contents shadow hosts`);
    L.push(` * can trap Tab on the first member in Firefox. Paint still belongs to [part=root].`);
  } else {
    L.push(
      ` * THE HOST GENERATES NO BOX. A custom element is \`display: inline\` until a stylesheet`,
    );
    L.push(
      ` * says otherwise, and \`contents\` is the one answer that is not a guess about layout:`,
    );
    L.push(
      ` * it removes the host from the box tree entirely, so \`[part='root']\` lays out exactly`,
    );
    L.push(
      ` * where the light-DOM backends' root element does. Your theme paints \`[part='root']\`,`,
    );
    L.push(` * not \`:host\`.`);
  }
  L.push(` */`);
  L.push(``);
  L.push(`:host {`);
  L.push(`  display: ${navigationScope ? 'block' : 'contents'};`);
  L.push(`}`);
  L.push(``);
  L.push(`/* A hidden host stays hidden, and outranks the rule above. */`);
  L.push(`:host([hidden]) {`);
  L.push(`  display: none !important;`);
  L.push(`}`);
  L.push(``);

  if (hides) {
    L.push(`/*`);
    L.push(
      ` * Hiding is a contract claim, not a style — see @ds/emit-web. The rule below is inside`,
    );
    L.push(` * the shadow root, so unlike the light-DOM backends nothing a consumer writes can`);
    L.push(` * outrank it by accident: they would have to target \`::part()\` deliberately.`);
    L.push(` */`);
    L.push(`[part][hidden] {`);
    L.push(`  display: none !important;`);
    L.push(`}`);
    L.push(``);
  }
  for (const node of kids) {
    L.push(`[part='${node.part}'] {`);
    L.push(`  /* no declared layout for this part */`);
    L.push(`}`);
    L.push(``);
  }
  void prefix;
  return L.join('\n');
}

/**
 * `<Name>.theme.css` — emitted ONCE, empty, and never regenerated. It is the consumer's file.
 *
 * It is adopted into the shadow root, so it is the consumer's file that lives INSIDE the component.
 * That sounds contradictory and is the honest description of what a shadow root does to the
 * arrangement: the sockets are still theirs to fill, and the result is still unreachable from the
 * page except through `::part()` and custom properties.
 */
export function emitThemeShadow(name, contract, profile) {
  const parts = partsOf(contract.anatomy.root);
  const L = [];
  L.push(`/*`);
  L.push(` * ${name} — YOUR FILE. Emitted once, never regenerated. Wire your tokens here.`);
  L.push(` *`);
  L.push(
    ` * Every channel below is declared in the contract with no source: the library says this`,
  );
  L.push(
    ` * part paints a background, and deliberately does not say from where. Uncomment and fill.`,
  );
  L.push(` *`);
  L.push(
    ` * THIS FILE IS ADOPTED INTO THE SHADOW ROOT, which is the one place it differs from its`,
  );
  L.push(
    ` * light-DOM twin. Custom properties still reach in from the page — \`var(--${'ds'}-*)\``,
  );
  L.push(
    ` * works exactly as it does elsewhere — but these selectors do not reach OUT, and a page`,
  );
  L.push(` * stylesheet cannot reach past \`::part()\`. See packages/wc/src/emit/README.md.`);
  L.push(` */`);
  L.push(``);
  for (const p of parts) {
    const sel = `[part='${p.node.part}']`;
    const channels = Object.keys(p.node.paints ?? {});
    if (channels.length) {
      L.push(`${sel} {`);
      for (const c of channels) L.push(`  /* ${c}: ; */`);
      L.push(`}`);
      L.push(``);
    }
    for (const [state, paints] of Object.entries(p.node.states ?? {})) {
      const def = contract.states?.[state];
      L.push(`/* state: ${state} — ${def?.visual ?? 'no visual recorded'} */`);
      L.push(`${stateSelectorShadow(sel, state, profile)} {`);
      for (const c of Object.keys(paints)) L.push(`  /* ${c}: ; */`);
      L.push(`}`);
      L.push(``);
    }
    for (const [key, paints] of Object.entries(p.node.whenAxis ?? {})) {
      const [axis, value] = key.includes('=') ? key.split('=') : [key, null];
      const on = `:host([${kebab(axis)}='${value ?? 'true'}'])`;
      const selector = `${on} ${sel}`;
      L.push(`/* ${axis} = ${value ?? 'true'} */`);
      L.push(`${selector} {`);
      for (const c of Object.keys(paints)) L.push(`  /* ${c}: ; */`);
      L.push(`}`);
      L.push(``);
    }
  }
  return L.join('\n');
}
