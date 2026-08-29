// Public barrel for @ds/react.
//
// EMPTY ON PURPOSE. This template ships with no components — they are built against an accepted
// decision, not scaffolded in advance. See docs/ADR/README.md and .claude/skills/ds-component.

// The token layer, pulled in first so it lands ahead of every component rule in the emitted
// stylesheet. Component CSS Modules read `var(--ds-*)`; a custom property that is never declared
// resolves to nothing and the rule is simply dropped, with no error anywhere. Importing the
// tokens here makes `@ds/react/styles.css` self-sufficient, so that failure cannot happen by
// forgetting a second import. See docs/ADR/0002-figma-variables-are-transcribed-to-dtcg.md.
import '@ds/tokens/css';
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

export { Icon, type IconProps } from './components/Icon/Icon';
export { glyphNames, type GlyphName } from './components/Icon/glyphs';
export { TabItem, type TabItemProps } from './components/TabItem/TabItem';
export { TabPanel, type TabPanelProps } from './components/TabPanel/TabPanel';
export { Tabs, type TabsProps } from './components/Tabs/Tabs';
