import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

// NO ANGULAR COMPILER PLUGIN, and that is worth a sentence rather than looking like an omission.
//
// `src/behavior/` holds plain TypeScript: signals, functions and one injection-context call. There
// is no template, no decorator and nothing for the Angular compiler to do — which is the same
// reason `@ds/vue`'s build needs no SFC compiler for its primitives. The EMITTED components are
// Angular-compiled, but they are compiled in the consumer's own application, not here.
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
    rollupOptions: {
      external: ['@angular/core', 'rxjs'],
    },
    sourcemap: true,
    emptyOutDir: true,
  },
});
