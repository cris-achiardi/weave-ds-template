# wc bindings

Each `<Name>.wc.json` identifies its component, contract, and framework, plus the optional
backend-specific fields described by [`binding.schema.json`](./binding.schema.json).

The semantic root element lives in
[Shared element map](../../platform-web/components.json), shared by every web backend.
`loadPair` resolves it after validating the binding; do not reintroduce an `element` field here.
For WC this is the inner semantic root. The host tag is derived from component identity and branding.
For Angular it determines the element to which the component selector attaches.

Framework additions, such as React ref/class targets or WC focus delegation, remain in bindings.
`pnpm verify:parity` validates every binding schema and contract pointer. The styling conventions
are specified in [Web styling conventions](../../platform-web/styling.md).
