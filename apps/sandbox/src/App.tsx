/**
 * The sandbox page.
 *
 * The alias in vite.config.ts points @ds/react at SOURCE, so edits hot-reload with no build.
 */

import type { ReactNode } from 'react';

import { Icon, glyphNames } from '@ds/react';

function Specimen({ name, children }: { name: string; children: ReactNode }) {
  return (
    <section className="specimen">
      <h2>{name}</h2>
      <div className="specimen-row">{children}</div>
    </section>
  );
}

export function App() {
  return (
    <main className="sandbox">
      <header>
        <h1>Design system sandbox</h1>
        <p>
          A live harness pointed at component source. Not a docs site — for that, switch on
          Storybook (see <code>apps/storybook/README.md</code>).
        </p>
      </header>

      <Specimen name={`Icon — the whole set (${glyphNames.length})`}>
        <div className="icon-grid">
          {glyphNames.map((name) => (
            <figure key={name} className="icon-cell">
              <Icon name={name} size="l" />
              <figcaption>{name}</figcaption>
            </figure>
          ))}
        </div>
      </Specimen>

      <Specimen name="Icon — the size axis">
        {(['xs', 's', 'm', 'l', 'xl'] as const).map((size) => (
          <figure key={size} className="icon-cell">
            <Icon name="videocam" size={size} />
            <figcaption>{size}</figcaption>
          </figure>
        ))}
      </Specimen>

      <Specimen name="Icon — colour comes from the context, never the glyph">
        {[
          ['inherited', undefined],
          ['brand', 'var(--ds-brand-primary)'],
          ['off', 'var(--ds-control-off)'],
          ['waveform', 'var(--ds-control-waveform)'],
          ['secondary', 'var(--ds-text-secondary)'],
        ].map(([label, color]) => (
          <figure key={label} className="icon-cell" style={{ color }}>
            <Icon name="mic-off" size="l" />
            <figcaption>{label}</figcaption>
          </figure>
        ))}
      </Specimen>

      <Specimen name="Icon — optical size is a property of the artwork, not the size prop">
        {(['close', 'close-small', 'crop', 'check-small', 'mobile'] as const).map((name) => (
          <figure key={name} className="icon-cell">
            <span className="icon-box">
              <Icon name={name} size="l" />
            </span>
            <figcaption>{name}</figcaption>
          </figure>
        ))}
      </Specimen>
    </main>
  );
}
