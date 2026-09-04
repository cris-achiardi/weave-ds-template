#!/usr/bin/env node
/**
 * `pnpm verify:contract` — the contract gate.
 *
 * Everything it checks is something whose breach produces NO build error and NO failing test: a
 * contract can promise an axis the code does not expose, name a part that never renders, or style
 * a state nothing can enter, and every other tool stays green.
 *
 * WHY PARITY IS THE HEART OF IT — see contracts/README.md.
 * The contract SPECIFIES the axes and their values, because a file that omits them cannot be built
 * from. That duplication is safe only because of what this script does: it asserts the two are
 * equal. Remove these parity checks and the contract silently becomes a stale second opinion —
 * one that still looks authoritative.
 *
 * FAILS
 *   shape      contract or binding does not validate against its schema
 *   identity   name vs directory vs export vs barrel vs binding
 *   parity     contract and implementation disagree about axes, values or defaults
 *   invented   contract names a part / state / slot / axis value the implementation lacks
 *   phantom    contract declares a part the TSX never renders
 *   status     a `deprecated` level whose replacedBy does not exist
 *
 * REPORTS, NEVER FAILS
 *   a component with no contract          (uncontracted is a reportable state, not a failure)
 *   a rendered part the contract omits
 *   extraction warnings
 *
 * That split is not softness: a gate that failed on every uncontracted component on day one would
 * be switched off within the week, and a switched-off gate protects nothing.
 */

import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import Ajv from 'ajv/dist/2020.js';
import { loadProfile } from '@ds/platform-web';
import {
  REPO_ROOT,
  listContracts,
  listBindings,
  contractPaths,
  readJson,
  walkAnatomy,
  byCodePoint,
} from './lib.mjs';

// What the WEB PLATFORM actually provides, read from the profile rather than from a second copy
// kept here. A state a contract calls `intrinsic` is a claim that the platform tracks it, and the
// profile is now the only place that list lives.
const WEB = loadProfile();
const PLATFORM_STATES = Object.keys(WEB.states).filter((k) => !k.startsWith('_'));

const failures = [];
const reports = [];
const fail = (component, cls, detail) => failures.push({ component, cls, detail });
const report = (component, detail) => reports.push({ component, detail });

function main() {
  const ajv = new Ajv({ allErrors: true, strict: false });

  // Compiling both schemas is itself a check, and the only one that can fail with zero contracts.
  // A malformed schema would otherwise sit undetected until the first contract was written.
  let validateContract, validateBinding;
  try {
    validateContract = ajv.compile(
      readJson(join(REPO_ROOT, 'packages/contracts/schema/component.schema.json')),
    );
    validateBinding = ajv.compile(
      readJson(join(REPO_ROOT, 'packages/react/bindings/binding.schema.json')),
    );
  } catch (err) {
    console.error(`a schema does not compile: ${err.message}`);
    process.exit(1);
  }

  const contracts = listContracts();
  for (const name of contracts) check(name, validateContract, validateBinding);

  // A binding naming a contract that does not exist: the other orphan, and the worse one. It is a
  // translation of nothing, and until this check existed no tool in the repo would have said so.
  for (const b of listBindings()) {
    if (!contracts.includes(b)) {
      fail(b, 'orphan', `${b}.react.json exists but there is no ${b}.contract.json to bind.`);
    }
  }

  const bound = contracts.filter((n) => existsSync(contractPaths(n).binding));
  console.log(`contracts: ${bound.length}/${contracts.length} bound to a React binding.`);
  if (contracts.length === 0) {
    console.log('No contracts exist yet — the intended starting state, not a gap.');
  }

  const unbound = contracts.filter((n) => !existsSync(contractPaths(n).binding));
  if (unbound.length) console.log(`\nUnbound (reported, not failed): ${unbound.join(', ')}`);

  if (reports.length) {
    console.log('\nReports — not failures:');
    for (const r of reports.sort((a, b) =>
      byCodePoint(a.component + a.detail, b.component + b.detail),
    )) {
      console.log(`  ${r.component}: ${r.detail}`);
    }
  }

  if (failures.length) {
    console.error(`\n${failures.length} contract failure(s):\n`);
    for (const f of failures.sort((a, b) =>
      byCodePoint(a.component + a.cls, b.component + b.cls),
    )) {
      console.error(`  [${f.cls}] ${f.component}: ${f.detail}`);
    }
    process.exit(1);
  }

  console.log('\nverify:contract OK.');
}

/**
 * What is checkable about ONE contract, now that no hand-written source exists to compare against.
 *
 * Every check below is contract-to-contract or contract-to-schema, and that is the change in KIND
 * rather than in detail. When a component was authored by hand the interesting disagreement was
 * between the contract and the code; the code is now DERIVED from the contract, so that comparison
 * is circular and proves nothing.
 */
