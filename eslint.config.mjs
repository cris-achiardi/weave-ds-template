/**
 * Deliberately narrow: this config finds DEAD CODE and nothing else.
 *
 * WHY IT EXISTS, AND WHY IT IS THIS SMALL
 * ---------------------------------------
 * There was no linter here at all, and `.mjs` is not typechecked by anything — so an unused import
 * or an orphaned constant was invisible to every gate in the repo. That is exactly the
 * "breach produces no build error" category `CLAUDE.md` is written about, and it let three defects
 * through a commit that had already been reviewed by hand:
 *
 *   - five extraction readers imported into `verify-contract.mjs` and never called
 *   - `isExported` and `byCodePoint` imported into `contract.mjs` and never called
 *   - an orphaned `INTRINSIC` constant — and THAT one mattered, because the constant was orphaned
 *     by a check that had been dropped from the same rewrite. The dead code was the only visible
 *     symptom of a lost assertion.
 *
 * The repo's other rule is why it stops here: **a gate that fails on everything on day one gets
 * switched off, and a switched-off gate protects nothing.** A full recommended ruleset would light
 * up across code nobody is about to touch. This one has a known, finite baseline — the findings
 * above — so it can be a gate immediately rather than a report that nobody reads.
 *
 * Adding a rule to this file is a deliberate act. Do it when a defect gets through that the rule
 * would have caught, and say which one in the commit.
 */

export default [
  {
    // Everything the repo's own gates cannot see. TypeScript under `packages/react/src` and
    // `apps/sandbox/src` is already covered by `pnpm typecheck` with `--noUnusedLocals`.
    files: ['**/*.mjs', '**/*.js'],
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      'apps/storybook/**',
      // A skill's asset is a PASTE-IN PRELUDE, not a module. `diagram-kit.js` is a library of
      // helpers a skill copies into a `figma_execute` call one at a time, so every function in it
      // being unused within the file is the entire point of the file. Linting it produced 21 of the
      // first 35 findings and every one was a false positive — and a gate that cries wolf 21 times
      // is the gate that gets switched off.
      '.claude/skills/**/assets/**',
    ],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
    },
    linterOptions: {
      // An unused disable comment is itself dead code, and this file exists to find dead code.
      reportUnusedDisableDirectives: 'error',
    },
    rules: {
      'no-unused-vars': [
        'error',
        {
          // A caught error nobody inspects is idiomatic, and `catch {}` is already used where the
          // failure is genuinely nothing to act on — see the pointer-capture guard in
          // useRangeControl.
          caughtErrors: 'none',
          // `(_, i) => …` is a normal way to say "this argument is not mine to use".
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
];
