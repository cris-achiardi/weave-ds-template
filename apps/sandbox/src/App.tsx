/**
 * The sandbox page.
 *
 * There is nothing to render yet, because the library ships with no components. When you build
 * one, import it and drop it in — that is the whole workflow.
 *
 *   import { Button } from '@ds/react';
 *   ...
 *   <Specimen name="Button">
 *     <Button hierarchy="primary">Start recording</Button>
 *     <Button hierarchy="secondary">Cancel</Button>
 *   </Specimen>
 *
 * The alias in vite.config.ts points @ds/react at SOURCE, so edits hot-reload with no build.
 */

import type { ReactNode } from 'react';

function Specimen({ name, children }: { name: string; children: ReactNode }) {
  return (
    <section className="specimen">
      <h2>{name}</h2>
      <div className="specimen-row">{children}</div>
    </section>
  );
}

export function App() {
  const specimens: ReactNode[] = [];

  return (
    <main className="sandbox">
      <header>
        <h1>Design system sandbox</h1>
        <p>
          A live harness pointed at component source. Not a docs site — for that, switch on
          Storybook (see <code>apps/storybook/README.md</code>).
        </p>
      </header>

      {specimens.length > 0 ? (
        specimens
      ) : (
        <div className="empty">
          <h2>No components yet</h2>
          <p>
            That is this template&rsquo;s intended starting state, not a gap. Components are built
            against an accepted decision — see <code>docs/ADR/README.md</code>, then use the{' '}
            <code>ds-component</code> skill.
          </p>
          <p>
            Once one exists, import it in <code>src/App.tsx</code> and wrap it in a{' '}
            <code>&lt;Specimen&gt;</code>.
          </p>
        </div>
      )}
    </main>
  );
}
