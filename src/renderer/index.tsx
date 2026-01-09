import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { QueryProvider } from './providers/QueryProvider';
import './index.css';

// Set up browser-compatible Electron API BEFORE any components render
// This ensures window.electronAPI is available synchronously
import './electron.browser';

// Register service worker for caching and offline support
import { registerServiceWorker } from './utils/serviceWorker';

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

// Register service worker after initial render
if (typeof window !== 'undefined') {
  registerServiceWorker().then((status) => {
    if (status.registered) {
      console.log('[App] Service worker registered successfully');
    } else if (status.error) {
      console.log('[App] Service worker registration skipped:', status.error);
    }
  });
}
