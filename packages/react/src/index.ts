// Public barrel for @ds/react.
//
// EMPTY ON PURPOSE, and for a different reason than it used to be.
//
// This package no longer ships components. A component is generated into a consumer's own
// repository from a contract in @ds/contracts, and is theirs from that moment on. There is
// nothing here to re-export and there never will be.
//
// The BEHAVIOUR RUNTIME does not live here. It has its own entry point, `@ds/react/behavior`,
// so a consumer importing a keyboard primitive does not also resolve this barrel. See
// ./behavior/README.md for why those primitives are a dependency when everything else is handed
// over to the consumer.
//
// This barrel therefore exports nothing, and is kept only because it is the package's `.` entry
// and something has to be there.

export {};
