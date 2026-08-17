import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Point at SOURCE, not dist. The sandbox is a live harness: edit a component and it
      // hot-reloads, with no build step between you and the change.
      '@ds/react': resolve(__dirname, '../../packages/react/src/index.ts'),
    },
  },
  server: { port: 4300, open: true },
});
