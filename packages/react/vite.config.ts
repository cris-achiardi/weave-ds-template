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
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es', 'cjs'],
      fileName: (format) => (format === 'es' ? 'index.js' : 'index.cjs'),
    },
    // Emit ONE stylesheet rather than injecting <style> tags at runtime.
    //
    // A consumer may be an Electron renderer under a CSP with no remote origins and a webpack
    // config that has a single global `.css` rule and no CSS-Modules setup. A prebuilt
    // stylesheet imports cleanly there; runtime injection and *.module.css files do not.
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
