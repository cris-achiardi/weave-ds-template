// ─── ds-figma-explain · diagram kit ────────────────────────────────────────
// Helper prelude for figma_execute. Paste the functions you need at the top of
// the call, then the build code, then a bare `return`:
//
//   /* ...kit functions... */
//   const T = await tokens();          // ALWAYS first — everything needs it
//   await loadFonts();
//   /* ...build... */
//   return summary;
//
// DO NOT wrap in an async IIFE. `(async () => {...})()` returns a Promise the
// bridge does not await — the call reports success with an EMPTY result. Use
// top-level await; the code is already inside an async function body.
//
// The plugin runs with documentAccess: dynamic-page, so every page/node/style
// lookup here uses its async form.
//
// Nothing in this kit mutates existing nodes.
//
// ─── what makes this fork different ─────────────────────────────────────────
// Upstream figma-explain ships a frozen hex palette and tells you NOT to bind to
// the file's variables. That is right for an arbitrary file. It is wrong for a
// design system's own file: the roles are semantic, every other surface in the
// file binds, and a board full of literals silently stops matching the system it
// documents the first time a token moves.
//
// So: NOTHING here is a literal colour, font, size, radius or space. Every one
// resolves through `tokens()` to a Figma variable or text style. If you find
// yourself typing a hex, you are working around the kit.
//
// ─── READ THIS BEFORE YOUR FIRST BOARD ──────────────────────────────────────
// The CONFIG block below is only PARTLY mapped, because this repo has not yet
// decided its token set (.figma/manifest.json -> identity.variableCollections is
// empty). Collection names are measured; ROLE names are placeholders.
//
// The kit therefore degrades on purpose rather than lying:
//   - every failed lookup is pushed to T.unresolved
//   - T.report() returns that list -> PUT IT IN YOUR REPORT
//   - the `?? <number>` fallbacks let a board build at all. They are a last
//     resort, not a default to settle for.
//
// A board built with a dozen unresolved roles is a board of literals wearing the
// kit's clothes. Saying so is the difference between a known-provisional
// artefact and a misleading one.
//
// Fill CONFIG once, after ds-explore -> ds-decide have produced a token set.
// Do not patch role names inline in a board script.
//
// Measured against "weave DS - Mokkap masterclass" (eUO2kF0A3tJXdVTcvEPQjW) on
// 2026-08-28. Collection and style NAMES are the stable join; node IDs are not.
// See ds-figma-component/references/figma-file.md for the full survey.

// ─── tokens ─────────────────────────────────────────────────────────────────

// ─── CONFIG ─────────────────────────────────────────────────────────────────
// The only block you edit when the token set lands. Everything below it is
// mechanism.
//
// COLLECTIONS: measured 2026-08-28. The token/primitive split is what the
// scoping enforces — a board bound into a primitive carries no role and will not
// follow the token layer when it moves.
const COLLECTIONS = {
  color: 'Color Tokens', // token tier
  space: 'Spacing Tokens', // token tier — holds space/*, radius/*, border/*
  type: 'Type Tokens', // token tier
  // primitive tier, listed so it is obvious they are NOT what we bind to
  _colorPrimitive: 'Color Primitives',
  _typePrimitive: 'Type Primitives',
};

// ROLES: the board's visual language. PLACEHOLDER NAMES — these point at the
// role tokens that exist in the file today, which were authored for a product
// UI and not for documentation boards. Revisit once the token set is decided.
const ROLES = {
  accent: 'brand/primary',
  onAccent: 'text/primary',
  accentEdge: 'brand/primary',
  ink: 'text/primary',
  muted: 'text/secondary',
  link: 'brand/primary',
  border: 'border/primary',
  surface: 'surface/primary',
  surfaceAlt: 'surface/subtle',
  base: 'surface/primary',
  connector: 'border/primary',
  leader: 'control/off',
};

