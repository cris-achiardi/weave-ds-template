import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// NO FRAMEWORK PLUGIN. Not "none needed yet" — there is no framework in this app at all. Vite is a
// dev server and a TypeScript transpiler here and nothing else; the page is `index.html` and a
// module script.
export default defineConfig({
  resolve: {
    alias: [
      {
        find: '@ds/wc/behavior',
        replacement: resolve(__dirname, '../../packages/wc/src/behavior/index.ts'),
      },
      {
        find: '@ds/wc',
        replacement: resolve(__dirname, '../../packages/wc/src/index.ts'),
      },
    ],
  },
  // 4303, one past the Angular sandbox. All four can run at once.
  server: { port: 4303, open: true },
});
