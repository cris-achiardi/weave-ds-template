import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // An ARRAY, not an object, because order matters: the more specific subpath must be tried
    // before the bare package name, or `@ds/react/behavior` resolves to the barrel plus a stray
    // `/behavior` and fails with a confusing missing-file error.
    alias: [
      {
        // The interaction primitives emitted components import. Generated code says
        // `from '@ds/react/behavior'` — the same specifier a real consumer writes — so nothing in
        // the emitted output is sandbox-specific.
        find: '@ds/react/behavior',
        replacement: resolve(__dirname, '../../packages/react/src/behavior/index.ts'),
      },
      {
        // Point at SOURCE, not dist. The sandbox is a live harness: edit a component and it
        // hot-reloads, with no build step between you and the change.
        find: '@ds/react',
        replacement: resolve(__dirname, '../../packages/react/src/index.ts'),
      },
    ],
  },
  server: { port: 4300, open: true },
});
