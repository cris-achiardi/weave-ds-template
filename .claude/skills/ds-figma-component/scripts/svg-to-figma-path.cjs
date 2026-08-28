// svg-to-figma-path.cjs — convert SVG path data into geometry Figma's vectorPaths accepts.
//
// WHY THIS EXISTS
//   figma.createVector().vectorPaths rejects most real-world SVG path data:
//     - it has NO arc command, and icon sets use `a` for every rounded join
//     - it will not parse the compact form (`M229.66,77.66l-128,128...`)
//   So a glyph copied straight out of an icon package fails with
//   "Failed to convert path. Invalid command at ...".
//
// WHAT IT DOES
//   Parses full SVG path syntax (absolute + relative, H/V/S/T shorthands),
//   flattens arcs to cubic Béziers, and emits space-separated absolute
//   `M / L / C / Z` only — the subset Figma reliably accepts. Also returns the
//   ink bounding box, which you NEED: Figma normalises a vector to its own ink
//   bbox and drops it at 0,0, so you must set v.x / v.y from `box` to place the
//   glyph correctly inside its frame.
//
// USAGE
//   Edit SRC / VB / TARGET below, then `node svg-to-figma-path.cjs`.
//   VB is the source viewBox edge (Phosphor is 256), TARGET the icon rung in px.
//   Output: { name: { d, box:{x,y,w,h} } } — inline `d` and `box` into the
//   figma_execute script that builds the components.
//
// Used on 2026-08-24 to bring the 13 shipped Phosphor glyphs into the file.

// SVG path -> Figma-safe absolute M/L/C/Z, arcs flattened to cubics, scaled to a target box.
// { name: "<svg path d>" } — paste raw path data here, or point this at a JSON file
// you extracted (e.g. from node_modules/@phosphor-icons/react/dist/defs/<Name>.es.js,
// taking the FIRST `d:` after the "regular" weight key).
const SRC = {
  Check:
    'M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z',
};
const VB = 256,
  TARGET = 20,
  S = TARGET / VB;

