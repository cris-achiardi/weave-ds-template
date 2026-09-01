// Public barrel for @ds/react.
//
// EMPTY ON PURPOSE, and for a different reason than it used to be.
//
// This package no longer ships components. A component is generated into a consumer's own
// repository from a contract in @ds/contracts, and is theirs from that moment on. There is
// nothing here to re-export and there never will be.
//
// What this barrel will eventually export is the BEHAVIOUR RUNTIME: the interaction primitives
// that emitted components import rather than copy — focus management, keyboard navigation,
// selection. See ./behavior/README.md for why those are a dependency when everything else is
// handed over.
//
// Nothing is implemented yet. The behaviour vocabulary that these primitives implement does not
// exist in the schema either, so there is nothing to build against.
//
// A `./behavior` export subpath is deliberately NOT declared in package.json until there is a
// built file behind it: an exports entry pointing at nothing is a runtime failure that no gate
// here would catch.

export {};
