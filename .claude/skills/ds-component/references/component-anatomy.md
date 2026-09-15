# Anatomy and generated ownership

Three invariants survive the old source-authoring workflow:

1. Every named part has a stable styling handle. Light-DOM backends scope part attributes by
   component; WC uses shadow `part` attributes. The emitter owns the mapping. A missing handle
   makes a declared paint channel unreachable.
2. Axis values and defaults live in the contract. The generated API and rendered attributes
   must expose them, including defaults, or consumer styles cannot select a variant.
3. Enumerated values remain literal sets in the specification. Do not hide them inside framework
   generics or infer them from emitted TypeScript; the glossary reads the contract's literals.

The emitter writes a component folder containing source, a barrel where applicable,
`<Name>.structure.css`, and `<Name>.theme.css`. Source and structure are regenerated.
The theme is created only when absent and belongs to the consumer thereafter.

Use `layout` for the component's structural mechanism, including supported state-dependent layout.
Use `paints` for consumer-supplied visual channels. Read the actual schema for supported shapes.

Before changing generation, save a recognizable theme edit in an isolated output directory,
regenerate, and verify its bytes survive. Generated markup must still typecheck in its consumer.
