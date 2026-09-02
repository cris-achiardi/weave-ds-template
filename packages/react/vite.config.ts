import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [react(), dts({ include: ['src'], rollupTypes: false })],
  css: {
    modules: {
      // Readable in devtools, stable enough to debug, still scoped.
      generateScopedName: '[name]__[local]___[hash:base64:5]',
    },
  },
  build: {
    lib: {
      // TWO entries, and the second one is the point.
      //
      // `index` is the package barrel and exports no components — it never will, because a
      // component is generated into a consumer's own repository. `behavior` is the interaction
      // runtime that emitted components IMPORT rather than copy, which is the one place this
      // package ships JavaScript a consumer depends on. Keeping them separate means a consumer
      // pulling in a keyboard primitive does not also pull in everything else.
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        behavior: resolve(__dirname, 'src/behavior/index.ts'),
      },
      formats: ['es', 'cjs'],
      fileName: (format, entryName) => (format === 'es' ? `${entryName}.js` : `${entryName}.cjs`),
    },
    // Kept, but it no longer has anything to do.
    //
    // This existed to emit ONE prebuilt stylesheet for awkward consumers — an Electron renderer
    // under a strict CSP, a bundler with a single global `.css` rule and no CSS-Modules setup.
    // That reasoning was sound while this package shipped components. It no longer does: a
    // component's CSS is emitted into the CONSUMER's repository, so this package has no styles to
    // bundle and never will. The `./styles.css` export was removed for the same reason — it
    // pointed at a file that can no longer be produced.
    cssCodeSplit: false,
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
      output: {
        assetFileNames: (info) =>
          info.names?.[0]?.endsWith('.css') ? 'styles.css' : '[name][extname]',
        globals: { react: 'React', 'react-dom': 'ReactDOM' },
      },
    },
    sourcemap: true,
    emptyOutDir: true,
  },
});
