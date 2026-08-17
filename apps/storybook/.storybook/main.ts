import { resolve } from 'node:path';
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  // Stories live next to the component they document, not in this app.
  stories: ['../../../packages/react/src/**/*.stories.@(ts|tsx)'],
  addons: [],
  framework: { name: '@storybook/react-vite', options: {} },
  viteFinal: async (cfg) => {
    cfg.resolve ??= {};
    cfg.resolve.alias = {
      ...cfg.resolve.alias,
      // Source, not dist — same reasoning as the sandbox.
      '@ds/react': resolve(__dirname, '../../../packages/react/src/index.ts'),
    };
    return cfg;
  },
};

export default config;
