/**
 * Read variant axes, their value sets, and their DEFAULTS out of a `cva()` call.
 *
 * This is syntax only — `ts.createSourceFile`, no type checker, no program, no build. That is
 * the point: it is the one part of extraction with no version risk. The same read produces
 * byte-identical output under TypeScript 5.9 and 6.x, whereas the type-checker-backed path
 * (react-docgen-typescript) silently stops classifying variant props as enums under TS 6.
 *
 * It also recovers something docgen structurally cannot: `defaultVariants` is a RUNTIME object
 * literal, not part of the type, so no type-level tool can see it. Every variant default in the
 * library comes from here.
 *
 * Shape returned:
 *   { buttonVariants: { hierarchy: { values: ['primary','secondary'], default: 'primary' } } }
 */

import ts from 'typescript';

/** Fixed code-point comparator. Never localeCompare — it makes output machine-dependent. */
const byCodePoint = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/** The declared name of an object-literal member, whether written bare, quoted or computed. */
function memberName(node) {
  const n = node.name;
  if (!n) return null;
  if (ts.isIdentifier(n) || ts.isPrivateIdentifier(n)) return n.text;
  if (ts.isStringLiteral(n) || ts.isNumericLiteral(n)) return n.text;
  return null;
}

/** A string-ish literal's text, or null if it is not one. */
function literalText(node) {
  if (!node) return null;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isNumericLiteral(node)) return node.text;
  if (node.kind === ts.SyntaxKind.TrueKeyword) return 'true';
  if (node.kind === ts.SyntaxKind.FalseKeyword) return 'false';
  return null;
}

/** Find the object literal passed as a named property of an object literal. */
function propOf(objectLiteral, name) {
  if (!objectLiteral || !ts.isObjectLiteralExpression(objectLiteral)) return null;
  for (const member of objectLiteral.properties) {
    if (ts.isPropertyAssignment(member) && memberName(member) === name) return member.initializer;
  }
  return null;
}

/**
 * Extract every `const x = cva(base, { variants, defaultVariants })` in a source file.
 * @param {string} sourceText
 * @param {string} fileName  used only for TS diagnostics/positions
 */
export function extractCvaAxes(sourceText, fileName = 'component.tsx') {
  const sf = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const out = {};

  const visit = (node) => {
    if (
      ts.isVariableDeclaration(node) &&
      node.initializer &&
      ts.isCallExpression(node.initializer)
    ) {
      const call = node.initializer;
      const callee = ts.isIdentifier(call.expression) ? call.expression.text : null;

      if (callee === 'cva' && ts.isIdentifier(node.name)) {
        // cva(base, config) — the config is the second argument; cva(config) is also legal.
        const config = call.arguments.find((a) => ts.isObjectLiteralExpression(a));
        const variants = propOf(config, 'variants');
        const defaults = propOf(config, 'defaultVariants');

        if (variants && ts.isObjectLiteralExpression(variants)) {
          const axes = {};

          for (const axis of variants.properties) {
            const axisName = memberName(axis);
            if (!axisName || !ts.isPropertyAssignment(axis)) continue;
            if (!ts.isObjectLiteralExpression(axis.initializer)) continue;

            const values = axis.initializer.properties
              .map((v) => memberName(v))
              .filter((v) => v !== null)
              .sort(byCodePoint);

            axes[axisName] = { values, default: null };
          }

          if (defaults && ts.isObjectLiteralExpression(defaults)) {
            for (const d of defaults.properties) {
              const name = memberName(d);
              if (!name || !ts.isPropertyAssignment(d)) continue;
              if (axes[name]) axes[name].default = literalText(d.initializer);
            }
          }

          out[node.name.text] = Object.fromEntries(
            Object.keys(axes)
              .sort(byCodePoint)
              .map((k) => [k, axes[k]]),
          );
        }
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sf);
  return out;
}

/**
 * Flatten every cva call in a file into one axis map.
 *
 * A component with two cva calls that both define `size` with different value sets is a real
 * defect — the same prop name meaning two things — so it is reported rather than silently
 * merged. The caller decides what to do with `conflicts`.
 */
export function flattenAxes(cvaCalls) {
  const axes = {};
  const conflicts = [];

  for (const varName of Object.keys(cvaCalls).sort(byCodePoint)) {
    for (const [axisName, axis] of Object.entries(cvaCalls[varName])) {
      const existing = axes[axisName];
      if (!existing) {
        axes[axisName] = { ...axis, from: varName };
        continue;
      }
      const same = existing.values.join('|') === axis.values.join('|');
      if (!same) {
        conflicts.push({
          axis: axisName,
          detail: `defined twice with different value sets: ${existing.from} has [${existing.values.join(', ')}], ${varName} has [${axis.values.join(', ')}]`,
        });
      }
    }
  }

  return { axes, conflicts };
}
