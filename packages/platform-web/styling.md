# Web styling conventions

These are web output conventions, independent of framework bindings and agnostic component facts.
The prefix is `dataPrefix` in `ds.config.json`. Part names and axes come from the contract.

| Fact                 | Light DOM (React, Vue, Angular)                  | Shadow DOM (WC)                                 |
| -------------------- | ------------------------------------------------ | ----------------------------------------------- |
| Component scope      | `data-<prefix>-component="<Name>"` on the root   | Custom element's shadow root                    |
| Named part           | `data-<prefix>-part="<part>"` on each named node | `part="<part>"` on the inner node               |
| Axis value           | `data-<prefix>-<axis>="<value>"` on the root     | `<axis>="<value>"` on the host                  |
| Semantic/visual root | Root element                                     | Inner `part="root"`; host is a separate wrapper |

Emit every axis's effective value, including its default. An absent axis attribute must not hide
the default from CSS. Names and values use the contract spelling; there are no framework aliases
for these styling handles. Scope light-DOM part selectors by component to avoid matching other
components' identically named parts.

Inside a WC theme use `[part="root"]` and `[part="label"]`; combine host state with a part using
`:host([hierarchy="primary"]) [part="root"]`. Outside the shadow root consumers can use
`<tag>::part(label)`. A host style and an inner-root style are different targets.

State is separate from axes: use native state/pseudo-classes or role-valid ARIA as described by
`profile.json`; only states without such a channel use the backend's documented data-state fallback.
Custom properties inherit across shadow boundaries; selectors and string ID references do not.

This specifies the existing convention. Adopting the native `part` spelling in light DOM would
not add shadow scoping or enable `::part`, so it would change consumer selectors without removing
the need for a component scope. Keep both grammars explicit.

Navigation collections in WC retain a block host box for cross-browser Tab traversal. Other
WC hosts normally use `display: contents`. The semantic root remains the paint target.
