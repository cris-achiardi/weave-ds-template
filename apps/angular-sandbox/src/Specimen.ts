import { Component, ViewEncapsulation, input } from '@angular/core';

/**
 * One labelled specimen on the page. The Angular twin of the React sandbox's `Specimen` function
 * and the Vue sandbox's `Specimen.vue` — hand-written, not generated, because the harness is not a
 * component library.
 *
 * Note that this one DOES render its own root element, unlike every generated component here. It
 * can, because nothing about a `<section>` wrapper is load-bearing: no contract names it, no
 * stylesheet has to find it, and no ARIA role depends on it being a particular element. That is
 * exactly the judgement the generated components are not allowed to make.
 */
@Component({
  selector: 'ds-specimen',
  encapsulation: ViewEncapsulation.None,
  template: `
    <section class="specimen" [attr.id]="'specimen-' + of()">
      <h2>{{ name() }}</h2>
      <p class="specimen-note">{{ note() }}</p>
      <div class="specimen-row"><ng-content /></div>
    </section>
  `,
})
export class Specimen {
  /** What to call this specimen. */
  readonly name = input.required<string>();
  /** The contract it anchors to, for a deep link. */
  readonly of = input.required<string>();
  /** What the specimen is showing, and what is worth looking at. */
  readonly note = input.required<string>();
}
