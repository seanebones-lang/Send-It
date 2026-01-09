import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { QueryProvider } from './providers/QueryProvider';
import './index.css';

// Set up browser-compatible Electron API if running in browser (not Electron)
// This only runs in browser builds (Vercel), not in Electron app
if (typeof window !== 'undefined' && !(window as any).electronAPI) {
  // Dynamically import browser API only when needed
  import('./electron.browser').then((module) => {
    // The electron.browser module already sets window.electronAPI if it doesn't exist
  });
}

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element not found');
}

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <QueryProvider>
      <App />
    </QueryProvider>
  </React.StrictMode>
);