// TYPE ROLES -> text style names. The file has 8 styles (see figma-file.md).
// Never set fontName/fontSize; the styles already bind fontSize, fontFamily and
// fontWeight to variables.
// KNOWN DEFECT: UI/Button carries lineHeight 124.875%, the other seven are AUTO.
// Do not fix that here.
const TYPE_ROLES = {
  kicker: 'UI/Caption',
  title: 'Display/Title',
  deck: 'UI/Description',
  body: 'UI/Label',
  caption: 'UI/Caption',
  blockLabel: 'UI/Label-emphasis',
  nodeName: 'UI/Label-emphasis',
  nodeKind: 'UI/Caption',
  tableHead: 'UI/Label-emphasis',
  tableCell: 'UI/Label',
  chip: 'UI/Caption',
  badge: 'UI/Caption',
};

// SCALE -> variable names in COLLECTIONS.space. Fallbacks are last-resort only:
// if one fires, the name is wrong and the board has drifted from the system.
const SCALE = {
  pad: ['space/6', 40],
  gap: ['space/5', 32],
  cardPad: ['space/4', 24],
  cardGap: ['space/3', 16],
  tight: ['space/2', 12],
  xtight: ['space/1', 8],
  hair: ['space/0', 4],
  deckGap: ['space/7', 48],
  columnGap: ['space/9', 80],
  radius: ['radius/l', 16],
  cardRadius: ['radius/m', 8],
  pill: ['radius/full', 9999],
  stroke: ['border/thin', 1],
  strokeMd: ['border/regular', 2],
};

// Radius rungs by ROLE, for bindRadius().
const RADIUS_ROLES = { section: 'radius/l', card: 'radius/m', pill: 'radius/full' };

// ─── resolver ───────────────────────────────────────────────────────────────

// The whole styling surface, resolved once. Scope every variable lookup BY
// COLLECTION: the token and primitive tiers hold same-shaped names, so an
// unscoped find() can bind a board to a raw value that carries no role.
//
// Anything that fails to resolve is recorded rather than silently replaced.
async function tokens() {
  const allVars = await figma.variables.getLocalVariablesAsync();
  const cols = await figma.variables.getLocalVariableCollectionsAsync();
  const textStyles = await figma.getLocalTextStylesAsync();
  const effectStyles = await figma.getLocalEffectStylesAsync();

  const unresolved = [];
  const colId = (n) => (cols.find((c) => c.name === n) || {}).id;
  const scoped = (colName) => {
    const id = colId(colName);
    if (!id) unresolved.push('collection: ' + colName);
    return (n) => {
      const v = allVars.find((x) => x.name === n && x.variableCollectionId === id);
      if (!v) unresolved.push(colName + ' :: ' + n);
      return v;
    };
  };
  const V = scoped(COLLECTIONS.color); // all colour
  const SP = scoped(COLLECTIONS.space); // space, radius, border width
  const TY = scoped(COLLECTIONS.type); // type tokens
  const SH = SP,
    SEM = SP; // this file keeps radius+width with space

  const valueOf = (v) => v && v.valuesByMode[Object.keys(v.valuesByMode)[0]];
  const num = (fn, n) => {
    const v = fn(n);
    const x = valueOf(v);
    return typeof x === 'number' ? x : undefined;
  };

  const T = {
    V,
    SH,
    SP,
    SEM,
    TY,
    unresolved,
    style: (n) => {
      const s = textStyles.find((x) => x.name === n);
      if (!s) unresolved.push('textStyle: ' + n);
      return s;
    },
    // NOTE: this file has ZERO effect styles. Every effect() call will land in
    // `unresolved`, which is correct — a shadow here is a literal, and the
    // honesty rule says annotate it rather than pretend it is a token.
    effect: (n) => {
      const s = effectStyles.find((x) => x.name === n);
      if (!s) unresolved.push('effectStyle: ' + n);
      return s;
    },
    // Mode collections, for the both-modes validation. This file has ONE mode
    // per collection, so there is nothing to flip and that check cannot run.
    colorScheme: cols.find((c) => c.name === COLLECTIONS.color),
    shape: cols.find((c) => c.name === COLLECTIONS.space),
    modeCount: Math.max(...cols.map((c) => c.modes.length)),
  };

  // Named roles. Change a mapping in ROLES and the whole visual language follows.
  T.C = {};
  for (const [role, name] of Object.entries(ROLES)) T.C[role] = V(name);

  T.TYPE = { ...TYPE_ROLES };

  T.S = { width: 1440 };
  for (const [k, [name, fallback]] of Object.entries(SCALE)) {
    T.S[k] = num(SP, name) ?? fallback;
  }

  T.RADIUS = { ...RADIUS_ROLES };

  // Put this in the report. A silent fallback is the failure this kit exists to
  // prevent; an unresolved list is the finding that replaces it.
  T.report = () => ({
    unresolvedCount: unresolved.length,
    unresolved: [...new Set(unresolved)],
    modeCount: T.modeCount,
    modeFlipPossible: T.modeCount > 1,
  });

  return T;
}

