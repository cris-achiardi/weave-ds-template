// The two stylesheets every LIGHT-DOM web backend emits, and the selector rule behind them.
//
// These were written once in the React emitter and copied, unchanged, into the Vue and Angular
// ones. There was never anything framework-specific to remove: both functions emit CSS, and CSS
// does not know what a framework is. The copies were kept only long enough to measure what a second
// and third backend cost (docs/research/0004, 0005); this is the move those reports named.
//
// LIGHT DOM IS IN THE NAME OF EVERY SELECTOR HERE, and that is the limit of this module rather than
// an oversight. Every rule below is a descendant selector over data attributes:
//
//     [data-ds-component='Button'] [data-ds-part='label']
//
// A descendant selector cannot cross a shadow boundary. A backend that puts its parts inside a
// shadow root needs `::part(label)` and `:host([data-ds-hierarchy='primary'])` instead — a
// different selector grammar for the same contract, not a different value in the same one.
//
// Whether that becomes a parameter on these functions or a second module beside them is NOT decided
// here, because nothing has built it yet and a shape invented for a backend that does not exist is
// a guess. It is stated so that the first person to hit it knows it was expected.

import { ariaAttributeFor, pseudoClassFor, visibilityOf } from '@ds/platform-web';
import { kebab, partsOf } from './contract.mjs';

/**
 * The selector for one state, on one part.
 *
 * The order is the whole rule: a native pseudo-class if the browser owns the state, else the ARIA
 * attribute if one carries it, else the data attribute the emitter invented. Writing a second
 * channel when the first exists is what produces two attributes for one fact, which can disagree.
 *
 * The prefix is not optional and the operator is not `~=`. Emitted markup writes
 * `data-<prefix>-state-<name>` as a bare attribute, so an unprefixed `[data-state~=...]` matches
 * nothing at all — a dead rule that styles nothing and reports no error.
 */
export function stateSelector(base, spec, prefix, profile) {
  const [state, value] = spec.includes('=') ? spec.split('=') : [spec, null];
  const isChild = base.includes('] [');
  const rootSel = isChild ? base.split('] [')[0] + ']' : base;
  const childSel = isChild ? '[' + base.split('] [')[1] : '';
  if (value !== null) {
    const on = `[data-${prefix}-state-${state}='${value}']`;
    return isChild ? `${rootSel}${on} ${childSel}` : `${base}${on}`;
  }
  let on;
  if (pseudoClassFor(state, profile)) on = pseudoClassFor(state, profile);
  else if (ariaAttributeFor(state, profile)) on = `[${ariaAttributeFor(state, profile)}='true']`;
  else on = `[data-${prefix}-state-${state}]`;
  return isChild ? `${rootSel}${on} ${childSel}` : `${base}${on}`;
}

/**
 * `<Name>.structure.css` — REGENERATED on every run, and almost empty on purpose.
 *
 * @param {(topic: string, decision: string, why: string) => void} assume
 *   the caller's assumption recorder, so each emitter reports this in its own run rather than this
 *   module printing anything of its own.
 */
