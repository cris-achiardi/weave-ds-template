import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// The generated token stylesheet. Run `pnpm build:tokens` at least once — until there are
// tokens it is an empty :root {}, which is a valid state, not an error.
import '@ds/tokens/css';

import './sandbox.css';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
