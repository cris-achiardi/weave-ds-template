// Explicit, because Storybook transforms this config file with the CLASSIC JSX runtime rather
// than the automatic one the library is built with. Without it the decorator below throws
// `React is not defined` at runtime, and every story renders an error card instead.
import React from 'react';

import type { Preview } from '@storybook/react-vite';

// The generated token stylesheet. Until tokens exist this is an empty :root {} — a valid state.
import '@ds/tokens/css';

/*
 * HARNESS CHROME, DELIBERATELY NOT BUILT FROM TOKENS.
 *
 * Same reasoning as apps/sandbox/src/sandbox.css: this is the viewer, not the system. Painting the
 * harness with the system's own tokens would make a token bug look like a layout bug — the page
 * and the component would fail together and you could not tell which broke. These values match
 * the sandbox so the two harnesses agree.
 */
const GROUND = '#141414';
const INK = '#f2f2f2';

const preview: Preview = {
  parameters: {
    controls: { matchers: { color: /(background|color)$/i } },
  },

  decorators: [
    /*
     * The ground and the ambient text colour, painted here rather than through the `backgrounds`
     * addon.
     *
     * The addon was the original approach and it is why this file shipped broken: the config used
     * `parameters.backgrounds.values` (the Storybook 7 shape) and Storybook 9 wants an `options`
     * object plus an `initialGlobals` selection. A wrong shape is IGNORED rather than rejected, so
     * the canvas stayed white while the config read as correct — and nobody caught it, because on
     * an empty Storybook a white canvas looks exactly like a working one.
     *
     * Painting it in a decorator has no such failure mode: it is ordinary CSS, it cannot be
     * silently ignored, and it does not move between Storybook majors. The cost is that the
     * background switcher in the toolbar no longer drives the canvas — acceptable, because the
     * design source is dark-only (`.figma/manifest.json` -> identity.themes) and every text and
     * icon colour in the system resolves to white or near-white. A light ground would render most
     * of the library invisible and imply a light theme the system has not decided on.
     *
     * The ambient colour is load-bearing, not cosmetic: `Icon` paints with `currentColor` by
     * design (ADR 0004), so with no `color` in effect it inherits the browser default — near-black
     * on this ground, i.e. invisible.
     */
    (Story) => (
      <div
        style={{
          minHeight: '100vh',
          margin: -16,
          padding: 16,
          background: GROUND,
          color: INK,
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
        }}
      >
        <Story />
      </div>
    ),
  ],
};

export default preview;
