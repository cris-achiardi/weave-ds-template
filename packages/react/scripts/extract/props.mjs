/**
 * The derivable half of a component's description: props, types, required-ness, defaults and
 * JSDoc, read from the TypeScript source on demand.
 *
 * There is no committed manifest anywhere in this repo. That is the one deliberate departure
 * from the system this design is drawn from, and it is why `pnpm contract Button` works on a
 * fresh clone with no build step.
 *
 * WHAT THIS OWNS vs WHAT cva.mjs OWNS
 * -----------------------------------
 * docgen follows imports and `extends` across files, which pure syntax cannot do — that is the
 * whole reason it is here, since `interface ButtonProps extends ButtonHTMLAttributes<...>` is in
 * every component. It does NOT know variant defaults, because `defaultVariants` is a runtime
 * object literal that no type-level tool can see. So:
 *
 *   cva.mjs    -> variant axis names, value sets, DEFAULTS   (authority)
 *   props.mjs  -> everything else, plus prose                (authority)
 *
 * MEASURED FRAGILITY, and why the warnings below exist
 * ----------------------------------------------------
 * Under typescript@6.x, docgen stops classifying `VariantProps<typeof x>`-derived props as
 * enums: `type.value` comes back empty and only the union string in `type.name` survives. Its
 * peer range is '>= 4.3.x', so nothing warns you. `typescript` is therefore tilde-pinned in the
 * root package.json. The degraded-union parse below recovers the values anyway and flags
 * `degraded: true`, so a bad bump is VISIBLE rather than silently thinning every answer.
 *
 * A generic wrapper around a variant type (`ResponsiveValue<Size>`) also collapses to a bare
 * name with no values. Do not write one — see src/components/README.md §2.
 */

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const byCodePoint = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/** `"a" | "b" | null` -> ['a','b']. Used only when docgen's own value array came back empty. */
const UNION_OF_LITERALS = /^"[^"]*"(\s*\|\s*(?:"[^"]*"|null|undefined))*$/;
function parseUnionString(name) {
  if (!UNION_OF_LITERALS.test(name.trim())) return null;
  const parts = name
    .split('|')
    .map((s) => s.trim())
    .filter((s) => s !== 'null' && s !== 'undefined')
    .map((s) => (s.startsWith('"') && s.endsWith('"') ? s.slice(1, -1) : null));
  return parts.every((p) => p !== null) ? parts.sort(byCodePoint) : null;
}

/** True when a prop's type can hold rendered content — the check that makes `slots` honest. */
function acceptsNode(typeName) {
  return /\b(ReactNode|ReactElement|JSX\.Element|ReactChild|ComponentType)\b/.test(typeName);
}

/**
 * @param {string} filePath absolute path to the component's .tsx
 * @returns {{props: object, warnings: string[], degraded: boolean}}
 */
export function extractProps(filePath) {
  let docgen;
  try {
    docgen = require('react-docgen-typescript');
  } catch {
    return {
      props: {},
      warnings: ['react-docgen-typescript is not installed — prop extraction was skipped.'],
      degraded: true,
    };
  }

  const parser = docgen.withDefaultConfig({
    savePropValueAsString: true,
    shouldExtractLiteralValuesFromEnum: true,
    shouldRemoveUndefinedFromOptional: true,
    // LOAD-BEARING, not tuning. Without it a single button returns ~285 props — the whole of
    // ButtonHTMLAttributes — and every downstream artifact becomes unreadable noise.
    propFilter: (prop) => !/node_modules/.test(prop.parent?.fileName ?? ''),
  });

  let parsed;
  try {
    parsed = parser.parse(filePath);
  } catch (err) {
    return {
      props: {},
      warnings: [`react-docgen-typescript threw while parsing: ${err.message}`],
      degraded: true,
    };
  }

  if (!parsed.length) {
    return {
      props: {},
      warnings: ['No component declaration was found in this file.'],
      degraded: true,
    };
  }

  // A file may declare more than one component (a private subcomponent). The exported one that
  // matches the file name is the subject; anything else is not this contract's business.
  const wanted = filePath
    .split(/[\\/]/)
    .pop()
    .replace(/\.tsx?$/, '');
  const subject = parsed.find((c) => c.displayName === wanted) ?? parsed[0];

  const props = {};
  const warnings = [];
  let degraded = false;

  for (const name of Object.keys(subject.props).sort(byCodePoint)) {
    const p = subject.props[name];
    const typeName = p.type?.name ?? 'unknown';
    let values = Array.isArray(p.type?.value)
      ? p.type.value.map((v) => String(v.value).replace(/^"|"$/g, '')).sort(byCodePoint)
      : null;

    // The TS 6 degradation path: values are gone from the array but survive in the type string.
    if ((!values || values.length === 0) && p.type?.name) {
      const recovered = parseUnionString(p.type.name);
      if (recovered) {
        values = recovered;
        degraded = true;
        warnings.push(
          `${name}: literal values were recovered from the type string, not from the enum array. ` +
            `This is the known typescript@6 regression in react-docgen-typescript — check the ` +
            `typescript version against the tilde pin in the root package.json.`,
        );
      }
    }

    if (p.type?.name === 'enum' && (!values || values.length === 0)) {
      warnings.push(`${name}: classified as an enum but no values resolved.`);
    }
    if (/^[A-Z]\w*<.+>$/.test(typeName) && !acceptsNode(typeName)) {
      warnings.push(
        `${name}: type \`${typeName}\` is a generic wrapper, so its value set could not be ` +
          `resolved. A variant axis must be a cva axis or a bare string-literal union — see ` +
          `src/components/README.md §2.`,
      );
    }

    props[name] = {
      type: typeName,
      values,
      required: Boolean(p.required),
      // Only destructuring defaults land here. Variant defaults come from cva.mjs.
      default: p.defaultValue?.value ?? null,
      description: (p.description ?? '').trim() || null,
      acceptsNode: acceptsNode(typeName),
      declaredIn: p.parent?.name ?? null,
    };
  }

  return {
    props,
    warnings: warnings.sort(byCodePoint),
    degraded,
    displayName: subject.displayName,
  };
}
