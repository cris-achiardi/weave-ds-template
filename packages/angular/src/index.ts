// @ds/angular ships NO components, exactly as @ds/react and @ds/vue ship none.
//
// Component source is generated from a contract into a consumer's own repository — see
// packages/angular/src/emit/README.md — so there is nothing to re-export here. The runtime this
// package does ship is the behaviour primitives, and they are a subpath: `@ds/angular/behavior`.
//
// This file exists so the package has a main entry that resolves. An empty barrel is an honest
// answer to "what does the library export"; a barrel that re-exported the primitives would make
// the subpath look optional, and emitted code imports the subpath.
export {};
