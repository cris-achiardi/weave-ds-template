# Authoring the contract

The authored specification lives in `packages/contracts/components/<Name>/`, with a changelog.
The backend binding lives in `packages/<backend>/bindings/`. The contract schema and authoring
README are authoritative; inspect the schema before adding a field.

Start with `intent`: purpose, observable behavior, and cases this component does not serve.
Then derive the anatomy and API from that purpose and the governing ADR or proposal.

- `axes` declares closed values and defaults. Use the canonical vocabulary; do not infer it from CSS.
- `states` declares intrinsic versus authored state and, where applicable, who may set it.
  Backend surface readers derive React callbacks, Vue models, Angular models, or WC events.
- `anatomy` declares named parts, content, relationships, and supported conditional structure.
- `layout` carries structural declarations and constraints supported by the schema; paint channels
  carry visual choices. Do not move a color into layout to evade the unstyled model.
- `composition`, `collection`, and `member` express composition rather than duplicating local state.
- Accessibility promises require evidence. An unknown role or keyboard model is a finding to resolve.

`pnpm verify:contract` validates specification shape and React bindings; `pnpm verify:parity`
checks the backend boundary. Neither independently proves a generated DOM meets the contract.
Use browser assertions for focus, accessible relationships, lifecycle, and interaction behavior.

Every contract change gets a changelog entry, including whether regenerated public APIs change.
