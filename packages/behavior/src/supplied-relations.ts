// Relations that belong on an element the CONSUMER supplies, not on the component's own markup.
//
// A contract part filled by a slot (Field's `control`, Tooltip's `trigger`) may declare `namedBy`
// and `describedBy`. ARIA names and descriptions are not inherited, so writing them on the
// component's wrapper around the supplied element leaves the focusable element unnamed — issues #35
// and #46. Every backend therefore writes them on the supplied element itself, and the supplied
// element belongs to the consumer, who may already have put an `id`, an `aria-describedby` or an
// `aria-invalid` on it.
//
// THE OWNERSHIP POLICY, one copy for all four backends:
//
//   - id               the consumer's id is used if there is one and never touched. Otherwise the
//                      component assigns its fallback id, and removes it again on release.
//   - aria-labelledby  consumer tokens are kept and come FIRST; the component's ids are appended,
//   - aria-describedby de-duplicated. Only tokens the component added are ever removed, so a state
//                      change, a replaced control or a release never strips a consumer token.
//   - aria-invalid     written as "true" while invalid. While not invalid the consumer's own value
//                      (if any) stands; a value the component wrote is removed.
//   - aria-controls    an IDREF list like the two above (#36: a WC tab host points at its panel
//                      host). Same rules: consumer tokens first and kept.
//   - attributes       single-valued attributes the component OWNS while wired — a WC host that
//                      realizes its root (role, aria-selected, aria-disabled, tabindex; ADR
//                      0008). The aria-invalid rule, generalized: the consumer's prior value
//                      is remembered at the first write and restored when the component stops
//                      wanting the attribute, but only while the attribute still holds what the
//                      component wrote — a value the consumer set since is newer and stays.
//
// No framework and no DOM: `AttributeTarget` is the three methods this needs, which a DOM Element
// satisfies structurally and a test fake satisfies in four lines. The declarative backends (React,
// Vue) re-derive from the consumer's props on every render and only need `mergeTokens`; the
// imperative ones (Angular, WC) write into a live element and use `applyRelations`, which tracks
// what it wrote so it can take exactly that back.

/** What a component wants on the supplied element. `null` entries are dropped. */
export interface SuppliedRelations {
  /** Fallback id, used only when the element has none of its own. */
  id?: string | null;
  labelledBy?: readonly (string | null | undefined | false)[];
  describedBy?: readonly (string | null | undefined | false)[];
  controls?: readonly (string | null | undefined | false)[];
  invalid?: boolean;
  /** Owned single-valued attributes; `null` means "not wanted now". */
  attributes?: Readonly<Record<string, string | null>>;
}

/** The part of a DOM Element this needs. */
export interface AttributeTarget {
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
}

/** What `applyRelations` wrote, so the next call (or `releaseRelations`) can take back only that. */
export interface AppliedRelations {
  id: string | null;
  labelledBy: readonly string[];
  describedBy: readonly string[];
  controls: readonly string[];
  /** Per owned attribute: the value written, and the consumer's value it replaced. */
  attributes: Readonly<Record<string, { value: string; prior: string | null }>>;
  /** True when the component wrote aria-invalid; `invalidPrior` is what to restore then. */
  wroteInvalid: boolean;
  invalidPrior: string | null;
}

export const RELATION_ATTRIBUTES = {
  labelledBy: 'aria-labelledby',
  describedBy: 'aria-describedby',
  controls: 'aria-controls',
} as const;

const tokensOf = (value: string | null | undefined): string[] =>
  (value ?? '').split(/\s+/).filter(Boolean);

const present = (ids: SuppliedRelations['labelledBy']): string[] =>
  (ids ?? []).filter((id): id is string => typeof id === 'string' && id.length > 0);

/**
 * Merge component-owned IDREF tokens into a consumer's list.
 *
 * Consumer tokens first, in their order, minus anything the component previously added; then the
 * component's tokens in the order given. Duplicates collapse to the first occurrence. Returns null
 * when nothing is left, so a caller can remove the attribute rather than write an empty one.
 */
export function mergeTokens(
  consumer: string | null | undefined,
  owned: readonly (string | null | undefined | false)[],
  previouslyOwned: readonly string[] = [],
): string | null {
  const drop = new Set(previouslyOwned);
  const out: string[] = [];
  for (const token of [...tokensOf(consumer).filter((t) => !drop.has(t)), ...present(owned)])
    if (!out.includes(token)) out.push(token);
  return out.length ? out.join(' ') : null;
}

/** The ids a supplied element should carry, resolved: consumer id wins over the fallback. */
export function resolvedId(consumerId: string | null | undefined, fallback?: string | null) {
  return consumerId || fallback || null;
}

