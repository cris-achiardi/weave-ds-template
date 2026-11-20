// Form lifecycle for a NATIVELY EDITED control (TextField): the element is a real <input>, so the
// platform already supplies submission, `name`, `required`, `readonly`, disabled fieldsets and the
// `form` owner attribute. What it cannot supply is the half that lives in React state:
//
//   reset     The platform resets the DOM, not React. React also mirrors the `value` ATTRIBUTE to
//             the current value, so a native reset restores the edit it was meant to discard. The
//             component therefore listens for its owner's `reset` and restores the answer captured
//             at mount (packages/wc/forms.md: "the answer captured on the first connection").
//   validity  An authored `invalid` was ARIA-only, so a field could show an error while its form
//             submitted. It now sets a custom validity error — but only one the component owns.
//
// See packages/wc/forms.md for the shared semantics and their framework boundaries.

/**
 * @param {object} o
 * @param {string} o.v           the state's camel name (`value`)
 * @param {string} o.Pascal      its Pascal name (`Value`)
 * @param {string} o.elType      the root element type
 * @param {boolean} o.commitEditing
 * @param {boolean} o.hasInvalid whether the contract declares an authored `invalid` state
 */
export function emitNativeFormLifecycle({ v, Pascal, elType, commitEditing, hasInvalid }) {
  const s = [];
  s.push(`  // ---- form lifecycle (contract.form). See packages/wc/forms.md.`);
  s.push(`  const formControl = useRef<${elType} | null>(null);`);
  s.push(
    `  // The answer a reset restores: captured once, at mount, never re-captured from props.`,
  );
  s.push(`  const formAnswer = useRef(${v}Value);`);
  s.push(`  // Read by the reset listener, which is installed once and must see current props.`);
  s.push(`  const formLatest = useRef({ ${v}Value, ${v}Controlled, on${Pascal}Change });`);
  s.push(`  formLatest.current = { ${v}Value, ${v}Controlled, on${Pascal}Change };`);
  s.push(...emitComposedRef('setFormControl', 'formControl', elType));
  s.push(`  useEffect(() => {`);
  s.push(`    const control = formControl.current;`);
  s.push(`    if (!control) return;`);
  s.push(`    let timer: ReturnType<typeof setTimeout> | undefined;`);
  s.push(
    `    // Listened for on the document, and matched against the CURRENT owner when it fires,`,
  );
  s.push(`    // so a \`form\` attribute, an owner change or a move needs no re-subscription.`);
  s.push(`    const onReset = (event: Event) => {`);
  s.push(`      if (event.target !== control.form) return;`);
  s.push(
    `      // A TASK, not a microtask: a reset button dispatches from native code, so a microtask`,
  );
  s.push(`      // would run before later listeners could cancel and before the platform resets.`);
  s.push(`      clearTimeout(timer);`);
  s.push(`      timer = setTimeout(() => {`);
  s.push(`        if (event.defaultPrevented) return;`);
  s.push(`        const answer = formAnswer.current;`);
  s.push(`        const latest = formLatest.current;`);
  s.push(`        // A controlled model is told only when it differs. No DOM event is dispatched:`);
  s.push(`        // this is lifecycle synchronisation, not a user edit.`);
  s.push(`        if (latest.${v}Controlled) {`);
  s.push(`          if (latest.${v}Value !== answer) latest.on${Pascal}Change?.(answer);`);
  s.push(`        } else set${Pascal}Internal(answer);`);
  if (commitEditing) s.push(`        setEditingDraft(answer);`);
  s.push(`      });`);
  s.push(`    };`);
  s.push(`    const doc = control.ownerDocument;`);
  s.push(`    doc.addEventListener('reset', onReset, true);`);
  s.push(`    return () => {`);
  s.push(`      doc.removeEventListener('reset', onReset, true);`);
  s.push(`      clearTimeout(timer);`);
  s.push(`    };`);
  s.push(`  }, [set${Pascal}Internal${commitEditing ? ', setEditingDraft' : ''}]);`);
  if (hasInvalid) s.push(...emitOwnedValidity('formControl'));
  s.push(``);
  return s;
}

/**
 * A ref callback that records the element AND forwards it to the consumer's ref, preserving React
 * 19's callback-ref contract: a consumer callback that returns a cleanup gets that cleanup called
 * instead of being called with null; one that returns nothing is called with null; an object ref is
 * cleared. Returning a cleanup ourselves is what tells React not to call this callback with null.
 */
