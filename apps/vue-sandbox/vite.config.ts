import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    // An ARRAY, not an object, because order matters: the more specific subpath must be tried
    // before the bare package name, or `@ds/vue/behavior` resolves to the barrel plus a stray
    // `/behavior` and fails with a confusing missing-file error.
    alias: [
      {
        // The interaction primitives emitted components import. Generated code says
        // `from '@ds/vue/behavior'` — the same specifier a real consumer writes — so nothing in
        // the emitted output is sandbox-specific.
        find: '@ds/vue/behavior',
        replacement: resolve(__dirname, '../../packages/vue/src/behavior/index.ts'),
      },
      {
        // Point at SOURCE, not dist. The sandbox is a live harness: edit a component and it
        // hot-reloads, with no build step between you and the change.
        find: '@ds/vue',
        replacement: resolve(__dirname, '../../packages/vue/src/index.ts'),
      },
    ],
  },
  // 4301, one past the React sandbox. Both can run at once, which is the only way to compare them.
  server: { port: 4301, open: true },
});
