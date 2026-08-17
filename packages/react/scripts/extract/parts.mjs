/**
 * Inventory the `data-ds-part` and `data-ds-state` values a component's TSX actually renders.
 *
 * This is what makes the contract's anatomy checkable. A shadow-DOM system gets the same
 * inventory from a generated manifest; here it is a scan of the source, which is both smaller
 * and impossible to serve stale.
 *
 * Deliberately a regex and not an AST walk. It answers one question — "does this literal appear
 * as a part name in this file" — and a scan that is slightly over-permissive is the right
 * failure direction: it can only ever cause the gate to MISS a phantom part, never to reject a
 * part that genuinely renders. An AST walk would have to model conditional JSX, spread props and
 * expression values to do better, and would still be over-permissive at the edges.
 *
 * Known limitation, stated rather than hidden: a computed value
 * (`data-ds-part={isOpen ? 'a' : 'b'}`) is not seen. Do not write one — the whole point of a part
 * name is that it is a stable, findable string.
 */

const byCodePoint = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/** All distinct string values of `data-<prefix>-<attr>` in a source file, sorted. */
function scanAttribute(sourceText, prefix, attr) {
  // Matches: data-ds-part="label"  and  data-ds-part={'label'}  and  data-ds-part={"label"}
  const re = new RegExp(`data-${prefix}-${attr}\\s*=\\s*(?:\\{\\s*)?["'\`]([^"'\`]+)["'\`]`, 'g');
  const found = new Set();
  let m;
  while ((m = re.exec(sourceText)) !== null) found.add(m[1]);
  return [...found].sort(byCodePoint);
}

/**
 * @param {string} sourceText
 * @param {string} dataPrefix from /ds.config.json — never hard-coded, so init-ds moves it
 */
export function extractParts(sourceText, dataPrefix = 'ds') {
  return {
    parts: scanAttribute(sourceText, dataPrefix, 'part'),
    states: scanAttribute(sourceText, dataPrefix, 'state'),
  };
}

/** Class names referenced as `styles.x` — the other half of the part/className invariant. */
export function extractStyleKeys(sourceText) {
  const found = new Set();
  const re = /\bstyles\.([A-Za-z_$][\w$]*)/g;
  let m;
  while ((m = re.exec(sourceText)) !== null) found.add(m[1]);
  // `styles['icon-start']` is equally valid and equally findable.
  const bracket = /\bstyles\[\s*["'`]([^"'`]+)["'`]\s*\]/g;
  while ((m = bracket.exec(sourceText)) !== null) found.add(m[1]);
  return [...found].sort(byCodePoint);
}
