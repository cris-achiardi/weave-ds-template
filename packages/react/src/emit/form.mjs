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

/** The default custom-validity message for authored `invalid`. Same string as WC. */
export const INVALID_MESSAGE = 'Invalid value.';

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
    `        return () => {`,
    `          ${local}.current = null;`,
    `          if (typeof cleanup === 'function') cleanup();`,
    `          else ref(null);`,
    `        };`,
    `      }`,
    `      if (ref) ref.current = node;`,
    `      return () => {`,
    `        ${local}.current = null;`,
    `        if (ref) ref.current = null;`,
    `      };`,
    `    },`,
    `    [ref],`,
    `  );`,
  ];
}

/**
 * Custom validity has TWO writers, tracked by writer rather than inferred from the message text:
 * the consumer, through the element's own setCustomValidity() — intercepted on the instance — and
 * authored `invalid`. The effective error is the consumer's message if any, else the default one
 * while `invalid` holds (the same precedence as WC). Clearing `invalid` therefore never clears a
 * consumer error, even one with identical text, and never depends on validationMessage — which
 * reads '' while the element is barred from validation (read-only, disabled).
 */
export function emitOwnedValidity(local) {
  const msg = JSON.stringify(INVALID_MESSAGE);
  return [
    `  // Custom validity has two writers, tracked by WRITER, not by message text: the consumer,`,
    `  // through the element's own setCustomValidity(), and authored \`invalid\`. The consumer's`,
    `  // message wins, as in WC; clearing \`invalid\` never clears it.`,
    `  const formValidity = useRef({ consumer: '', invalid: false });`,
    `  const formApplyValidity = useCallback(() => {`,
    `    const element = ${local}.current;`,
    `    if (!element) return;`,
    `    const { consumer, invalid } = formValidity.current;`,
    `    HTMLInputElement.prototype.setCustomValidity.call(element, consumer || (invalid ? ${msg} : ''));`,
    `  }, []);`,
    `  useEffect(() => {`,
    `    const element = ${local}.current;`,
    `    if (!element) return;`,
    `    const state = formValidity.current;`,
    `    // A message set before this ran (a consumer ref callback runs first) is the consumer's.`,
    `    if (element.validity.customError && !state.invalid) state.consumer = element.validationMessage;`,
    `    element.setCustomValidity = (message: string) => {`,
    `      state.consumer = String(message);`,
    `      formApplyValidity();`,
    `    };`,
    `    return () => {`,
    `      Reflect.deleteProperty(element, 'setCustomValidity');`,
    `    };`,
    `  }, [formApplyValidity]);`,
    `  useEffect(() => {`,
    `    formValidity.current.invalid = Boolean(invalid);`,
    `    formApplyValidity();`,
    `  }, [invalid, formApplyValidity]);`,
  ];
}
