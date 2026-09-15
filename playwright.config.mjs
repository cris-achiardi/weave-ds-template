import { defineConfig } from '@playwright/test';

const backends = [
  { name: 'react', port: 4404 },
  { name: 'vue', port: 4401 },
  { name: 'angular', port: 4402 },
  { name: 'wc', port: 4403 },
];

export default defineConfig({
  testDir: './tests/browser',
  testMatch: '**/*.browser.mjs',
  outputDir: './node_modules/.cache/playwright-results',
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  use: { browserName: 'chromium', trace: 'retain-on-failure' },
  projects: backends.map(({ name, port }) => ({
    name,
    testMatch: `${name}.browser.mjs`,
    use: { baseURL: `http://127.0.0.1:${port}` },
  })),
  webServer: backends.map(({ name, port }) => ({
    name,
    command: `pnpm --filter ${name}-sandbox exec vite --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}/browser-tests.html`,
    timeout: 120_000,
    reuseExistingServer: false,
  })),
});