export function emitComposedRef(name, local, elType) {
  return [
    `  const ${name} = useCallback(`,
    `    (node: ${elType} | null) => {`,
    `      ${local}.current = node;`,
    `      if (typeof ref === 'function') {`,
    `        const cleanup = (ref as (instance: ${elType} | null) => unknown)(node);`,
    `        // The consumer's cleanup runs FIRST, while the element is still recorded: it may`,
    `        // reasonably touch the node (setCustomValidity('') on the way out, say).`,
    `        return () => {`,
    `          if (typeof cleanup === 'function') cleanup();`,
    `          else ref(null);`,
    `          ${local}.current = null;`,
    `        };`,
    `      }`,
    `      if (ref) ref.current = node;`,
    `      return () => {`,
    `        if (ref) ref.current = null;`,
    `        ${local}.current = null;`,
    `      };`,
    `    },`,
    `    [ref],`,
    `  );`,
  ];
}

/**
 * Body statements binding the shared validity owner (packages/emit-web/validity.mjs, emitted at
 * module scope as `ownValidity`) to the element held by `local`. Installed once at mount — before
 * the first `invalid` sync, so a message already on the element is recorded as the consumer's —
 * and released on unmount.
 */
export function emitOwnedValidity(local) {
  return [
    `  const formValidity = useRef<ReturnType<typeof ownValidity> | null>(null);`,
    `  useEffect(() => {`,
    `    const element = ${local}.current;`,
    `    if (!element) return;`,
    `    const owner = ownValidity(element);`,
    `    formValidity.current = owner;`,
    `    return () => {`,
    `      formValidity.current = null;`,
    `      owner.release();`,
    `    };`,
    `  }, []);`,
    `  useEffect(() => {`,
    `    formValidity.current?.setInvalid(Boolean(invalid));`,
    `  }, [invalid]);`,
  ];
}
// ---------------------------------------------------------------------------------------
// Custom controls (#37): Checkbox, Switch, Slider, RadioGroup render no native form control, so
// they contribute through a PROXY: one real, validatable <input> of the matching type, rendered as
// the root's last child, hidden from people and assistive technology. Not `type="hidden"`, which is
// barred from constraint validation and would make `required` decorative.
//
// The proxy is driven IMPERATIVELY, never through React-controlled props: a native reset rewrites
// it, and React would neither notice nor re-render to undo that. Every render writes the current
// answer to it, and so does the reset sync for the case where nothing re-renders.
//
// DEVIATION, accepted and recorded in packages/wc/forms.md: for Checkbox and Switch the root is a
// <button>, and an <input> inside a <button> violates the HTML content model. The generated markup
// is NOT valid HTML there. The alternative — a sibling after the root — was rejected because Angular
// attaches to the root and cannot render a sibling without imperative insertion.
// ---------------------------------------------------------------------------------------

/** The proxy input type for a validated `formFor` result. */
export function proxyTypeFor(form) {
  if (form.encoding === 'checked') return 'checkbox';
  if (form.encoding === 'number') return 'range';
  return 'text';
}

/**
 * Names the generated code uses for the answer's state. A collection's selection is spelled
 * differently from a plain shared state.
 */
export function answerNames(form, camel, pascal) {
  if (form.source === 'selection')
    return {
      value: 'selection',
      controlled: 'valueControlled',
      setter: 'setValueInternal',
      callback: 'onValueChange',
    };
  const v = camel(form.source);
  const P = pascal(form.source);
  return {
    value: `${v}Value`,
    controlled: `${v}Controlled`,
    setter: `set${P}Internal`,
    callback: `on${P}Change`,
  };
}

/** The statement that writes the current answer to the proxy, given `proxy` and `answer`. */
function writeProxy(form) {
  if (form.encoding === 'checked')
    return `proxy.checked = answer === ${JSON.stringify(form.checkedValue)};`;
  if (form.encoding === 'number') return `proxy.value = String(snap(answer, RANGE));`;
  return `proxy.value = answer;`;
}

/**
 * Body statements: reset sync, fieldset observation, proxy writes, owned validity. Emitted before
 * `return (`. Effective disabled (`formDisabled`) is declared at the top of the body by the caller.
 */
