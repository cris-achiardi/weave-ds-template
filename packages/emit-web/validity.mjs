// The custom-validity owner every framework backend emits for an authored `invalid` state.
//
// Framework-free DOM code, written ONCE here and emitted verbatim by React, Vue and Angular (the
// web-components backend uses ElementInternals instead). It is generated SOURCE, not a runtime
// import: a generated component is the consumer's file (see packages/react/src/behavior/README.md).
//
// Custom validity has two writers, tracked by WRITER rather than inferred from the message text:
//
//   consumer  through the element's own setCustomValidity() METHOD, which is intercepted on the
//             instance. A message already present when the owner installs is the consumer's too.
//   invalid   authored `invalid`, which contributes the default message.
//
// The effective message is the consumer's if any, else the default while `invalid` holds — the WC
// host's precedence. Nothing reads validationMessage to decide ownership: it reads '' while the
// element is barred from validation (read-only, disabled). A pre-existing error whose text is
// unreadable for that reason is recorded as present-but-unknown and is never rewritten or cleared
// until the consumer writes again.
//
// UNSUPPORTED, and recorded in packages/wc/forms.md: a consumer that calls the PROTOTYPE method
// directly — HTMLInputElement.prototype.setCustomValidity.call(element, message) — bypasses the
// interceptor, and the next `invalid` change overwrites that message. The prototype is never patched.

/** The default custom-validity message for authored `invalid`. Same string as WC. */
export const INVALID_MESSAGE = 'Invalid value.';

/**
 * Lines declaring `function ownValidity(element)`, at the given indent.
 *
 * Returns `{ setInvalid(next), release() }`. `release()` restores the element's prior OWN
 * `setCustomValidity` (or removes ours) only while ours is still installed: a newer override the
 * consumer assigned is theirs and is left alone.
 */
export function ownValidityFunction(indent = 0) {
  const msg = JSON.stringify(INVALID_MESSAGE);
  const lines = [
    `// Custom validity has two writers, tracked by WRITER, not by message text: the consumer,`,
    `// through the element's own setCustomValidity() method, and authored \`invalid\`. The`,
    `// consumer's message wins, as in WC. Generated from packages/emit-web/validity.mjs, which also`,
    `// records the one unsupported path (calling the prototype method directly).`,
    `function ownValidity(element: HTMLInputElement) {`,
    `  const prior = Object.getOwnPropertyDescriptor(element, 'setCustomValidity');`,
    `  const write: (message: string) => void =`,
    `    typeof prior?.value === 'function'`,
    `      ? prior.value.bind(element)`,
    `      : HTMLInputElement.prototype.setCustomValidity.bind(element);`,
    `  // An error already present is the consumer's. While the element is barred from validation`,
    `  // its text reads '', so \`null\` records "present but unreadable": left exactly as it is.`,
    `  let consumer: string | null = element.validity.customError`,
    `    ? element.validationMessage || null`,
    `    : '';`,
    `  let invalid = false;`,
    `  const apply = () => {`,
    `    if (consumer !== null) write(consumer || (invalid ? ${msg} : ''));`,
    `  };`,
    `  const intercept = (message: string) => {`,
    `    consumer = String(message);`,
    `    apply();`,
    `  };`,
    `  element.setCustomValidity = intercept;`,
    `  return {`,
    `    setInvalid(next: boolean) {`,
    `      invalid = next;`,
    `      apply();`,
    `    },`,
    `    release() {`,
    `      // A newer override is the consumer's: leave it.`,
    `      if (element.setCustomValidity !== intercept) return;`,
    `      if (prior) Object.defineProperty(element, 'setCustomValidity', prior);`,
    `      else Reflect.deleteProperty(element, 'setCustomValidity');`,
    `    },`,
    `  };`,
    `}`,
  ];
  const pad = ' '.repeat(indent);
  return lines.map((l) => pad + l);
}
