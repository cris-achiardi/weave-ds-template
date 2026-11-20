// The shared "is my fieldset disabled?" watcher every framework backend emits for a custom control
// with a form answer (Checkbox, Switch, Slider, RadioGroup — see packages/wc/forms.md).
//
// A disabled <fieldset> fires no event, so the only signal is a DOM mutation: a fieldset's
// `disabled` attribute changing, or a control being moved into or out of one. One document-wide
// subtree observer PER CONTROL multiplied mutation-record delivery by the number of controls —
// measured in review at 200 React Sliders: 1000 unrelated append/remove pairs took a median 22.1 ms
// (p95 36.6 ms) against 0.8 ms (1.5 ms) for one shared observer fanning out to the same callbacks.
//
// So there is ONE observer per document, shared by every generated control on it, whatever
// component or file emitted it. The registry lives on the document under a `Symbol.for` key derived
// from the data prefix, which is what lets separately generated files find it. Subscriptions are
// counted; the observer disconnects and the registry is removed when the last control unsubscribes.
// Records are filtered per subscriber: a control re-checks only when a `disabled` change happened
// on a fieldset that contains it, or when an inserted node contains it (a move).
//
// Generated SOURCE, emitted verbatim by React, Vue and Angular, like validity.mjs. Every file that
// emits it must emit the same shape, which is why it is written once, here.

/** The registry key for a data prefix. Exported so tests and docs name the same thing. */
export const formDisabledKey = (prefix) => `${prefix}.form-disabled`;

/**
 * Lines declaring `function watchFormDisabled(proxy, sync)`, at the given indent. Returns an
 * unsubscribe function.
 */
export function watchFormDisabledFunction(prefix, indent = 0) {
  const lines = [
    `// One observer per DOCUMENT, shared by every generated control on it and refcounted, notifying`,
    `// only the controls a record can affect. Generated from packages/emit-web/form-disabled.mjs.`,
    `function watchFormDisabled(proxy: HTMLInputElement, sync: () => void): () => void {`,
    `  type Watcher = { proxy: HTMLInputElement; sync: () => void };`,
    `  type Registry = { observer: MutationObserver; watchers: Set<Watcher> };`,
    `  const doc = proxy.ownerDocument;`,
    `  const key = Symbol.for(${JSON.stringify(formDisabledKey(prefix))});`,
    `  const host = doc as unknown as Record<symbol, Registry | undefined>;`,
    `  let registry = host[key];`,
    `  if (!registry) {`,
    `    const watchers = new Set<Watcher>();`,
    `    // ONE pass over the records, each tested cheaply before any subscriber is: a \`disabled\``,
    `    // change matters only on a fieldset, and an insertion only if it holds an <input>, since`,
    `    // every proxy is one. Unrelated mutations cost a type check or a tag lookup, not a walk.`,
    `    const observer = new MutationObserver((records) => {`,
    `      const due = new Set<Watcher>();`,
    `      const collect = (root: Node) => {`,
    `        for (const watcher of watchers) if (root.contains(watcher.proxy)) due.add(watcher);`,
    `      };`,
    `      for (const record of records) {`,
    `        if (record.type === 'attributes') {`,
    `          if (record.target.nodeName === 'FIELDSET') collect(record.target);`,
    `          continue;`,
    `        }`,
    `        const added = record.addedNodes;`,
    `        for (let i = 0; i < added.length; i++) {`,
    `          const node = added[i] as Element;`,
    `          if (node.nodeType !== 1) continue;`,
    `          if (node.nodeName !== 'INPUT') {`,
    `            if (!node.firstElementChild || !node.getElementsByTagName('input').length) continue;`,
    `          }`,
    `          collect(node);`,
    `        }`,
    `      }`,
    `      for (const watcher of due) watcher.sync();`,
    `    });`,
    `    observer.observe(doc.documentElement, {`,
    `      attributes: true,`,
    `      attributeFilter: ['disabled'],`,
    `      childList: true,`,
    `      subtree: true,`,
    `    });`,
    `    registry = { observer, watchers };`,
    `    host[key] = registry;`,
    `  }`,
    `  const watcher: Watcher = { proxy, sync };`,
    `  registry.watchers.add(watcher);`,
    `  return () => {`,
    `    const current = host[key];`,
    `    if (!current) return;`,
    `    current.watchers.delete(watcher);`,
    `    if (current.watchers.size) return;`,
    `    current.observer.disconnect();`,
    `    delete host[key];`,
    `  };`,
    `}`,
  ];
  const pad = ' '.repeat(indent);
  return lines.map((l) => pad + l);
}