export function emitStructure(name, contract, element, prefix, profile, assume) {
  const root = contract.anatomy.root;
  const kids = Object.values(root.parts ?? {});
  const hides = JSON.stringify(contract.anatomy).includes('"visibleWhen"');
  const visibility = visibilityOf(element, profile);
  const platformHidden =
    visibility.mode === 'imperative' && root.visibleWhen ? visibility.hiddenSelector : null;

  assume(
    'structural CSS',
    'NONE EMITTED — the emitter refuses to guess',
    "THE BIG ONE, and it is reported identically by every backend because it is now ONE function. The contract has no `layout` block, so there is nothing to derive from and a guess that renders is more dangerous than one that does not. Every component's real layout therefore lives in the CONSUMER's theme file, which is the wrong place. Three independent emitters hit it in the same place before this was shared, which is what established that the gap is in the CONTRACT.",
  );

  const L = [];
  L.push(`/* GENERATED from ${name}.contract.json. Do not edit by hand — regenerate instead. */`);
  L.push(`/*`);
  L.push(` * STRUCTURE ONLY — and there is almost none, on purpose.`);
  L.push(` *`);
  L.push(` * This file should hold the layout ${name}'s contract depends on: the positioning,`);
  L.push(
    ` * stacking and flow that make its stated behaviour true, with no colour or spacing in it.`,
  );
  L.push(` * It cannot, because the contract has no \`layout\` block and nothing in it describes`);
  L.push(` * where a part sits. The emitter will not guess: an inferred layout that renders is`);
  L.push(` * harder to catch than one that does not.`);
  L.push(` *`);
  L.push(` * So ${name}'s real layout currently lives in ${name}.theme.css — the CONSUMER's file,`);
  L.push(` * which is the wrong place for it. See docs/research/0002.`);
  L.push(` */`);
  L.push(``);
  L.push(`[data-${prefix}-component='${name}'] {`);
  L.push(`  /* the scoping handle. Everything else is yours, for now. */`);
  L.push(`}`);
  L.push(``);

  // The one structural rule worth writing, because it is not a guess about layout: it is what makes
  // a `visibleWhen` in the contract TRUE.
  //
  // `[hidden] { display: none }` comes from the browser's own stylesheet, and every rule in a theme
  // file outranks it. So a theme that gives a part a `display` — which any dialog, tooltip or panel
  // needs — silently cancels hiding, and the part is permanently visible however correct the state
  // behind it is. That is not hypothetical: it is what made a sandbox Dialog render open and
  // unclosable, with its buttons working the whole time.
  //
  // `!important` is deliberate and is the point. Whether a part is SHOWING is a claim the contract
  // makes, not an appearance choice, so it is not the consumer's to override by accident.
  if (hides) {
    L.push(`/* Hiding is a contract claim, not a style. See the note in @ds/emit-web. */`);
    if (platformHidden) L.push(`[data-${prefix}-component='${name}']${platformHidden},`);
    L.push(`[data-${prefix}-component='${name}'][hidden],`);
    L.push(`[data-${prefix}-component='${name}'] [hidden] {`);
    L.push(`  display: none !important;`);
    L.push(`}`);
    L.push(``);
    if (platformHidden) {
      L.push(`/*`);
      L.push(` * The first selector above is the SAME trap as [hidden], under a different name.`);
      L.push(` * \`dialog:not([open]) { display: none }\` is a browser-stylesheet rule, so any`);
      L.push(` * \`display\` a theme puts on this element outranks it and the closed dialog stays`);
      L.push(` * on screen with showModal() never having been called. Give the display to a part`);
      L.push(` * inside instead, or scope it to [open].`);
      L.push(` */`);
      L.push(``);
    }
  }
  for (const node of kids) {
    L.push(`[data-${prefix}-component='${name}'] [data-${prefix}-part='${node.part}'] {`);
    L.push(`  /* no declared layout for this part */`);
    L.push(`}`);
    L.push(``);
  }
  return L.join('\n');
}

/**
 * `<Name>.theme.css` — emitted ONCE, empty, and never regenerated. It is the consumer's file.
 *
 * One commented socket per channel the contract declares with no source. ADR 0003 is why they are
 * empty: a paint names the channel and leaves its source unbound.
 */
export function emitTheme(name, contract, prefix, profile) {
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
  L.push(` * NOTE: this file is FRAMEWORK-FREE. It selects on data attributes the contract`);
  L.push(` * produced, so the identical file styles every light-DOM build of ${name}.`);
  L.push(` * See docs/research/0004.`);
  L.push(` */`);
  L.push(``);
  for (const p of parts) {
    const sel =
      p.key === 'root'
        ? `[data-${prefix}-component='${name}']`
        : `[data-${prefix}-component='${name}'] [data-${prefix}-part='${p.node.part}']`;
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
      L.push(`${stateSelector(sel, state, prefix, profile)} {`);
      for (const c of Object.keys(paints)) L.push(`  /* ${c}: ; */`);
      L.push(`}`);
      L.push(``);
    }
    for (const [key, paints] of Object.entries(p.node.whenAxis ?? {})) {
      const [axis, value] = key.includes('=') ? key.split('=') : [key, null];
      const attr = `[data-${prefix}-${kebab(axis)}='${value ?? 'true'}']`;
      const rootSel = `[data-${prefix}-component='${name}']`;
      const selector =
        sel === rootSel
          ? `${rootSel}${attr}`
          : `${rootSel}${attr} ${sel.slice(rootSel.length + 1)}`;
      L.push(`/* ${axis} = ${value ?? 'true'} */`);
      L.push(`${selector} {`);
      for (const c of Object.keys(paints)) L.push(`  /* ${c}: ; */`);
      L.push(`}`);
      L.push(``);
    }
  }
  return L.join('\n');
}
