import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import angular from '@analogjs/vite-plugin-angular';

export default defineConfig({
  // The tsconfig path is NOT optional here. The plugin defaults to `./tsconfig.app.json`, which
  // this app does not have, and a tsconfig it cannot find means it silently transforms NOTHING:
  // Rollup then parses raw TypeScript as JavaScript and reports a syntax error pointing at a
  // perfectly valid class field.
  plugins: [angular({ tsconfig: './tsconfig.app.json' })],
  resolve: {
    // An ARRAY, not an object, because order matters: the more specific subpath must be tried
    // before the bare package name, or `@ds/angular/behavior` resolves to the barrel plus a stray
    // `/behavior` and fails with a confusing missing-file error.
    alias: [
      {
        find: '@ds/angular/behavior',
        replacement: resolve(__dirname, '../../packages/angular/src/behavior/index.ts'),
      },
      {
        find: '@ds/angular',
        replacement: resolve(__dirname, '../../packages/angular/src/index.ts'),
      },
    ],
  },
  // 4302, one past the Vue sandbox. All three can run at once, which is the only way to compare.
  server: { port: 4302, open: true },
});
