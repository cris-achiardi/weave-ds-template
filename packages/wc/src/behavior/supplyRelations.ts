import { relationWriter, resolvedId } from '@ds/behavior/supplied-relations';
import type { SuppliedRelations } from '@ds/behavior/supplied-relations';

export type { SuppliedRelations } from '@ds/behavior/supplied-relations';

/** The id a supplied element ends up with: its own, else `fallback`. */
export function suppliedId(element: Element | null | undefined, fallback: string): string {
  return resolvedId(element?.getAttribute('id'), fallback) ?? fallback;
}

export interface SuppliedRelationsWriter {
  /**
   * Bring every element in `entries` in line with its relations, and give any element written last
   * time and absent now back exactly what it had. Call it on every state change and `slotchange`.
   */
  write(entries: Iterable<readonly [Element, SuppliedRelations]>): void;
  /** Take back everything written. Call it from `disconnectedCallback`. */
  release(): void;
  /**
   * The one element assigned to a slot, or null. Several elements cannot all be "the control":
   * that is reported once, naming the slot, and none of them is wired.
   */
  single(slot: HTMLSlotElement | null): Element | null;
}

/**
 * Write relations onto elements a consumer slotted into this component — LIGHT DOM, in the same
 * tree as each other.
 *
 * An IDREF cannot cross a shadow boundary (docs/research/0006 §4), and element reflection cannot
 * point from a light-DOM element into this component's shadow root either, because that root is
 * not an ancestor scope of the element (ADR 0005). What CAN work, in every engine, is pointing the
 * slotted control at the slotted CONTENT of the label/description/error parts: those elements are
 * the consumer's, in the consumer's tree. That mapping — the relation targets the slotted content
 * of the part the contract names — is recorded in ADR 0005.
 *
 * Ownership policy is `@ds/behavior/supplied-relations`: consumer ids and tokens are never removed.
 */
export function supplyRelations(where: string): SuppliedRelationsWriter {
  const writer = relationWriter<Element>();
  let warned = false;
  return {
    write: (entries) => writer.write(entries),
    release: () => writer.release(),
    single(slot) {
      const assigned = slot?.assignedElements({ flatten: true }) ?? [];
      if (assigned.length <= 1) return assigned[0] ?? null;
      if (!warned) {
        warned = true;
        console.error(
          `${where}: supply exactly one element to slot "${slot!.name}". ` +
            'Several elements cannot all carry its accessible name and description; none is wired.',
        );
      }
      return null;
    },
  };
}
