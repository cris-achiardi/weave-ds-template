import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [vue(), dts({ include: ['src'], rollupTypes: false })],
  build: {
    lib: {
      // TWO entries, mirroring @ds/react for the same reason.
      //
      // `index` is the package barrel and exports no components — it never will, because a
      // component is generated into a consumer's own repository. `behavior` is the interaction
      // runtime that emitted components IMPORT rather than copy, which is the one place this
      // package ships JavaScript a consumer depends on.
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        behavior: resolve(__dirname, 'src/behavior/index.ts'),
      },
      formats: ['es', 'cjs'],
      fileName: (format, entryName) => (format === 'es' ? `${entryName}.js` : `${entryName}.cjs`),
    },
    cssCodeSplit: false,
    rollupOptions: {
      external: ['vue'],
      output: { globals: { vue: 'Vue' } },
    },
    sourcemap: true,
    emptyOutDir: true,
  },
});
