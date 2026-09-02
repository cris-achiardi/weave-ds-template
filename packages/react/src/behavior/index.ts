// Public barrel for @ds/react/behavior — the interaction primitives emitted components import.
//
// This is the ONE place this package ships runtime JavaScript, and the one place the "you own your
// generated component" rule bends. The reasoning, including the honest objection to it, is in
// ./README.md. In short: what you can see, you own — markup, structure, theme. What must be
// correct, you depend on — focus, keyboard, selection.
//
// A primitive lands here only when a contract can declare it. Each one corresponds to a named
// entry in the contract layer's behaviour vocabulary, and each maps to a behaviour the W3C ARIA
// APG defines normatively, so the specification work is citation rather than invention.
//
// Keep this list alphabetical.

export {};