function check(name, validateContract, validateBinding) {
  const paths = contractPaths(name);

  const contract = readJson(paths.contract);
  if (!validateContract(contract)) {
    for (const e of validateContract.errors ?? [])
      fail(name, 'shape', `contract ${e.instancePath || '/'} ${e.message}`);
    return; // a contract that does not validate cannot be reasoned about further
  }
  if (contract.component !== name) {
    fail(name, 'identity', `contract declares component "${contract.component}".`);
  }
  if (!existsSync(paths.changelog)) {
    report(name, 'no CHANGELOG.md — the contract is the versioned artifact and has no history.');
  }

  // --- the binding -----------------------------------------------------------------------
  if (!existsSync(paths.binding)) {
    report(name, `no ${name}.react.json — this backend cannot compile it.`);
  } else {
    const binding = readJson(paths.binding);
    if (!validateBinding(binding)) {
      for (const e of validateBinding.errors ?? [])
        fail(name, 'shape', `binding ${e.instancePath || '/'} ${e.message}`);
    } else if (binding.component !== name) {
      fail(name, 'identity', `binding declares component "${binding.component}".`);
    }

    // ADR 0002 flagged this as unchecked, and it has been ever since: `binding.contract` is the
    // ONLY link between the two packages, and a binding pointing at a contract that moved or was
    // deleted left every gate green.
    if (!binding.contract) {
      fail(name, 'pointer', 'binding declares no `contract` path.');
    } else {
      const target = resolve(dirname(paths.binding), binding.contract);
      if (!existsSync(target)) {
        fail(
          name,
          'pointer',
          `binding.contract points at ${binding.contract}, which does not exist.`,
        );
      } else if (target !== resolve(paths.contract)) {
        fail(
          name,
          'pointer',
          `binding.contract points at ${binding.contract}, not its own contract.`,
        );
      }
    }
  }

  // --- agreement BETWEEN contracts ---------------------------------------------------------
  //
  // A member contract is not self-contained: it names an ancestor, and the ancestor names which
  // members it admits. The emitter checks this, but only for the one component being emitted, so a
  // disagreement introduced without re-emitting that component went unnoticed.
  if (contract.member) {
    const ancestorPath = contractPaths(contract.member.of).contract;
    if (!existsSync(ancestorPath)) {
      fail(name, 'member', `member.of names "${contract.member.of}", which has no contract.`);
    } else {
      const ancestor = readJson(ancestorPath);
      const declared = ancestor.collection?.items;
      const admitted = Array.isArray(declared) ? declared : declared ? [declared] : [];
      if (!admitted.includes(name)) {
        fail(
          name,
          'member',
          `says it is a member of ${contract.member.of}, whose collection.items admits ` +
            `${admitted.length ? admitted.join(', ') : '(nothing)'}.`,
        );
      }
    }
  }

  // A cross-boundary reference names a sibling MEMBER kind, and the emitted id is built from it.
  // If that contract does not exist the reference can never resolve in any rendered page.
  for (const [, node] of walkAnatomy(contract.anatomy?.root)) {
    const refs = [node.controls, node.namedBy].filter((r) => r && typeof r === 'object');
    for (const ref of refs) {
      if (!contract.member) {
        fail(name, 'reference', `references member "${ref.member}" but is not itself a member.`);
      } else if (!existsSync(contractPaths(ref.member).contract)) {
        fail(name, 'reference', `references member "${ref.member}", which has no contract.`);
      }
    }
  }

  // --- an intrinsic state must be one the platform actually provides -----------------------
  //
  // `kind: "intrinsic"` says the PLATFORM tracks this state — the component does not have to, and
  // will not. So a name the platform does not know is a state nothing will ever set: it reaches no
  // pseudo-class, and the emitter's state loop only routes `shared` and `consumer` states, so an
  // internal one reaches no attribute either. It goes nowhere at all, silently.
  //
  // This check needs NO source, which is why dropping it during the move to contract-only checking
  // was a mistake rather than a consequence. Its whitelist was left behind as an orphaned
  // constant, and that dead code was the only visible symptom.
  for (const [state, def] of Object.entries(contract.states ?? {})) {
    if (def.kind === 'intrinsic' && !PLATFORM_STATES.includes(state)) {
      fail(
        name,
        'invented',
        `state "${state}" is declared intrinsic, but no platform state has that name. ` +
          `@ds/platform-web knows: ${PLATFORM_STATES.join(', ')}. ` +
          `An authored state has to be tracked by the implementation instead.`,
      );
    }
  }

  // --- a dismissal must write a state something outside can hear -----------------------------
  //
  // The schema documents this and only the EMITTER enforced it, as a throw. Nothing in `pnpm verify`
  // or in CI runs the emitter over the contracts, so a contract naming an internal state passed
  // every gate and was simply unemittable.
  if (contract.dismisses) {
    const st = contract.states?.[contract.dismisses.state];
    if (!st) {
      fail(
        name,
        'invented',
        `dismisses.state names "${contract.dismisses.state}", which is not a declared state.`,
      );
    } else if (st.control !== 'shared') {
      fail(
        name,
        'invented',
        `dismisses.state names "${contract.dismisses.state}", which is \`control: ${st.control}\`. ` +
          `A dismissal writes it, so something outside has to be able to hear that.`,
      );
    }
  }

  if (contract.status?.level === 'deprecated') {
    const target = contract.status.replacedBy;
    if (target && !existsSync(contractPaths(target).contract)) {
      fail(name, 'status', `replacedBy names "${target}", which has no contract.`);
    }
  }

  // --- a declared behaviour commits to conformance cases ------------------------------------
  const CONFORMANCE = join(REPO_ROOT, 'packages/contracts/conformance');
  const commitments = [
    [contract.collection?.navigation, 'linear-navigation.json'],
    [contract.range, 'range-stepping.json'],
    [contract.dismisses, 'dismissal.json'],
  ];
  for (const [declared, file] of commitments) {
    if (declared && !existsSync(join(CONFORMANCE, file))) {
      fail(name, 'conformance', `declares a behaviour whose cases are missing: ${file}.`);
    }
  }
}

main();
