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
      // `@ds/behavior` IS ALIASED TO SOURCE, and it has to be. Every other sandbox resolves it
      // through the pnpm symlink and Vite's esbuild pass transpiles the TypeScript on the way
      // past. The Angular plugin owns that pass instead and transforms only files inside its own
      // TypeScript program, so a `.ts` reached through node_modules arrives at Rollup as raw
      // TypeScript and fails to parse — on an `import` line, which points at the wrong file
      // entirely. Pointing at the source path puts it back inside the plugin's reach.
      {
        find: '@ds/behavior/dismissal',
        replacement: resolve(__dirname, '../../packages/behavior/src/dismissal.ts'),
      },
      {
        find: '@ds/behavior/linear-navigation',
        replacement: resolve(__dirname, '../../packages/behavior/src/linear-navigation.ts'),
      },
      {
        find: '@ds/behavior/range-stepping',
        replacement: resolve(__dirname, '../../packages/behavior/src/range-stepping.ts'),
      },
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
  server: { port: 4302, open: !process.env.PLAYWRIGHT_TEST },
});
