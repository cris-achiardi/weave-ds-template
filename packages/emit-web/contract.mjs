// Reading a contract, and the three string shapes every backend needs.
//
// Nothing here knows what a framework is, and nothing here emits anything. It is the half of an
// emitter that is the same in React, Vue and Angular because it is about the CONTRACT rather than
// about the output — which is why it was identical in all three and why it is here now.

import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import Ajv from 'ajv/dist/2020.js';
import { elementFor } from '@ds/platform-web';

export const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));

/** `icon-start` -> `iconStart`. */
export const camel = (s) => s.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());

/** `icon-start` -> `IconStart`. */
export const pascal = (s) => {
  const c = camel(s);
  return c.charAt(0).toUpperCase() + c.slice(1);
};

/** `iconStart` -> `icon-start`. The inverse of `camel`, for attribute names. */
export const kebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

/**
 * Every anatomy node, depth first, with the key it is declared under.
 *
 * The key and the `part` are different strings and both matter: the key is what a contract
 * REFERENCES (`controls: "panel"`), the part is what reaches the DOM (`data-ds-part="panel"`).
 * They usually match and a contract is free to make them differ.
 */
export function partsOf(node, out = [], key = 'root') {
  out.push({ key, part: node.part, node });
  for (const [k, child] of Object.entries(node.parts ?? {})) partsOf(child, out, k);
  return out;
}

/**
 * Which component names a collection admits as members.
 *
 * `collection.items` is a string when there is one kind and a list when there are several. Every
 * reader has to normalise, so it happens once — a single-kind collection threw in two of the three
 * emitters before this was shared.
 */
export function admittedBy(ancestor, contractsDir) {
  const declared = readJson(join(contractsDir, 'components', ancestor, `${ancestor}.contract.json`))
    .collection?.items;
  return Array.isArray(declared) ? declared : declared ? [declared] : [];
}

/**
 * Load a contract and its binding, validate both, and check the pointer between them resolves.
 *
 * That last check is the gap ADR 0002 named: `verify-contract.mjs` reads a binding's `contract`
 * field and never checks it resolves, so a binding describing a contract that moved leaves every
 * gate green. Every emitter does it here instead, once.
 *
 * @param {object} o
 * @param {string} o.name           component name
 * @param {string} o.contractsDir   absolute path to packages/contracts
 * @param {string} o.bindingsDir    absolute path to this backend's bindings directory
 * @param {string} o.suffix         e.g. `.react.json`
 */
export function loadPair({ name, contractsDir, bindingsDir, suffix }) {
  const contractPath = join(contractsDir, 'components', name, `${name}.contract.json`);
  const bindingPath = join(bindingsDir, `${name}${suffix}`);
  if (!existsSync(contractPath)) throw new Error(`no contract at ${contractPath}`);
  if (!existsSync(bindingPath)) throw new Error(`no binding at ${bindingPath}`);

  const contract = readJson(contractPath);
  const binding = readJson(bindingPath);
  const ajv = new Ajv({ allErrors: true, strict: false });

  const okContract = ajv.compile(readJson(join(contractsDir, 'schema/component.schema.json')));
  if (!okContract(contract)) {
    throw new Error(
      `contract is invalid:\n` +
        okContract.errors.map((e) => `  ${e.instancePath || '(root)'} ${e.message}`).join('\n'),
    );
  }
  formFor(contract);
  const okBinding = ajv.compile(readJson(join(bindingsDir, 'binding.schema.json')));
  if (!okBinding(binding)) {
    throw new Error(
      `binding is invalid:\n` +
        okBinding.errors.map((e) => `  ${e.instancePath || '(root)'} ${e.message}`).join('\n'),
    );
  }
  const target = resolve(bindingsDir, binding.contract);
  if (resolve(contractPath) !== target) {
    throw new Error(`binding.contract points at ${target}, not ${contractPath}`);
  }
  return { contract, binding: { ...binding, element: elementFor(name) } };
}

/**
 * A member contract is NOT self-contained: whether its selection is a set or a single value lives
 * in the ANCESTOR's contract, so a member cannot be compiled from its own contract alone.
 *
 * Three backends reported this identically as an assumption before it was shared, which is what
 * promotes it from "an emitter had to open another file" to a property of the contract set.
 * Returned rather than logged, so each emitter records it in its own voice.
 */
export function memberFacts(name, member, contractsDir) {
  const ancestorPath = join(contractsDir, 'components', member.of, `${member.of}.contract.json`);
  if (!existsSync(ancestorPath)) {
    throw new Error(
      `${name} declares member.of "${member.of}" but no contract exists at ${ancestorPath}`,
    );
  }
  const ancestor = readJson(ancestorPath);
  const admitted = admittedBy(member.of, contractsDir);
  if (!admitted.includes(name)) {
    throw new Error(
      `${name} says it is a member of ${member.of}, but ${member.of}.collection.items admits ` +
        `${admitted.length ? admitted.join(', ') : '(nothing)'} — the two contracts disagree.`,
    );
  }
  return {
    many: ancestor.collection.selection.cardinality === 'many',
    navigation: ancestor.collection.navigation ?? null,
  };
}

/**
 * Whether any SIBLING member of the same collection points at this one.
 *
 * A member whose root is referenced from a sibling needs an id even though it references nothing
 * itself, and nothing in its own contract can know that — the flag comes from the ancestor's
 * roster. A tab and its panel are the case.
 */
export function referencedByASibling(name, member, contractsDir) {
  return Boolean(
    member &&
    admittedBy(member.of, contractsDir)
      .filter((sib) => sib !== name)
      .some((sib) => {
        const f = join(contractsDir, 'components', sib, `${sib}.contract.json`);
        if (!existsSync(f)) return false;
        return JSON.stringify(readJson(f)).includes(`"member": "${name}"`);
      }),
  );
}

/** Validate form sources independently of a backend's public prop vocabulary. */
export function formFor(contract) {
  const form = contract.form;
  if (!form) return null;
  const state = contract.states?.[form.source];
  const selection = form.source === 'selection' && contract.collection?.selection;
  if (selection) {
    if (
      selection.control !== 'shared' ||
      selection.cardinality === 'many' ||
      form.encoding !== 'string'
    )
      throw new Error(`${contract.component}.form requires a shared single selection`);
  } else {
    if (!state || state.control !== 'shared')
      throw new Error(`${contract.component}.form source must name shared state`);
    if (form.encoding === 'checked') {
      const allowed = state.values ?? (state.valueType ? [] : [true, false]);
      if (!allowed.includes(form.checkedValue))
        throw new Error(`${contract.component}.form checkedValue is outside its source domain`);
    } else if (state.valueType !== form.encoding)
      throw new Error(`${contract.component}.form encoding must match its source valueType`);
  }
  return { ...form, property: selection ? 'value' : camel(form.source) };
}