function tokenize(d) {
  const out = [];
  const re = /([MmLlHhVvCcSsQqTtAaZz])|(-?\d*\.?\d+(?:e[-+]?\d+)?)/gi;
  let m;
  while ((m = re.exec(d))) out.push(m[1] || parseFloat(m[2]));
  return out;
}
function arcToCubics(x0, y0, rx, ry, phiDeg, fa, fs, x, y) {
  if (rx === 0 || ry === 0) return [['L', x, y]];
  const phi = (phiDeg * Math.PI) / 180,
    cp = Math.cos(phi),
    sp = Math.sin(phi);
  const dx = (x0 - x) / 2,
    dy = (y0 - y) / 2;
  const x1 = cp * dx + sp * dy,
    y1 = -sp * dx + cp * dy;
  rx = Math.abs(rx);
  ry = Math.abs(ry);
  let l = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry);
  if (l > 1) {
    const k = Math.sqrt(l);
    rx *= k;
    ry *= k;
  }
  const sign = fa === fs ? -1 : 1;
  let num = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1;
  let den = rx * rx * y1 * y1 + ry * ry * x1 * x1;
  let co = sign * Math.sqrt(Math.max(0, num / den));
  const cx1 = (co * rx * y1) / ry,
    cy1 = (-co * ry * x1) / rx;
  const cx = cp * cx1 - sp * cy1 + (x0 + x) / 2,
    cy = sp * cx1 + cp * cy1 + (y0 + y) / 2;
  const ang = (ux, uy, vx, vy) => {
    const s = Math.sign(ux * vy - uy * vx) || 1;
    const c = Math.min(
      1,
      Math.max(-1, (ux * vx + uy * vy) / (Math.hypot(ux, uy) * Math.hypot(vx, vy))),
    );
    return s * Math.acos(c);
  };
  let th1 = ang(1, 0, (x1 - cx1) / rx, (y1 - cy1) / ry);
  let dth = ang((x1 - cx1) / rx, (y1 - cy1) / ry, (-x1 - cx1) / rx, (-y1 - cy1) / ry);
  if (!fs && dth > 0) dth -= 2 * Math.PI;
  if (fs && dth < 0) dth += 2 * Math.PI;
  const segs = Math.ceil(Math.abs(dth / (Math.PI / 2))) || 1;
  const out = [];
  const delta = dth / segs;
  const t = (4 / 3) * Math.tan(delta / 4);
  let th = th1,
    px = x0,
    py = y0;
  for (let i = 0; i < segs; i++) {
    const th2 = th + delta;
    const c1 = Math.cos(th),
      s1 = Math.sin(th),
      c2 = Math.cos(th2),
      s2 = Math.sin(th2);
    const e = (ct, st) => [cp * rx * ct - sp * ry * st + cx, sp * rx * ct + cp * ry * st + cy];
    const [ex, ey] = e(c2, s2);
    const d1 = [-rx * s1, ry * c1],
      d2 = [-rx * s2, ry * c2];
    const r1 = [cp * d1[0] - sp * d1[1], sp * d1[0] + cp * d1[1]];
    const r2 = [cp * d2[0] - sp * d2[1], sp * d2[0] + cp * d2[1]];
    out.push(['C', px + t * r1[0], py + t * r1[1], ex - t * r2[0], ey - t * r2[1], ex, ey]);
    px = ex;
    py = ey;
    th = th2;
  }
  return out;
}
function toAbs(d) {
  const t = tokenize(d);
  let i = 0,
    cmd = null,
    x = 0,
    y = 0,
    sx = 0,
    sy = 0,
    px = null,
    py = null;
  const segs = [];
  const num = () => t[i++];
  while (i < t.length) {
    if (typeof t[i] === 'string') cmd = t[i++];
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    if (C === 'M') {
      let nx = num(),
        ny = num();
      if (rel) {
        nx += x;
        ny += y;
      }
      x = nx;
      y = ny;
      sx = x;
      sy = y;
      segs.push(['M', x, y]);
      cmd = rel ? 'l' : 'L';
      px = py = null;
    } else if (C === 'L') {
      let nx = num(),
        ny = num();
      if (rel) {
        nx += x;
        ny += y;
      }
      x = nx;
      y = ny;
      segs.push(['L', x, y]);
      px = py = null;
    } else if (C === 'H') {
      let nx = num();
      if (rel) nx += x;
      x = nx;
      segs.push(['L', x, y]);
      px = py = null;
    } else if (C === 'V') {
      let ny = num();
      if (rel) ny += y;
      y = ny;
      segs.push(['L', x, y]);
      px = py = null;
    } else if (C === 'C') {
      let a = num(),
        b = num(),
        c = num(),
        dd = num(),
        e = num(),
        f = num();
      if (rel) {
        a += x;
        b += y;
        c += x;
        dd += y;
        e += x;
        f += y;
      }
      segs.push(['C', a, b, c, dd, e, f]);
      px = c;
      py = dd;
      x = e;
      y = f;
    } else if (C === 'S') {
      let c = num(),
        dd = num(),
        e = num(),
        f = num();
      if (rel) {
        c += x;
        dd += y;
        e += x;
        f += y;
      }
      const a = px == null ? x : 2 * x - px,
        b = py == null ? y : 2 * y - py;
      segs.push(['C', a, b, c, dd, e, f]);
      px = c;
      py = dd;
      x = e;
      y = f;
    } else if (C === 'Q') {
      let a = num(),
        b = num(),
        e = num(),
        f = num();
      if (rel) {
        a += x;
        b += y;
        e += x;
        f += y;
      }
      segs.push([
        'C',
        x + (2 / 3) * (a - x),
        y + (2 / 3) * (b - y),
        e + (2 / 3) * (a - e),
        f + (2 / 3) * (b - f),
        e,
        f,
      ]);
      px = a;
      py = b;
      x = e;
      y = f;
    } else if (C === 'T') {
      let e = num(),
        f = num();
      if (rel) {
        e += x;
        f += y;
      }
      const a = px == null ? x : 2 * x - px,
        b = py == null ? y : 2 * y - py;
      segs.push([
        'C',
        x + (2 / 3) * (a - x),
        y + (2 / 3) * (b - y),
        e + (2 / 3) * (a - e),
        f + (2 / 3) * (b - f),
        e,
        f,
      ]);
      px = a;
      py = b;
      x = e;
      y = f;
    } else if (C === 'A') {
      const rx = num(),
        ry = num(),
        rot = num(),
        fa = num(),
        fs = num();
      let e = num(),
        f = num();
      if (rel) {
        e += x;
        f += y;
      }
      for (const s of arcToCubics(x, y, rx, ry, rot, fa, fs, e, f)) segs.push(s);
      x = e;
      y = f;
      px = py = null;
    } else if (C === 'Z') {
      segs.push(['Z']);
      x = sx;
      y = sy;
      px = py = null;
    } else {
      throw new Error('unsupported command ' + cmd);
    }
  }
  return segs;
}
function bbox(segs) {
  let x0 = 1e9,
    y0 = 1e9,
    x1 = -1e9,
    y1 = -1e9;
  const pt = (x, y) => {
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  };
  let cx = 0,
    cy = 0;
  for (const s of segs) {
    if (s[0] === 'M' || s[0] === 'L') {
      pt(s[1], s[2]);
      cx = s[1];
      cy = s[2];
    } else if (s[0] === 'C') {
      for (let t = 0; t <= 1; t += 1 / 24) {
        const mt = 1 - t;
        const X =
          mt * mt * mt * cx + 3 * mt * mt * t * s[1] + 3 * mt * t * t * s[3] + t * t * t * s[5];
        const Y =
          mt * mt * mt * cy + 3 * mt * mt * t * s[2] + 3 * mt * t * t * s[4] + t * t * t * s[6];
        pt(X, Y);
      }
      cx = s[5];
      cy = s[6];
    }
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
const r = (n) => Math.round(n * 1000) / 1000;
const out = {};
for (const [name, d] of Object.entries(SRC)) {
  const segs = toAbs(d);
  const bb = bbox(segs);
  const parts = [];
  for (const s of segs) {
    if (s[0] === 'M') parts.push('M ' + r(s[1] * S) + ' ' + r(s[2] * S));
    else if (s[0] === 'L') parts.push('L ' + r(s[1] * S) + ' ' + r(s[2] * S));
    else if (s[0] === 'C') parts.push('C ' + [1, 2, 3, 4, 5, 6].map((i) => r(s[i] * S)).join(' '));
    else if (s[0] === 'Z') parts.push('Z');
  }
  out[name] = {
    d: parts.join(' '),
    box: { x: r(bb.x * S), y: r(bb.y * S), w: r(bb.w * S), h: r(bb.h * S) },
  };
}
require('fs').writeFileSync('icons-figma.json', JSON.stringify(out));
console.log(
  'converted',
  Object.keys(out).length,
  'glyphs; total',
  JSON.stringify(out).length,
  'chars',
);
console.log('Check box:', JSON.stringify(out.Check.box));
console.log('Check d  :', out.Check.d.slice(0, 120) + '...');