// ─── binding ────────────────────────────────────────────────────────────────

// A node needs an existing paint before a variable can be bound to it, so every
// paint goes on as a placeholder and is immediately replaced by the bound one.
function paint(node, key, variable) {
  if (!variable) {
    node[key] = [];
    return node;
  }
  node[key] = [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } }];
  node[key] = [figma.variables.setBoundVariableForPaint(node[key][0], 'color', variable)];
  return node;
}

// Bind a numeric field if the API allows it, else leave the literal already set.
// Corner radii and strokeWeight bind reliably; spacing fields vary by version,
// so this degrades instead of throwing.
function bindNum(node, field, variable) {
  if (!variable) return node;
  try {
    node.setBoundVariable(field, variable);
  } catch (e) {}
  return node;
}
function bindRadius(node, T, rung) {
  // Rung names are full Shape paths, e.g. 'semantic/border/radius/default'.
  // Binding (rather than setting a number) is what makes a board follow the
  // Pill / Sharp modes instead of freezing the Default one.
  const v = T.SH(rung);
  for (const f of ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius'])
    bindNum(node, f, v);
  return node;
}

// ─── containers ─────────────────────────────────────────────────────────────

// resize() BEFORE sizing modes — resize implicitly sets both axes to FIXED.
//
// AXIS FLIP: `w` means width, but WHICH sizing mode governs width depends on
// layoutMode. VERTICAL → width is the COUNTER axis. HORIZONTAL → width is the
// PRIMARY axis. Pinning the wrong one silently fixes the HEIGHT at 1px instead,
// which then poisons every connector coordinate measured from that frame.
//
// `fill` / `stroke` take VARIABLES (T.C.*), never hexes.
function frame(name, o = {}) {
  const f = figma.createFrame();
  f.name = name;
  f.layoutMode = o.dir || 'VERTICAL';
  f.resize(Math.max(1, o.w || 1), Math.max(1, o.h || 1));
  const horizontal = f.layoutMode === 'HORIZONTAL';
  const widthMode = o.w ? 'FIXED' : 'AUTO';
  f.primaryAxisSizingMode = o.primary || (horizontal ? widthMode : 'AUTO');
  f.counterAxisSizingMode = o.counter || (horizontal ? 'AUTO' : widthMode);
  f.itemSpacing = o.gap == null ? 0 : o.gap;
  f.paddingLeft = f.paddingRight = o.px == null ? o.pad || 0 : o.px;
  f.paddingTop = f.paddingBottom = o.py == null ? o.pad || 0 : o.py;
  if (o.align) f.counterAxisAlignItems = o.align;
  if (o.justify) f.primaryAxisAlignItems = o.justify;
  f.cornerRadius = o.radius || 0;
  if (o.fill) paint(f, 'fills', o.fill);
  else f.fills = [];
  if (o.stroke) {
    paint(f, 'strokes', o.stroke);
    f.strokeAlign = 'INSIDE';
    f.strokeWeight = o.strokeWeight == null ? 1 : o.strokeWeight;
    if (o.dashed) f.dashPattern = [4, 4];
  }
  f.clipsContent = !!o.clip;
  return f;
}

// A plain (non-auto-layout) frame — use for the "stage" of an annotated mock,
// where children are positioned absolutely.
function stage(name, w, h, fillVar) {
  const f = figma.createFrame();
  f.name = name;
  f.resize(w, h);
  f.layoutMode = 'NONE';
  if (fillVar) paint(f, 'fills', fillVar);
  else f.fills = [];
  f.clipsContent = false;
  return f;
}

// ─── text ───────────────────────────────────────────────────────────────────
// Load fonts ONCE up front; text ops fail silently on unloaded fonts.
// Both families, and note 'Bold' — upstream omits it from its default list while
// three of its own helpers ask for it, so their text silently never renders.
// Open Sans has no Medium: SemiBold stands in, as it does across this whole file.
async function loadFonts() {
  for (const style of ['Regular', 'SemiBold', 'Bold']) {
    try {
      await figma.loadFontAsync({ family: 'Open Sans', style });
    } catch (e) {}
  }
  for (const style of ['Regular', 'Medium', 'SemiBold']) {
    try {
      await figma.loadFontAsync({ family: 'Barlow', style });
    } catch (e) {}
  }
  // createText() starts life as Inter Regular, so the FIRST write to any new
  // node needs Inter loaded even when a style is about to replace it.
  try {
    await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
  } catch (e) {}
}

// Every text node gets a real text style. `role` is a key of T.TYPE.
// Order matters: create → apply style → autoresize → characters → colour.
async function text(T, chars, role, colorVar, o = {}) {
  const t = figma.createText();
  const style = T.style(T.TYPE[role] || role);
  if (style) await t.setTextStyleIdAsync(style.id);
  t.textAutoResize = 'WIDTH_AND_HEIGHT';
  t.characters = String(chars);
  paint(t, 'fills', colorVar || T.C.ink);
  if (o.align) t.textAlignHorizontal = o.align;
  t.name = o.name || 'text';
  // NOTE: do not set lineHeight or letterSpacing here. Overriding either on a
  // styled node silently DETACHES the text style, which is a worse failure than
  // the divergence it fixes. Upstream's tracked kicker is dropped for that
  // reason — see references/styling.md.
  return t;
}

// Text that wraps inside an auto-layout parent: append FIRST, then set sizing.
async function fillText(T, parent, chars, role, colorVar, o = {}) {
  const t = await text(T, chars, role, colorVar, o);
  parent.appendChild(t);
  t.layoutSizingHorizontal = 'FILL';
  return t;
}

// ─── deck grammar ───────────────────────────────────────────────────────────

// One section = one slide.
function section(T, name, o) {
  o = o || {};
  const f = frame(name, {
    dir: 'VERTICAL',
    gap: T.S.gap,
    pad: T.S.pad,
    radius: T.S.radius,
    w: o.width || T.S.width,
    counter: 'FIXED',
    fill: o.recessed ? T.C.surfaceAlt : T.C.surface,
    stroke: o.emphasis ? T.C.accentEdge : T.C.border,
    strokeWeight: T.S.stroke,
  });
  bindRadius(f, T, T.RADIUS.section);
  bindNum(f, 'itemSpacing', T.SP('semantic/space/xl'));
  const shadow = T.effect('shadow/s');
  if (shadow && o.lift !== false) f.setEffectStyleIdAsync(shadow.id);
  return f;
}

// kicker → title → deck.
//
// Upstream's signature move is a tracked uppercase kicker. Tracking cannot be
// applied here without detaching the text style, so the kicker earns its
// separation from the accent colour and the label ramp instead. Write it
// uppercase in the string if you want the upstream read.
// Append this to its section FIRST, then call — the FILL sizing below needs a parent.
// Without it the head hugs its widest text and a long deck line runs straight off the
// side of the section card instead of wrapping inside it.
async function deckHead(T, parent, kicker, title, deckLine) {
  const h = frame('head', { dir: 'VERTICAL', gap: T.S.xtight });
  parent.appendChild(h);
  h.layoutSizingHorizontal = 'FILL';
  if (kicker) h.appendChild(await text(T, kicker, 'kicker', T.C.accent, { name: 'kicker' }));
  const t = await text(T, title, 'title', T.C.ink, { name: 'title' });
  h.appendChild(t);
  t.layoutSizingHorizontal = 'FILL';
  if (deckLine) {
    const d = await text(T, deckLine, 'deck', T.C.muted, { name: 'deck' });
    h.appendChild(d);
    d.layoutSizingHorizontal = 'FILL';
  }
  return h;
}

// A flat labelled region. Blocks butt together (gap 0) inside a bordered,
// clipped container — the seams ARE the layout.
//
// Upstream marks exactly one block DARK. That inverts under a theme: a dark
// block becomes the light one in dark mode, and the emphasis reads backwards.
// Here the emphasised block is `recessed` (surface/lowered) or carries the
// accent edge, both of which mean the same thing in either mode.
async function schematicBlock(T, n, label, sub, width, o) {
  o = o || {};
  const b = frame('blk', {
    dir: 'VERTICAL',
    gap: T.S.tight,
    pad: T.S.cardPad,
    w: width,
    counter: 'FIXED',
    fill: o.recessed ? T.C.surfaceAlt : T.C.surface,
    stroke: o.emphasis ? T.C.accentEdge : undefined,
    strokeWeight: T.S.stroke,
  });
  if (n != null) b.appendChild(await numBadge(T, n));
  b.appendChild(await text(T, label, 'blockLabel', T.C.ink, { name: 'label' }));
  if (sub) b.appendChild(await text(T, sub, 'caption', T.C.muted, { name: 'sub' }));
  return b;
}

// The pill that pairs a figure region with its legend entry.
async function numBadge(T, n, size) {
  const d = size || 28;
  const badge = frame('num', {
    dir: 'HORIZONTAL',
    w: d,
    h: d,
    radius: T.S.pill,
    counter: 'FIXED',
    primary: 'FIXED',
    justify: 'CENTER',
    align: 'CENTER',
    fill: T.C.accent,
  });
  bindRadius(badge, T, T.RADIUS.pill);
  badge.appendChild(await text(T, String(n), 'badge', T.C.onAccent, { name: 'n' }));
  return badge;
}

// The legend is a ROW of equal columns under the figure — never a side list.
// The same badge number appears here and inside the figure; that pairing is
// what removes the need for leader lines. Four columns is the sweet spot.
async function legendColumn(T, n, name, body, width) {
  const col = frame('lg', { dir: 'VERTICAL', gap: T.S.xtight, w: width, counter: 'FIXED' });
  const row = frame('r', { dir: 'HORIZONTAL', gap: T.S.xtight, align: 'CENTER' });
  row.appendChild(await numBadge(T, n));
  row.appendChild(await text(T, name, 'blockLabel', T.C.ink, { name: 'name' }));
  col.appendChild(row);
  col.appendChild(await text(T, body, 'body', T.C.muted, { name: 'body' }));
  return col;
}

async function chip(T, label, o) {
  o = o || {};
  const c = frame('chip', {
    dir: 'HORIZONTAL',
    px: T.S.tight,
    py: T.S.hair,
    radius: T.S.pill,
    fill: o.accent ? T.C.accent : T.C.surfaceAlt,
  });
  bindRadius(c, T, T.RADIUS.pill);
  c.appendChild(await text(T, label, 'chip', o.accent ? T.C.onAccent : T.C.muted));
  return c;
}

// ─── geometry ───────────────────────────────────────────────────────────────
// Unchanged from upstream — this half is arithmetic, not style.

// Bounds of `node` in `root`'s coordinate space. absoluteBoundingBox excludes
// strokes/effects — that's what connectors should meet.
function rel(node, root) {
  const a = node.absoluteBoundingBox,
    b = root.absoluteBoundingBox;
  return { x: a.x - b.x, y: a.y - b.y, w: a.width, h: a.height };
}

const ANCHOR = {
  right: (r) => ({ x: r.x + r.w, y: r.y + r.h / 2 }),
  left: (r) => ({ x: r.x, y: r.y + r.h / 2 }),
  top: (r) => ({ x: r.x + r.w / 2, y: r.y }),
  bottom: (r) => ({ x: r.x + r.w / 2, y: r.y + r.h }),
};

// Mid-channel elbow: turn in the gutter between columns, never inside a box.
// `channelShift` offsets the turn so parallel runs in a fan-out don't overlap.
function elbowPoints(a, b, fromSide = 'right', toSide = 'left', channelShift = 0) {
  const p = ANCHOR[fromSide](a),
    q = ANCHOR[toSide](b);
  const horizontal = fromSide === 'right' || fromSide === 'left';
  if (Math.abs(horizontal ? p.y - q.y : p.x - q.x) < 0.5) return [p, q];
  if (horizontal) {
    const mx = (p.x + q.x) / 2 + channelShift;
    return [p, { x: mx, y: p.y }, { x: mx, y: q.y }, q];
  }
  const my = (p.y + q.y) / 2 + channelShift;
  return [p, { x: p.x, y: my }, { x: q.x, y: my }, q];
}

// Route around instead of through: leave the source downward, run under the
// row, come up into the target. For feedback edges that would otherwise cut
// straight back across the boxes they connect.
function underPoints(a, b, drop) {
  const p = ANCHOR.bottom(a),
    q = ANCHOR.bottom(b);
  const y = Math.max(p.y, q.y) + (drop == null ? 48 : drop);
  return [p, { x: p.x, y }, { x: q.x, y }, q];
}

// ─── connectors ─────────────────────────────────────────────────────────────
// Design files have NO real connectors (figma.createConnector is FigJam-only).
// This draws one as a vector: elbow path, rounded corners, arrowhead on the
// terminal vertex only.
//
//   root      the diagram frame; ALL connectors parent here
//   from/to   nodes already laid out by auto-layout (pass 1 must be done)
//
// `o.color` takes a VARIABLE. Upstream defaulted to `P.CONNECTOR`, which is
// defined in neither of its palettes — hexRGB(undefined) yields NaN channels
// and the stroke silently disappears. Here the default is a real role.
async function connect(T, root, fromNode, toNode, o = {}) {
  const a = rel(fromNode, root),
    b = rel(toNode, root);
  const pts = o.points || elbowPoints(a, b, o.from || 'right', o.to || 'left', o.shift || 0);

  const vec = figma.createVector();
  vec.name = o.name || 'connector · ' + fromNode.name + ' → ' + toNode.name;
  root.appendChild(vec);
  // Auto-layout parents would otherwise sweep the vector into the flow.
  if (root.layoutMode && root.layoutMode !== 'NONE') vec.layoutPositioning = 'ABSOLUTE';

  const cap = o.cap === undefined ? 'ARROW_EQUILATERAL' : o.cap;
  await vec.setVectorNetworkAsync({
    vertices: pts.map((p, i) => ({
      x: p.x,
      y: p.y,
      strokeCap: i === pts.length - 1 ? cap : i === 0 ? o.startCap || 'NONE' : 'NONE',
      cornerRadius: o.radius == null ? 8 : o.radius,
    })),
    segments: pts.slice(1).map((_, i) => ({ start: i, end: i + 1 })),
    regions: [],
  });

  vec.fills = [];
  paint(vec, 'strokes', o.color || T.C.connector);
  vec.strokeWeight = o.weight == null ? 1.5 : o.weight;
  if (o.dashed) vec.dashPattern = [4, 4];

  // setVectorNetworkAsync re-origins the node to fit its vertices. Measure the
  // result and translate so the path lands exactly where the math said.
  // Measured drift without this in a real build: 1488px.
  const minX = Math.min.apply(
    null,
    pts.map((p) => p.x),
  );
  const minY = Math.min.apply(
    null,
    pts.map((p) => p.y),
  );
  const got = rel(vec, root);
  vec.x += minX - got.x;
  vec.y += minY - got.y;

  if (o.behind !== false) root.insertChild(0, vec); // lines sit behind boxes
  return { vec, pts, mid: pts[Math.floor(pts.length / 2)] };
}

// A chip label sitting on a connector, so the line doesn't strike the glyphs.
async function connectorLabel(T, root, at, chars) {
  const c = frame('label · ' + chars, {
    dir: 'HORIZONTAL',
    px: T.S.hair,
    py: 2,
    radius: T.S.cardRadius,
    fill: T.C.surface,
  });
  root.appendChild(c);
  if (root.layoutMode && root.layoutMode !== 'NONE') c.layoutPositioning = 'ABSOLUTE';
  c.appendChild(await text(T, chars, 'caption', T.C.muted));
  const box = rel(c, root);
  c.x = at.x - box.w / 2;
  c.y = at.y - box.h / 2;
  return c;
}

// ─── annotations ────────────────────────────────────────────────────────────

// Annotation leader in the house style: a dot ON the part, a thin arrow INTO
// the label. Different language from a graph edge — see references/annotations.md.
// Upstream's amber literal becomes warning/border/loud, so it follows the theme.
async function leader(T, root, pts, o) {
  o = o || {};
  const vec = figma.createVector();
  vec.name = o.name || 'leader';
  root.appendChild(vec);
  if (root.layoutMode && root.layoutMode !== 'NONE') vec.layoutPositioning = 'ABSOLUTE';
  await vec.setVectorNetworkAsync({
    vertices: pts.map((p, i) => ({
      x: p.x,
      y: p.y,
      strokeCap: i === 0 ? 'CIRCLE_FILLED' : i === pts.length - 1 ? 'ARROW_LINES' : 'NONE',
      cornerRadius: o.radius == null ? 10 : o.radius,
    })),
    segments: pts.slice(1).map((_, i) => ({ start: i, end: i + 1 })),
    regions: [],
  });
  vec.fills = [];
  paint(vec, 'strokes', o.color || T.C.leader);
  vec.strokeWeight = o.weight == null ? 1 : o.weight; // 1, not the 1.5 of graph edges
  const minX = Math.min.apply(
    null,
    pts.map((p) => p.x),
  );
  const minY = Math.min.apply(
    null,
    pts.map((p) => p.y),
  );
  const got = rel(vec, root);
  vec.x += minX - got.x;
  vec.y += minY - got.y;
  root.insertChild(0, vec);
  return vec;
}

// The semantic half of an annotation: attached to the node, survives edits,
// pins LIVE values, visible in Dev Mode. Invisible in exports — always pair it
// with a drawn callout. Assignment REPLACES; read+concat to append.
function annotate(node, label, pinned, categoryId) {
  const a = { label: label };
  if (pinned && pinned.length) a.properties = pinned.map((t) => ({ type: t }));
  if (categoryId) a.categoryId = categoryId;
  node.annotations = [a];
  return node;
}

// ─── building blocks ────────────────────────────────────────────────────────

// Node-graph box. `width` fixed so a column stays aligned.
// `o.emphasis` gives it the accent edge — the replacement for upstream's dark box.
async function nodeBox(T, name, kind, width, o) {
  o = o || {};
  const box = frame('node · ' + name, {
    dir: 'VERTICAL',
    gap: T.S.hair,
    pad: T.S.cardPad,
    radius: T.S.cardRadius,
    fill: o.recessed ? T.C.surfaceAlt : T.C.surface,
    stroke: o.emphasis ? T.C.accentEdge : T.C.border,
    strokeWeight: o.emphasis ? (T.S.strokeMd ?? 2) : T.S.stroke,
    w: width || 200,
    counter: 'FIXED',
  });
  bindRadius(box, T, T.RADIUS.card);
  box.appendChild(await text(T, name, 'nodeName', T.C.ink, { name: 'name' }));
  if (kind) box.appendChild(await text(T, kind, 'nodeKind', T.C.muted, { name: 'kind' }));
  return box;
}

// A decision diamond for flow figures. `figma.createPolygon()` with `pointCount = 4`
// inscribed in its bounding box IS a diamond, so connectors anchoring to the frame's
// left/right/top/bottom midpoints land exactly on its four points.
//
// The frame is NOT auto-layout: the label is centred by hand, because auto-layout
// would size the frame to the text and the diamond would stop being a diamond.
// Label every outgoing edge (`yes` / `no`) — an unlabelled branch is a coin toss.
async function decisionNode(T, label, width, height) {
  const w = width || 220,
    h = height || 120;
  const f = figma.createFrame();
  f.name = 'decision · ' + label;
  f.resize(w, h);
  f.layoutMode = 'NONE';
  f.fills = [];
  f.clipsContent = false;

  const poly = figma.createPolygon();
  poly.name = 'diamond';
  f.appendChild(poly);
  poly.pointCount = 4;
  poly.resize(w, h);
  poly.x = 0;
  poly.y = 0;
  paint(poly, 'fills', T.C.surfaceAlt);
  paint(poly, 'strokes', T.C.border);
  poly.strokeWeight = T.S.stroke;

  const t = await text(T, label, 'nodeKind', T.C.ink);
  f.appendChild(t);
  t.name = 'label';
  t.textAlignHorizontal = 'CENTER';
  t.textAutoResize = 'HEIGHT';
  t.resize(w * 0.62, t.height); // inside the diamond's waist, not its bounding box
  t.x = (w - t.width) / 2;
  t.y = (h - t.height) / 2;
  return f;
}

// One table row. Call the SAME helper for the header and every body row, or the
// columns will not align. `widths[i] = null` → that cell FILLs.
async function tableRow(T, cells, widths, o = {}) {
  const row = frame(o.name || 'row', {
    dir: 'HORIZONTAL',
    gap: 0,
    fill: o.recessed ? T.C.surfaceAlt : undefined,
    stroke: T.C.border,
  });
  row.strokeWeight = 0;
  row.strokeBottomWeight = o.divider === false ? 0 : T.S.stroke;
  for (let i = 0; i < cells.length; i++) {
    const c = cells[i];
    const cell = frame('cell', { dir: 'VERTICAL', px: T.S.cardGap, py: T.S.tight, gap: T.S.hair });
    row.appendChild(cell);
    const w = widths && widths[i];
    // resize() fixes BOTH axes — restore the vertical one or the cell stays
    // 1px tall and its text is invisible.
    if (w) {
      cell.resize(w, 1);
      cell.layoutSizingHorizontal = 'FIXED';
      cell.layoutSizingVertical = 'HUG';
    } else {
      cell.layoutSizingHorizontal = 'FILL';
    }
    if (typeof c === 'string') {
      const t = await text(T, c, o.head ? 'tableHead' : 'tableCell', o.head ? T.C.muted : T.C.ink);
      cell.appendChild(t);
      t.layoutSizingHorizontal = 'FILL';
    } else {
      cell.appendChild(c);
    }
  }
  return row;
}

// Numbered callout badge, absolutely placed over a stage. Smaller than the
// legend badge on purpose — it sits ON artwork rather than beside prose.
async function badge(T, n, x, y) {
  const b = await numBadge(T, n, 20);
  b.name = 'badge · ' + n;
  b.x = x - 10;
  b.y = y - 10; // centred on the anchor point
  return b;
}

// ─── housekeeping ───────────────────────────────────────────────────────────

// Reuse a SECTION node by name; never create a duplicate. Clears children on
// reuse. (Not to be confused with section() above, which builds a deck slide.)
function reuseSection(name, x, y) {
  let s = figma.currentPage.findOne((n) => n.type === 'SECTION' && n.name === name);
  if (s) {
    s.children.slice().forEach((c) => c.remove());
    return s;
  }
  s = figma.createSection();
  s.name = name;
  s.x = x || 0;
  s.y = y || 0;
  return s;
}

// Lowest occupied y on the page — start below it so nothing overlaps.
function pageBottom() {
  const kids = figma.currentPage.children.filter((n) => n.absoluteBoundingBox);
  if (!kids.length) return 0;
  return Math.max.apply(
    null,
    kids.map((n) => n.absoluteBoundingBox.y + n.absoluteBoundingBox.height),
  );
}

// ─── self-check ─────────────────────────────────────────────────────────────
// Run before reporting. Everything here must come back clean.
function audit(root) {
  const out = { unstyledText: [], literalFills: [], literalStrokes: [] };
  const walk = (n) => {
    if (n.type === 'TEXT' && (!n.textStyleId || n.textStyleId === figma.mixed))
      out.unstyledText.push(n.name);
    if (
      n.fills &&
      n.fills !== figma.mixed &&
      n.fills.length &&
      !n.fills.every((f) => f.boundVariables && f.boundVariables.color)
    )
      out.literalFills.push(n.name);
    if (
      n.strokes &&
      n.strokes.length &&
      !n.strokes.every((s) => s.boundVariables && s.boundVariables.color)
    )
      out.literalStrokes.push(n.name);
    if ('children' in n) n.children.forEach(walk);
  };
  walk(root);
  return out;
}
