import { afterRenderEffect, DestroyRef, ElementRef, inject, signal } from '@angular/core';
import type { Signal } from '@angular/core';
import { relationWriter, resolvedId } from '@ds/behavior/supplied-relations';
import type { SuppliedRelations } from '@ds/behavior/supplied-relations';

export type { SuppliedRelations } from '@ds/behavior/supplied-relations';

/** The id a supplied element ends up with: its own, else `fallback`. */
export function suppliedId(element: Element | null | undefined, fallback: string): string {
  return resolvedId(element?.getAttribute('id'), fallback) ?? fallback;
}

export interface SuppliedRelationsBinding {
  /** The supplied element's id once wired (its own, or the fallback), for a label's `for`. */
  readonly id: Signal<string | null>;
}

/**
 * Write a part's relations onto the element a consumer projected with `slot="<name>"`.
 *
 * Content projection has no props channel, so this is imperative, as in the WC backend: the
 * `slot` attribute the consumer already writes IS the registration. The element is found among
 * this host's descendants whose nearest component is this host (so a nested component's slot is
 * not mistaken for ours), wired after every render, and re-wired by a MutationObserver when the
 * consumer replaces or removes it — at which point the old element gets back exactly what it had.
 * Ownership policy is `@ds/behavior/supplied-relations`.
 *
 * MUST be called from an injection context — a field initializer, as generated code does.
 */
export function supplyRelations(
  slot: string,
  relations: () => SuppliedRelations,
  where: string,
): SuppliedRelationsBinding {
  const host = inject(ElementRef).nativeElement as HTMLElement;
  const writer = relationWriter<Element>();
  const id = signal<string | null>(null);
  let warned = false;

  const find = (): Element | null => {
    const found = [...host.querySelectorAll(`[slot="${slot}"]`)].filter(
      (el) => el.parentElement?.closest('[data-ds-component]') === host,
    );
    if (found.length <= 1) return found[0] ?? null;
    if (!warned) {
      warned = true;
      console.error(
        `${where}: supply exactly one element with slot="${slot}". ` +
          'Several elements cannot all carry its accessible name and description; none is wired.',
      );
    }
    return null;
  };

  const sync = () => {
    const wanted = relations();
    const element = find();
    writer.write(element ? [[element, wanted]] : []);
    id.set(element ? element.getAttribute('id') : null);
  };

  afterRenderEffect(sync);
  const observer = new MutationObserver(sync);
  observer.observe(host, { childList: true, subtree: true });
  inject(DestroyRef).onDestroy(() => {
    observer.disconnect();
    writer.release();
  });
  return { id };
}
