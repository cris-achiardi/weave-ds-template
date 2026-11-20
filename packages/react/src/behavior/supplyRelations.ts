import { cloneElement, Fragment, isValidElement } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { mergeTokens, resolvedId } from '@ds/behavior/supplied-relations';
import type { SuppliedRelations } from '@ds/behavior/supplied-relations';

export type { SuppliedRelations } from '@ds/behavior/supplied-relations';

type Props = Record<string, unknown>;

/** The one element a slot can carry relations to, or null when the slot holds anything else. */
function suppliedElement(node: ReactNode): ReactElement<Props> | null {
  return isValidElement<Props>(node) && node.type !== Fragment ? node : null;
}

/**
 * The id the supplied element ends up with: the consumer's own, else `fallback`. A label part
 * needs it before the element is cloned, to point `htmlFor` at it.
 */
export function suppliedId(node: ReactNode, fallback: string): string {
  const own = suppliedElement(node)?.props.id;
  return resolvedId(typeof own === 'string' ? own : null, fallback) ?? fallback;
}

const warned = new Set<string>();

/**
 * Write a part's relations onto the element a consumer supplied to the slot that fills it.
 *
 * `cloneElement`, so the relations are props: every render re-derives them from the consumer's own
 * props, which makes state changes and a replaced element clean up with no bookkeeping. Ownership
 * policy is `@ds/behavior/supplied-relations` — consumer tokens kept and first, consumer id never
 * replaced. A component reached this way must forward `id` and `aria-*` to its focusable element.
 *
 * Anything that is not exactly one element — text, a fragment, an array — cannot carry a relation.
 * It is rendered unchanged and reported once, naming the slot, rather than silently half-wired.
 */
export function supplyRelations(
  node: ReactNode,
  relations: SuppliedRelations,
  where: string,
): ReactNode {
  const element = suppliedElement(node);
  if (!element) {
    if (node != null && node !== false && !warned.has(where)) {
      warned.add(where);
      console.error(
        `${where}: supply exactly one element (for example an <input> or a <button>). ` +
          'Its accessible name and description cannot be attached to text, a fragment or a list.',
      );
    }
    return node;
  }
  const props = element.props;
  const own = typeof props.id === 'string' ? props.id : null;
  const extra: Props = {};
  if (relations.id && !own) extra.id = relations.id;
  if (relations.labelledBy)
    extra['aria-labelledby'] =
      mergeTokens(props['aria-labelledby'] as string | undefined, relations.labelledBy) ??
      undefined;
  if (relations.describedBy)
    extra['aria-describedby'] =
      mergeTokens(props['aria-describedby'] as string | undefined, relations.describedBy) ??
      undefined;
  if (relations.invalid !== undefined)
    extra['aria-invalid'] = relations.invalid ? true : props['aria-invalid'];
  return cloneElement(element, extra);
}
