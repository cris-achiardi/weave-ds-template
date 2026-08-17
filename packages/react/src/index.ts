// Public barrel for @ds/react.
//
// EMPTY ON PURPOSE. This template ships with no components — they are built against an accepted
// decision, not scaffolded in advance. See docs/ADR/README.md and .claude/skills/ds-component.
//
// A component is not part of the library until it is re-exported here. `pnpm verify:contract`
// asserts that, because an unexported component is invisible to every consumer and nothing in
// the type system or the build complains about it.
//
// The shape each entry takes:
//
//   export { Button, type ButtonProps } from './components/Button/Button';
//
// Keep this list alphabetical.

export {};