export function emitCustomFormLifecycle({ form, names, hasInvalid }) {
  const { value, controlled, setter, callback } = names;
  const s = [];
  s.push(`  // ---- form contribution (contract.form). See packages/wc/forms.md.`);
  s.push(`  const formProxy = useRef<HTMLInputElement | null>(null);`);
  s.push(
    `  // The answer a reset restores: captured once, at mount, never re-captured from props.`,
  );
  s.push(`  const formAnswer = useRef(${value});`);
  s.push(`  // Read by listeners installed once, which must see current props.`);
  s.push(`  const formLatest = useRef({ ${value}, ${controlled}, ${callback} });`);
  s.push(`  formLatest.current = { ${value}, ${controlled}, ${callback} };`);
  s.push(`  const formWrite = useCallback(() => {`);
  s.push(`    const proxy = formProxy.current;`);
  s.push(`    if (!proxy) return;`);
  s.push(`    const answer = formLatest.current.${value};`);
  s.push(`    ${writeProxy(form)}`);
  s.push(`  }, []);`);
  s.push(`  // Every render: the proxy holds exactly the answer the UI shows.`);
  s.push(`  useEffect(formWrite);`);
  s.push(`  useEffect(() => {`);
  s.push(`    const proxy = formProxy.current;`);
  s.push(`    if (!proxy) return;`);
  s.push(`    const doc = proxy.ownerDocument;`);
  s.push(`    // A disabled <fieldset> fires no event. Watch \`disabled\` attributes and ask the`);
  s.push(`    // proxy, which the platform disables along with every other control inside it.`);
  s.push(
    `    const syncDisabled = () => setFormDisabled(proxy.matches(':disabled') && !proxy.disabled);`,
  );
  s.push(`    syncDisabled();`);
  s.push(`    const observer = new MutationObserver(syncDisabled);`);
  s.push(`    observer.observe(doc.documentElement, {`);
  s.push(`      attributes: true,`);
  s.push(`      attributeFilter: ['disabled'],`);
  s.push(`      subtree: true,`);
  s.push(`    });`);
  s.push(`    let timer: ReturnType<typeof setTimeout> | undefined;`);
  s.push(
    `    // Matched against the CURRENT owner when it fires, so a \`form\` prop, an owner change`,
  );
  s.push(`    // or a move needs no re-subscription.`);
  s.push(`    const onReset = (event: Event) => {`);
  s.push(`      if (event.target !== proxy.form) return;`);
  s.push(`      // A TASK, not a microtask: a reset button dispatches from native code, so a`);
  s.push(`      // microtask would run before later listeners could cancel and before the reset.`);
  s.push(`      clearTimeout(timer);`);
  s.push(`      timer = setTimeout(() => {`);
  s.push(`        if (event.defaultPrevented) return;`);
  s.push(`        const answer = formAnswer.current;`);
  s.push(`        const latest = formLatest.current;`);
  s.push(`        // A controlled model is told only when it differs. No DOM event is dispatched:`);
  s.push(`        // this is lifecycle synchronisation, not a user edit.`);
  s.push(`        if (latest.${controlled}) {`);
  s.push(`          if (latest.${value} !== answer) latest.${callback}?.(answer);`);
  s.push(`        } else ${setter}(answer);`);
  s.push(`        // The platform has rewritten the proxy; put back what the model holds now.`);
  s.push(`        formWrite();`);
  s.push(`      });`);
  s.push(`    };`);
  s.push(`    doc.addEventListener('reset', onReset, true);`);
  s.push(`    return () => {`);
  s.push(`      observer.disconnect();`);
  s.push(`      doc.removeEventListener('reset', onReset, true);`);
  s.push(`      clearTimeout(timer);`);
  s.push(`    };`);
  s.push(`  }, [${setter}, formWrite]);`);
  if (hasInvalid) s.push(...emitOwnedValidity('formProxy'));
  s.push(``);
  return s;
}

/** The proxy element, as JSX lines at the given indent. */
export function emitFormProxy({ form, range, hasReadOnly, indent }) {
  const pad = ' '.repeat(indent);
  const type = proxyTypeFor(form);
  const a = [];
  a.push(`ref={formProxy}`);
  a.push(`type="${type}"`);
  a.push(`name={name || undefined}`);
  a.push(`form={form || undefined}`);
  // A read-only answer still submits but is barred from validation, as in HTML. `readonly` does not
  // apply to checkbox or range, so `required` is withdrawn instead.
  a.push(`required={${hasReadOnly ? 'required && !readOnly' : 'required'}}`);
  if (hasReadOnly && type === 'text') a.push(`readOnly={readOnly}`);
  a.push(`disabled={disabledProp}`);
  if (form.encoding === 'checked') a.push(`value={value}`);
  if (type === 'range' && range) {
    a.push(`min={${range.min}}`);
    a.push(`max={${range.max}}`);
    a.push(`step={${range.step}}`);
  }
  a.push(`aria-hidden="true"`);
  a.push(`tabIndex={-1}`);
  a.push(`autoComplete="off"`);
  a.push(`style={FORM_PROXY_STYLE}`);
  a.push(
    `onFocus={(event) => { const root = event.currentTarget.parentElement; (root?.querySelector<HTMLElement>('[tabindex="0"]') ?? root)?.focus(); }}`,
  );
  return [`${pad}<input`, ...a.map((x) => `${pad}  ${x}`), `${pad}/>`];
}

/** Module-scope constant, emitted after the imports. */
export const FORM_PROXY_STYLE_DECL = [
  `// The form proxy: in the form, out of sight, out of the pointer's and the tab order's reach.`,
  `const FORM_PROXY_STYLE = {`,
  `  position: 'absolute',`,
  `  width: 1,`,
  `  height: 1,`,
  `  margin: 0,`,
  `  padding: 0,`,
  `  border: 0,`,
  `  opacity: 0,`,
  `  overflow: 'hidden',`,
  `  clipPath: 'inset(50%)',`,
  `  pointerEvents: 'none',`,
  `} as const;`,
  ``,
];
