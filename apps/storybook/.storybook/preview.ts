import type { Preview } from '@storybook/react-vite';

// The generated token stylesheet. Until tokens exist this is an empty :root {} — a valid state.
import '@ds/tokens/css';

const preview: Preview = {
  parameters: {
    controls: { matchers: { color: /(background|color)$/i } },
    backgrounds: {
      default: 'surface',
      values: [
        { name: 'surface', value: '#1e1e1e' },
        { name: 'light', value: '#ffffff' },
      ],
    },
  },
};

export default preview;
