import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

// NO FRAMEWORK PLUGIN, and for once that is not a note about what this package happens not to need.
// There is no framework. `src/behavior/` is plain TypeScript over DOM events, and the emitted
// components are `class extends HTMLElement`.
export default defineConfig({
  plugins: [dts({ include: ['src'], rollupTypes: false })],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        behavior: resolve(__dirname, 'src/behavior/index.ts'),
      },
      formats: ['es', 'cjs'],
      fileName: (format, entryName) => (format === 'es' ? `${entryName}.js` : `${entryName}.cjs`),
    },
    cssCodeSplit: false,
    sourcemap: true,
    emptyOutDir: true,
  },
});