/**
 * Write `relations` onto a live element, undoing whatever `previous` wrote first.
 *
 * Idempotent: calling it again with the same relations and its own previous result changes nothing.
 * Pass `previous` from a DIFFERENT element only through `releaseRelations` on that element first.
 */
export function applyRelations(
  target: AttributeTarget,
  relations: SuppliedRelations,
  previous: AppliedRelations | null = null,
): AppliedRelations {
  // id: only assign when the element has none — or has the one we assigned last time.
  let id: string | null = null;
  const currentId = target.getAttribute('id');
  if (relations.id && (!currentId || currentId === previous?.id)) {
    if (currentId !== relations.id) target.setAttribute('id', relations.id);
    id = relations.id;
  } else if (previous?.id && currentId === previous.id) {
    target.removeAttribute('id');
  }

  const write = (key: keyof typeof RELATION_ATTRIBUTES) => {
    const name = RELATION_ATTRIBUTES[key];
    const wanted = present(relations[key]);
    const before = previous?.[key] ?? [];
    // The consumer's tokens are whatever is there that we did not add. A wanted token the
    // consumer ALREADY has is theirs, not ours: claiming it would strip it on release.
    const consumer = tokensOf(target.getAttribute(name)).filter((t) => !before.includes(t));
    const added = wanted.filter((t) => !consumer.includes(t));
    const value = mergeTokens(target.getAttribute(name), wanted, before);
    if (value === null) target.removeAttribute(name);
    else if (value !== target.getAttribute(name)) target.setAttribute(name, value);
    return added;
  };
  const labelledBy = write('labelledBy');
  const describedBy = write('describedBy');
  const controls = write('controls');

  // Owned single-valued attributes: the aria-invalid rule below, for any attribute.
  const attributes: Record<string, { value: string; prior: string | null }> = {};
  const names = new Set([
    ...Object.keys(relations.attributes ?? {}),
    ...Object.keys(previous?.attributes ?? {}),
  ]);
  for (const name of names) {
    const wanted = relations.attributes?.[name] ?? null;
    const before = previous?.attributes?.[name];
    const current = target.getAttribute(name);
    const ours = Boolean(before) && current === before!.value;
    if (wanted !== null) {
      attributes[name] = { value: wanted, prior: ours ? before!.prior : current };
      if (current !== wanted) target.setAttribute(name, wanted);
    } else if (ours) {
      if (before!.prior === null) target.removeAttribute(name);
      else target.setAttribute(name, before!.prior);
    }
  }

  // aria-invalid: remember the consumer's own value when we overwrite it, and put it back when the
  // field stops being invalid — but ONLY while the attribute still holds the value we wrote. If the
  // consumer changed it in the meantime, theirs is newer than our saved copy and stays.
  const current = target.getAttribute('aria-invalid');
  const stillOurs = Boolean(previous?.wroteInvalid) && current === 'true';
  let wroteInvalid = false;
  let invalidPrior: string | null = null;
  if (relations.invalid) {
    wroteInvalid = true;
    invalidPrior = stillOurs ? previous!.invalidPrior : current;
    if (current !== 'true') target.setAttribute('aria-invalid', 'true');
  } else if (stillOurs) {
    if (previous!.invalidPrior === null) target.removeAttribute('aria-invalid');
    else target.setAttribute('aria-invalid', previous!.invalidPrior);
  }
  return { id, labelledBy, describedBy, controls, attributes, wroteInvalid, invalidPrior };
}

/** Take back everything `applyRelations` wrote. Consumer values are left exactly as they were. */
export function releaseRelations(target: AttributeTarget, applied: AppliedRelations | null): void {
  if (!applied) return;
  applyRelations(target, {}, applied);
}

/** A set of live elements kept in step with the relations they should carry. */
export interface RelationWriter<T extends AttributeTarget> {
  /** Apply these; any element written last time and absent now is released first. */
  write(entries: Iterable<readonly [T, SuppliedRelations]>): void;
  /** Release every element this writer has written. */
  release(): void;
}

/**
 * The bookkeeping the imperative backends need: an element that left the slot (replaced, removed)
 * gets back exactly what it had before the component touched it, and the one now in the slot is
 * wired. Elements are compared by identity.
 */
export function relationWriter<T extends AttributeTarget>(): RelationWriter<T> {
  let applied = new Map<T, AppliedRelations>();
  return {
    write(entries) {
      const next = new Map<T, AppliedRelations>();
      const wanted = [...entries];
      for (const [el, done] of applied)
        if (!wanted.some(([target]) => target === el)) releaseRelations(el, done);
      for (const [el, relations] of wanted)
        next.set(el, applyRelations(el, relations, applied.get(el) ?? null));
      applied = next;
    },
    release() {
      for (const [el, done] of applied) releaseRelations(el, done);
      applied = new Map();
    },
  };
}
