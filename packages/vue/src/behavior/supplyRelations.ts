import { cloneVNode, Comment, Fragment, h, isVNode, Text } from 'vue';
import type { VNode } from 'vue';
import { mergeTokens, resolvedId } from '@ds/behavior/supplied-relations';
import type { SuppliedRelations } from '@ds/behavior/supplied-relations';

export type { SuppliedRelations } from '@ds/behavior/supplied-relations';

/**
 * The rendered content of a slot, with the wrappers Vue adds removed: fragments (from `<slot>`,
 * `v-for`, `v-if` groups) flattened, comments and whitespace-only text dropped.
 */
function contentOf(nodes: unknown): VNode[] {
  const out: VNode[] = [];
  const visit = (node: unknown) => {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!isVNode(node)) return;
    if (node.type === Comment) return;
    if (node.type === Text && !String(node.children ?? '').trim()) return;
    if (node.type === Fragment) return visit(node.children);
    out.push(node);
  };
  visit(nodes);
  return out;
}

/** The one element vnode a slot can carry relations to, or null. */
function suppliedElement(nodes: unknown): VNode | null {
  const content = contentOf(nodes);
  return content.length === 1 && content[0]!.type !== Text ? content[0]! : null;
}

/**
 * The id the supplied element ends up with: the consumer's own, else `fallback`. A label part
 * needs it to point `for` at the element.
 */
export function suppliedId(nodes: unknown, fallback: string): string {
  const own = suppliedElement(nodes)?.props?.id;
  return resolvedId(typeof own === 'string' ? own : null, fallback) ?? fallback;
}

const warned = new Set<string>();

/**
 * Write a part's relations onto the element a consumer supplied to the slot that fills it.
 *
 * Returns ONE vnode for `<component :is>`: the supplied element cloned with the relations merged
 * into its props. Every render re-derives them from the consumer's own props, so state changes and
 * a replaced element clean up with no bookkeeping. On a component vnode the props fall through to
 * its root — a component reached this way must let `id` and `aria-*` reach its focusable element.
 * Ownership policy is `@ds/behavior/supplied-relations`.
 *
 * Anything that is not exactly one element is rendered unchanged and reported once, naming the
 * slot, rather than silently half-wired.
 */
export function supplyRelations(
  nodes: unknown,
  relations: SuppliedRelations,
  where: string,
): VNode | null {
  const element = suppliedElement(nodes);
  if (!element) {
    const content = contentOf(nodes);
    if (!content.length) return null;
    if (!warned.has(where)) {
      warned.add(where);
      console.error(
        `${where}: supply exactly one element (for example an <input> or a <button>). ` +
          'Its accessible name and description cannot be attached to text or several elements.',
      );
    }
    return h(Fragment, content);
  }
  const props = (element.props ?? {}) as Record<string, unknown>;
  const own = typeof props.id === 'string' ? props.id : null;
  const extra: Record<string, unknown> = {};
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
    extra['aria-invalid'] = relations.invalid ? 'true' : props['aria-invalid'];
  return cloneVNode(element, extra);
}
